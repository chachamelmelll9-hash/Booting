// mix.mjs - frames + narration + music -> mp4.
//
//   node mix.mjs --layout tall    # frames/tall -> ../../assets/marketing/booting-promo-9x16.mp4
//   node mix.mjs --layout wide    # frames/wide -> ../../assets/marketing/booting-promo-16x9.mp4
//
// Each scene's narration is placed at its start time from timeline.json. The
// music sits well under the voice (-27 LUFS against -16) - at the old -16 it
// fought the narration for the same space.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FF = path.join(HERE, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : d;
};
const layout = arg('layout', 'tall');
const fps = Number(arg('fps', 30));
const out = path.resolve(HERE, arg('out',
  `../../assets/marketing/booting-promo-${layout === 'wide' ? '16x9' : '9x16'}.mp4`));
const music = path.join(HERE, arg('music', 'music.mp3'));

const { total, scenes } = JSON.parse(readFileSync(path.join(HERE, 'timeline.json'), 'utf8'));

const inputs = ['-framerate', String(fps), '-i', path.join(HERE, 'frames', layout, '%05d.jpg')];
const filters = [];
const voices = [];
scenes.forEach((s, i) => {
  inputs.push('-i', path.join(HERE, 'audio', `${s.id}.mp3`));
  const ms = Math.round((s.start + s.voiceAt) * 1000);
  filters.push(`[${i + 1}:a]aresample=48000,adelay=${ms}:all=1[v${i}]`);
  voices.push(`[v${i}]`);
});
filters.push(`${voices.join('')}amix=inputs=${voices.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[voice]`);

let last = '[voice]';
if (existsSync(music)) {
  inputs.push('-i', music);
  const m = scenes.length + 1;
  const fadeOut = Math.max(total - 3.5, 0.1).toFixed(2);
  filters.push(`[${m}:a]aresample=48000,atrim=0:${total},asetpts=N/SR/TB,loudnorm=I=-27:TP=-3:LRA=7,` +
    `afade=t=in:st=0:d=1.5,afade=t=out:st=${fadeOut}:d=3.5[music]`);
  filters.push(`[voice][music]amix=inputs=2:normalize=0,alimiter=limit=0.94[a]`);
  last = '[a]';
}

execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...inputs,
  '-filter_complex', filters.join(';'), '-map', '0:v', '-map', last,
  '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium',
  '-r', String(fps), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
  '-t', String(total), '-movflags', '+faststart', out], { stdio: 'inherit' });

console.log(`BUILT ${out} : ${(statSync(out).size / 1048576).toFixed(1)} MB, ${total.toFixed(1)}s`);
