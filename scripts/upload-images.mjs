#!/usr/bin/env node

import { google } from 'googleapis';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

// Read package name from app.json dynamically
function getPackageName() {
  const appJsonPath = resolve(process.cwd(), 'apps/mobile/app.json');
  if (!existsSync(appJsonPath)) {
    console.error(
      `app.json not found: ${appJsonPath}\nRun this script from the monorepo root.`,
    );
    process.exit(1);
  }
  const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));
  const pkg = appJson.expo?.android?.package;
  if (!pkg) {
    console.error('expo.android.package not found in app.json');
    process.exit(1);
  }
  return pkg;
}

const PACKAGE_NAME = getPackageName();

const LOCALE_MAP = {
  ko: 'ko-KR',
  en: 'en-US',
  ja: 'ja-JP',
};

function getAuth() {
  const keyPath =
    process.env.GOOGLE_PLAY_KEY_PATH ||
    resolve(process.cwd(), 'google-service-account.json');

  if (!existsSync(keyPath)) {
    console.error(
      `Service account key not found: ${keyPath}\n` +
        `Set GOOGLE_PLAY_KEY_PATH or place google-service-account.json in project root.`,
    );
    process.exit(1);
  }

  const key = JSON.parse(readFileSync(keyPath, 'utf8'));
  return new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
}

const api = google.androidpublisher({ version: 'v3', auth: getAuth() });

async function deleteAllImages(editId, language, imageType) {
  try {
    await api.edits.images.deleteall({
      packageName: PACKAGE_NAME,
      editId,
      language,
      imageType,
    });
    console.log(`  Deleted all ${imageType}`);
  } catch {
    console.log(`  No existing ${imageType} to delete`);
  }
}

function getPngFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.png'))
    .sort();
}

function toPlayLanguage(dirName) {
  if (LOCALE_MAP[dirName]) return LOCALE_MAP[dirName];
  if (/^[a-z]{2,3}-[A-Za-z]{2,4}$/.test(dirName)) return dirName;
  return null;
}

// Collect { playLanguage: absoluteDir } from locale directories.
// ASO framed images (from /make-aso-images) take priority over raw
// screenshots (from /deploy Phase 4 store capture).
function collectScreenshotDirs(baseDir) {
  const sources = [
    join(baseDir, 'aso-images', 'android'),
    join(baseDir, 'screenshots', 'android'),
  ];

  const result = {};
  for (const source of sources) {
    if (!existsSync(source)) continue;
    for (const entry of readdirSync(source)) {
      const dir = join(source, entry);
      if (!statSync(dir).isDirectory()) continue;
      const language = toPlayLanguage(entry);
      if (!language) {
        console.warn(`  Skipping unrecognized locale directory: ${dir}`);
        continue;
      }
      if (getPngFiles(dir).length === 0) continue;
      if (!result[language]) result[language] = dir;
    }
  }
  return result;
}

async function uploadImage(editId, language, imageType, filePath) {
  const res = await api.edits.images.upload({
    packageName: PACKAGE_NAME,
    editId,
    language,
    imageType,
    media: {
      mimeType: 'image/png',
      body: readFileSync(filePath),
    },
  });
  return res.data.image?.id || 'ok';
}

async function main() {
  const baseDir = resolve(process.cwd(), 'assets');
  const storeDir = join(baseDir, 'store');
  const iconPath = join(storeDir, 'icon-512x512.png');
  const featureGraphicPath = join(storeDir, 'feature-graphic-1024x500.png');

  console.log(`Package: ${PACKAGE_NAME}`);
  console.log(`Store assets: ${storeDir}`);

  const screenshotDirs = collectScreenshotDirs(baseDir);
  const languages = Object.keys(screenshotDirs);

  if (languages.length === 0) {
    console.error(
      'No screenshots found.\n' +
        'Expected PNG files in:\n' +
        '  assets/aso-images/android/{locale}/   (framed — from /make-aso-images)\n' +
        '  assets/screenshots/android/{locale}/  (raw — from /deploy Phase 4 store capture)\n' +
        'Run /deploy first (then /make-aso-images for framed images).',
    );
    process.exit(1);
  }

  for (const [language, dir] of Object.entries(screenshotDirs)) {
    console.log(
      `Screenshots [${language}]: ${dir} (${getPngFiles(dir).length} files)`,
    );
  }

  if (!existsSync(iconPath)) {
    console.warn(
      `WARNING: ${iconPath} not found — run /make-aso-images (or /setup-icons) to generate it.`,
    );
  }
  if (!existsSync(featureGraphicPath)) {
    console.warn(
      `WARNING: ${featureGraphicPath} not found — run /make-aso-images to generate it.`,
    );
  }

  // Create edit
  const {
    data: { id: editId },
  } = await api.edits.insert({ packageName: PACKAGE_NAME });
  console.log('Edit ID:', editId);

  let uploadedScreenshots = 0;

  for (const [language, dir] of Object.entries(screenshotDirs)) {
    console.log(`\n=== Language: ${language} ===`);

    console.log('--- Deleting existing images ---');
    for (const type of ['icon', 'featureGraphic', 'phoneScreenshots']) {
      await deleteAllImages(editId, language, type);
    }

    // Upload app icon
    if (existsSync(iconPath)) {
      console.log('--- Uploading app icon ---');
      try {
        const id = await uploadImage(editId, language, 'icon', iconPath);
        console.log('Icon uploaded:', id);
      } catch (e) {
        console.error('Icon error:', e.message);
      }
    }

    // Upload feature graphic
    if (existsSync(featureGraphicPath)) {
      console.log('--- Uploading feature graphic ---');
      try {
        const id = await uploadImage(
          editId,
          language,
          'featureGraphic',
          featureGraphicPath,
        );
        console.log('Feature graphic uploaded:', id);
      } catch (e) {
        console.error('Feature graphic error:', e.message);
      }
    }

    // Upload phone screenshots
    const files = getPngFiles(dir);
    console.log(`--- Uploading ${files.length} phone screenshots ---`);
    for (const file of files) {
      try {
        const id = await uploadImage(
          editId,
          language,
          'phoneScreenshots',
          join(dir, file),
        );
        console.log(`  ${file}: uploaded (${id})`);
        uploadedScreenshots++;
      } catch (e) {
        console.error(`  ${file}: error - ${e.message}`);
      }
    }
  }

  if (uploadedScreenshots === 0) {
    console.error('\nNo screenshots were uploaded — aborting without commit.');
    process.exit(1);
  }

  // Commit edit
  console.log('\n--- Committing edit ---');
  await api.edits.commit({ packageName: PACKAGE_NAME, editId });
  console.log('All images uploaded and committed successfully!');
}

main().catch((err) => {
  if (err.response?.data) {
    console.error('API Error:', JSON.stringify(err.response.data, null, 2));
  } else {
    console.error('Error:', err.message);
  }
  process.exit(1);
});
