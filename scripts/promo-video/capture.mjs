// capture.mjs - step film.html frame by frame with the installed Chrome and
// write a JPEG sequence that mix.mjs turns into video.
//
//   node capture.mjs --layout tall            # -> frames/tall
//   node capture.mjs --layout wide            # -> frames/wide
//   node capture.mjs --layout tall --at 21.5  # one frame, for a quick look
//
// Deterministic: the page exposes seek(t); we set the time, wait for the take
// frame to decode, then screenshot. Nothing depends on wall-clock timing, so
// frames never drop or duplicate. Length comes from timeline.json (the voice).
import { readFileSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { SCENES } from './scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : d;
};

const layout = arg('layout', 'tall');
const fps = Number(arg('fps', 30));
const at = arg('at');
const outDir = path.resolve(HERE, arg('out', `frames/${layout}`));
const chrome = arg('chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
const quality = Number(arg('quality', 95));

const WIDE = layout === 'wide';
const W = WIDE ? 1920 : 1080;
const H = WIDE ? 1080 : 1920;

// scene text (scenes.mjs) + timing (timeline.json) + take length (clips/*/meta.json)
const timeline = JSON.parse(readFileSync(path.join(HERE, 'timeline.json'), 'utf8'));
const data = SCENES.map((s) => {
  const { pre, actions, post, narration, ...rest } = s;
  const tl = timeline.scenes.find((x) => x.id === s.id);
  const clip = s.kind === 'phone'
    ? JSON.parse(readFileSync(path.join(HERE, 'clips', s.id, 'meta.json'), 'utf8'))
    : {};
  return { ...rest, start: tl.start, dur: tl.dur, ...clip };
});

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-color-profile=srgb',
         '--disable-lcd-text', '--font-render-hinting=none', '--allow-file-access-from-files'],
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on('pageerror', e => console.error('PAGE ERROR:', e.message));

const url = 'file:///' + path.resolve(HERE, 'film.html').replace(/\\/g, '/') + `?layout=${layout}`;
await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
await page.evaluate(d => window.init(d), data);

if (at !== undefined) {
  const file = path.resolve(HERE, `preview-${layout}-${at}.jpg`);
  await page.evaluate(tt => window.seek(tt), Number(at));
  await page.screenshot({ path: file, type: 'jpeg', quality: 85 });
  await browser.close();
  console.log(file);
  process.exit(0);
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const total = Math.round(timeline.total * fps);
const t0 = Date.now();
for (let i = 0; i < total; i++) {
  await page.evaluate(tt => window.seek(tt), i / fps);
  await page.screenshot({
    path: path.join(outDir, String(i).padStart(5, '0') + '.jpg'),
    type: 'jpeg',
    quality,
    optimizeForSpeed: true,
  });
  if (i % 60 === 0 || i === total - 1) {
    const el = (Date.now() - t0) / 1000;
    process.stdout.write(`\r${layout}: ${i + 1}/${total} (${((i + 1) / total * 100).toFixed(1)}%) ${el.toFixed(0)}s`);
  }
}
process.stdout.write('\n');
await browser.close();
console.log(`DONE ${outDir}`);
