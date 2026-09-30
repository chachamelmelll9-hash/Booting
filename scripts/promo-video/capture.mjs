// capture.mjs - drive anim.html frame by frame with the installed Chrome and
// write a JPEG sequence that ffmpeg turns into video.
//
//   node capture.mjs --layout tall --fps 30 --dur 60 --out frames/tall
//
// Deterministic: the page exposes seek(t); we set the time, then screenshot.
// Nothing depends on wall-clock timing, so frames never drop or duplicate.
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : d;
};

const layout = arg('layout', 'tall');
const fps = Number(arg('fps', 30));
const dur = Number(arg('dur', 60));
const outDir = path.resolve(HERE, arg('out', `frames/${layout}`));
const chrome = arg('chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
const quality = Number(arg('quality', 95));

const WIDE = layout === 'wide';
const W = WIDE ? 1920 : 1080;
const H = WIDE ? 1080 : 1920;

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-color-profile=srgb',
         '--disable-lcd-text', '--font-render-hinting=none'],
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on('pageerror', e => console.error('PAGE ERROR:', e.message));

const url = 'file:///' + path.resolve(HERE, 'anim.html').replace(/\\/g, '/') + `?layout=${layout}`;
await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
await page.waitForFunction('window.__ready === true', { timeout: 120000 });

const total = Math.round(dur * fps);
const t0 = Date.now();
for (let i = 0; i < total; i++) {
  const t = i / fps;
  await page.evaluate(tt => window.seek(tt), t);
  await page.screenshot({
    path: path.join(outDir, String(i).padStart(5, '0') + '.jpg'),
    type: 'jpeg',
    quality,
    optimizeForSpeed: true,
  });
  if (i % 60 === 0 || i === total - 1) {
    const el = (Date.now() - t0) / 1000;
    const pct = ((i + 1) / total * 100).toFixed(1);
    process.stdout.write(`\r${layout}: ${i + 1}/${total} (${pct}%) ${el.toFixed(0)}s`);
  }
}
process.stdout.write('\n');
await browser.close();
console.log(`DONE ${outDir}`);
