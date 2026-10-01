// narrate.mjs - synthesize the narration for every scene and write the timeline.
//
//   node narrate.mjs            # only scenes whose audio is missing
//   node narrate.mjs --force    # redo all
//
// Output: audio/<id>.mp3 and timeline.json (start/dur per scene, total).
// Scene length = narration length + tail, so the picture is cut to the voice
// and never the other way round.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { RATE, SCENES, VOICE } from './scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FF = path.join(HERE, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
const force = process.argv.includes('--force');
const LEAD = 0.35; // silence before the voice starts in each scene

mkdirSync(path.join(HERE, 'audio'), { recursive: true });

async function synth(text, out) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text, { rate: RATE });
  const chunks = [];
  await new Promise((res, rej) => {
    audioStream.on('data', (c) => chunks.push(c));
    audioStream.on('end', res);
    audioStream.on('close', res);
    audioStream.on('error', rej);
  });
  writeFileSync(out, Buffer.concat(chunks));
  tts.close();
}

function duration(file) {
  // ffmpeg prints the container duration on stderr and exits 1 without an output
  let err = '';
  try {
    execFileSync(FF, ['-hide_banner', '-i', file], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) {
    err = String(e.stderr);
  }
  const m = err.match(/Duration: (\d+):(\d+):([\d.]+)/);
  if (!m) throw new Error(`no duration for ${file}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

const scenes = [];
let t = 0;
for (const s of SCENES) {
  const file = path.join(HERE, 'audio', `${s.id}.mp3`);
  if (force || !existsSync(file)) await synth(s.narration, file);
  const voice = duration(file);
  const dur = Math.round((LEAD + voice + (s.tail ?? 0.5)) * 30) / 30; // whole frames
  scenes.push({ id: s.id, start: Math.round(t * 1000) / 1000, dur, voice, voiceAt: LEAD });
  console.log(`${s.id}  ${t.toFixed(2).padStart(6)}  +${dur.toFixed(2)}  voice ${voice.toFixed(2)}`);
  t += dur;
}
const total = Math.round(t * 1000) / 1000;
writeFileSync(path.join(HERE, 'timeline.json'), JSON.stringify({ total, scenes }, null, 2));
console.log(`TOTAL ${total.toFixed(2)}s`);
process.exit(0);
