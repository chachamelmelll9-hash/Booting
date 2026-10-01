// record.mjs - drive the real app on the emulator and record what it shows.
//
//   node record.mjs s4 s5        # record these scenes, in this order
//   node record.mjs              # every phone scene
//
// `adb shell screenrecord` yields a single frame on this emulator (software
// renderer), so the recording is taken from the emulator side instead:
// `adb emu screenrecord` captures the display the emulator itself composites,
// at 24fps, including the system "show touches" dot for every injected tap.
//
// Per scene: run `pre` (not recorded) -> start recording -> fire `actions` at
// their scene-relative times -> stop -> run `post` -> explode the take into
// clips/<id>/%05d.jpg (30fps) for film.html to step through.
import { execFile, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parentPath } from './parent-url.mjs';
import { SCENES } from './scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const FF = path.join(HERE, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
const SERIAL = 'emulator-5554';
const PKG = 'com.booting.app';
const LEAD = 2.0;   // recorded seconds before the scene clock starts
// `adb shell input` spins up a JVM on the device: the touch lands about this
// long after the command is issued (measured on the first takes). Fire early.
const INPUT_LAG = 0.9;
const FPS = 30;

const timeline = JSON.parse(readFileSync(path.join(HERE, 'timeline.json'), 'utf8'));
const durOf = (id) => timeline.scenes.find((s) => s.id === id).dur;

const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
const adb = (...a) => execFileSync('adb', ['-s', SERIAL, ...a], { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const adbAsync = (...a) => execFile('adb', ['-s', SERIAL, ...a], () => {});

function publicBase() {
  const env = readFileSync(path.join(ROOT, 'apps', 'server', '.env.development'), 'utf8');
  return env.match(/^PUBLIC_BASE_URL=(.*)$/m)[1].trim().replace(/\/$/, '');
}

function fire(step) {
  if (step.tap) adbAsync('shell', 'input', 'tap', ...step.tap.map(String));
  else if (step.swipe) adbAsync('shell', 'input', 'swipe', ...step.swipe.map(String));
  else if (step.key) adbAsync('shell', 'input', 'keyevent', String(step.key));
}

async function setup(step) {
  if (step.app) {
    adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1');
    await sleep(3);
    // A dev build shows a LogBox bar ("Open debugger to view warnings") over the
    // tab bar after a reload. It would sit in every frame - close it first.
    adb('shell', 'uiautomator', 'dump', '/sdcard/ui.xml');
    if (adb('shell', 'cat', '/sdcard/ui.xml').includes('Open debugger')) {
      adb('shell', 'input', 'tap', '996', '2209');
      await sleep(1);
    }
  } else if (step.parentWeb) {
    const url = publicBase() + (await parentPath(step.parentWeb));
    adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url);
  } else if (step.stop) {
    adb('shell', 'am', 'force-stop', step.stop);
  } else {
    fire(step);
    if (step.swipe) await sleep(step.swipe[4] / 1000);
  }
  await sleep(step.wait ?? 0.6);
}

async function record(scene) {
  const dur = durOf(scene.id);
  const take = path.join(HERE, 'takes', `${scene.id}.webm`);
  mkdirSync(path.dirname(take), { recursive: true });
  rmSync(take, { force: true });

  for (const step of scene.pre ?? []) await setup(step);

  const actions = (scene.actions ?? [])
    .map((a) => ({ ...a, at: a.at < 0 ? dur + a.at : a.at }))
    .sort((a, b) => a.at - b.at);

  adb('emu', 'screenrecord', 'start', '--time-limit', String(Math.ceil(dur + LEAD + 5)), take);
  await sleep(LEAD);
  const t0 = Date.now();
  for (const a of actions) {
    const wait = a.at - INPUT_LAG - (Date.now() - t0) / 1000;
    if (wait > 0) await sleep(wait);
    fire(a);
  }
  const last = actions.length ? actions[actions.length - 1].at : 0;
  const stopAt = scene.freezeAfterLastAction ? last + scene.freezeAfterLastAction + 0.3 : dur + 0.8;
  await sleep(Math.max(stopAt - (Date.now() - t0) / 1000, 0));
  adb('emu', 'screenrecord', 'stop');

  // the emulator finalises the file after `stop` returns
  let size = -1;
  for (let i = 0; i < 40; i++) {
    await sleep(0.5);
    const now = existsSync(take) ? statSync(take).size : 0;
    if (now > 0 && now === size) break;
    size = now;
  }
  for (const step of scene.post ?? []) await setup(step);

  const out = path.join(HERE, 'clips', scene.id);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(LEAD), '-i', take];
  if (scene.freezeAfterLastAction) args.push('-t', String(last + scene.freezeAfterLastAction));
  args.push('-vf', `fps=${FPS},scale=720:-2:flags=lanczos`, '-q:v', '3', path.join(out, '%05d.jpg'));
  execFileSync(FF, args, { stdio: 'inherit' });

  // contact sheet: one frame per second, for a quick look at what was caught
  execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(LEAD), '-i', take,
    '-vf', 'fps=1,scale=200:-2,tile=12x1', '-frames:v', '1', path.join(HERE, 'takes', `${scene.id}.sheet.jpg`)],
    { stdio: 'inherit' });

  const frames = readdirSync(out).filter((f) => f.endsWith('.jpg')).length;
  writeFileSync(path.join(out, 'meta.json'), JSON.stringify({ frames, fps: FPS }));
  console.log(`${scene.id}: ${frames} frames (${(frames / FPS).toFixed(1)}s of ${dur.toFixed(1)}s scene)`);
}

adb('shell', 'settings', 'put', 'system', 'show_touches', '1');
const wanted = process.argv.slice(2);
const list = SCENES.filter((s) => s.kind === 'phone' && (!wanted.length || wanted.includes(s.id)));
for (const s of list) await record(s);
process.exit(0);
