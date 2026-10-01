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

// Pass 1: the voice bus, rendered to a file of the full length.
// It must NOT be normalised inside the final graph: loudnorm holds ~3s of
// lookahead, and when it feeds another filter the tail it is still holding at
// end-of-stream never comes out - the last line of the film ("...부팅.") was
// cut to near silence that way. Written to a file, padded to `total`, it is
// flushed properly and the stream ends in silence rather than in speech.
const voiceWav = path.join(HERE, 'audio', 'voice.wav');
{
  const vin = [];
  const vf = [];
  const labels = [];
  scenes.forEach((s, i) => {
    vin.push('-i', path.join(HERE, 'audio', `${s.id}.mp3`));
    const ms = Math.round((s.start + s.voiceAt) * 1000);
    vf.push(`[${i}:a]aresample=48000,adelay=${ms}:all=1[v${i}]`);
    labels.push(`[v${i}]`);
  });
  vf.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0,apad=whole_dur=${total + 4},` +
    `loudnorm=I=-16:TP=-1.5:LRA=11,atrim=0:${total}[voice]`);
  execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...vin,
    '-filter_complex', vf.join(';'), '-map', '[voice]', '-ar', '48000', voiceWav], { stdio: 'inherit' });
}

// Pass 2: picture + voice bus + music.
const inputs = ['-framerate', String(fps), '-i', path.join(HERE, 'frames', layout, '%05d.jpg'), '-i', voiceWav];
const filters = [];
let last = '1:a';
if (existsSync(music)) {
  inputs.push('-i', music);
  const m = 2;
  const fadeOut = Math.max(total - 3.5, 0.1).toFixed(2);
  filters.push(`[${m}:a]aresample=48000,atrim=0:${total},asetpts=N/SR/TB,loudnorm=I=-27:TP=-3:LRA=7,` +
    `afade=t=in:st=0:d=1.5,afade=t=out:st=${fadeOut}:d=3.5[music]`);
  filters.push(`[1:a][music]amix=inputs=2:normalize=0,alimiter=limit=0.94[a]`);
  last = '[a]';
}

execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...inputs,
  ...(filters.length ? ['-filter_complex', filters.join(';')] : []), '-map', '0:v', '-map', last,
  '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium',
  '-r', String(fps), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
  '-t', String(total), '-movflags', '+faststart', out], { stdio: 'inherit' });

console.log(`BUILT ${out} : ${(statSync(out).size / 1048576).toFixed(1)} MB, ${total.toFixed(1)}s`);
