#!/usr/bin/env node

import { google } from 'googleapis';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

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
const TRACK_ORDER = ['internal', 'alpha', 'beta', 'production'];

// --- Auth ---

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

function getApi() {
  return google.androidpublisher({ version: 'v3', auth: getAuth() });
}

// --- Edit helpers ---

async function withEdit(api, fn) {
  const {
    data: { id: editId },
  } = await api.edits.insert({ packageName: PACKAGE_NAME });

  const result = await fn(editId);

  await api.edits.commit({ packageName: PACKAGE_NAME, editId });
  return result;
}

async function getTrackOrExit(api, editId, track) {
  try {
    const { data } = await api.edits.tracks.get({
      packageName: PACKAGE_NAME,
      editId,
      track,
    });
    return data;
  } catch {
    console.error(`No release data on '${track}' track.`);
    console.error(`Upload a build to this track first:`);
    console.error(`  node scripts/play-store.mjs upload <aab-path> ${track}`);
    process.exit(1);
  }
}

// --- Commands ---

async function upload(aabPath, track = 'production', { submit = false, releaseNotes: notes } = {}) {
  if (!aabPath) {
    console.error('Usage: play-store upload <path-to-aab> [track] [--submit] [--release-notes "text"]');
    console.error('Example: play-store upload ./build-123.aab production --submit');
    process.exit(1);
  }

  const resolvedPath = resolve(aabPath);
  if (!existsSync(resolvedPath)) {
    console.error(`AAB file not found: ${resolvedPath}`);
    process.exit(1);
  }

  const api = getApi();
  const releaseStatus = submit ? 'completed' : 'draft';

  await withEdit(api, async (editId) => {
    console.log(`Uploading ${resolvedPath}...`);
    const { createReadStream } = await import('fs');
    const aabStream = createReadStream(resolvedPath);
    const { data: bundle } = await api.edits.bundles.upload({
      packageName: PACKAGE_NAME,
      editId,
      media: {
        mimeType: 'application/octet-stream',
        body: aabStream,
      },
    });
    console.log(`Uploaded versionCode: ${bundle.versionCode}`);

    const release = {
      versionCodes: [String(bundle.versionCode)],
      status: releaseStatus,
    };

    if (notes) {
      release.releaseNotes = [{ language: 'ko-KR', text: notes }];
      console.log(`Release notes: ${notes}`);
    }

    console.log(`Assigning to ${track} track (${releaseStatus})...`);
    await api.edits.tracks.update({
      packageName: PACKAGE_NAME,
      editId,
      track,
      requestBody: { track, releases: [release] },
    });

    if (submit) {
      console.log(`Done! Submitted to ${track} track for review.`);
    } else {
      console.log(`Done! Submitted to ${track} track as draft.`);
      console.log(`To submit for review, run again with --submit flag.`);
    }
  });
}

async function status() {
  const api = getApi();
  const { data } = await api.edits.insert({ packageName: PACKAGE_NAME });
  const editId = data.id;

  console.log('Track Status for', PACKAGE_NAME);
  console.log('='.repeat(50));

  for (const trackName of TRACK_ORDER) {
    try {
      const { data: track } = await api.edits.tracks.get({
        packageName: PACKAGE_NAME,
        editId,
        track: trackName,
      });

      const releases = track.releases || [];
      if (releases.length === 0) {
        console.log(`\n${trackName}: (empty)`);
        continue;
      }

      console.log(`\n${trackName}:`);
      for (const rel of releases) {
        const versions = (rel.versionCodes || []).join(', ');
        const fraction =
          rel.userFraction != null ? ` (${rel.userFraction * 100}%)` : '';
        console.log(`  ${rel.status}${fraction} | versionCodes: [${versions}]`);
        if (rel.name) console.log(`  name: ${rel.name}`);
      }
    } catch {
      console.log(`\n${trackName}: (no data)`);
    }
  }

  await api.edits.delete({ packageName: PACKAGE_NAME, editId });
}

async function promote(fromTrack, toTrack) {
  if (!fromTrack || !toTrack) {
    console.error('Usage: play-store promote <from-track> <to-track>');
    console.error('Tracks: internal, alpha, beta, production');
    process.exit(1);
  }

  const api = getApi();

  await withEdit(api, async (editId) => {
    const sourceTrack = await getTrackOrExit(api, editId, fromTrack);

    const activeRelease = (sourceTrack.releases || []).find(
      (r) => r.status === 'completed' || r.status === 'draft',
    );

    if (!activeRelease) {
      console.error(`No active release found in ${fromTrack} track.`);
      console.error(`Upload a build first: node scripts/play-store.mjs upload <aab-path> ${fromTrack}`);
      process.exit(1);
    }

    const newRelease = {
      versionCodes: activeRelease.versionCodes,
      status: 'completed',
      releaseNotes: activeRelease.releaseNotes,
    };

    await api.edits.tracks.update({
      packageName: PACKAGE_NAME,
      editId,
      track: toTrack,
      requestBody: { track: toTrack, releases: [newRelease] },
    });

    console.log(
      `Promoted versionCodes [${activeRelease.versionCodes}] from ${fromTrack} -> ${toTrack}`,
    );
  });
}

async function rollout(track, percentage) {
  if (!track || percentage == null) {
    console.error('Usage: play-store rollout <track> <percentage>');
    console.error('Example: play-store rollout production 50');
    process.exit(1);
  }

  const pct = parseFloat(percentage);
  const api = getApi();

  await withEdit(api, async (editId) => {
    const trackData = await getTrackOrExit(api, editId, track);

    const activeRelease = (trackData.releases || []).find(
      (r) => r.status === 'inProgress' || r.status === 'completed',
    );

    if (!activeRelease) {
      console.error(`No active release found in ${track} track.`);
      process.exit(1);
    }

    if (pct >= 100) {
      activeRelease.status = 'completed';
      delete activeRelease.userFraction;
      console.log(`Full rollout on ${track} track.`);
    } else {
      activeRelease.status = 'inProgress';
      activeRelease.userFraction = pct / 100;
      console.log(`Rollout set to ${pct}% on ${track} track.`);
    }

    await api.edits.tracks.update({
      packageName: PACKAGE_NAME,
      editId,
      track,
      requestBody: { track, releases: [activeRelease] },
    });
  });
}

async function halt(track) {
  if (!track) {
    console.error('Usage: play-store halt <track>');
    process.exit(1);
  }

  const api = getApi();

  await withEdit(api, async (editId) => {
    const trackData = await getTrackOrExit(api, editId, track);

    const activeRelease = (trackData.releases || []).find(
      (r) => r.status === 'inProgress',
    );

    if (!activeRelease) {
      console.error(`No in-progress release found in ${track} track.`);
      process.exit(1);
    }

    activeRelease.status = 'halted';

    await api.edits.tracks.update({
      packageName: PACKAGE_NAME,
      editId,
      track,
      requestBody: { track, releases: [activeRelease] },
    });

    console.log(`Halted rollout on ${track} track.`);
  });
}

async function listing(options) {
  const { lang = 'ko-KR', title, short, full } = options;

  if (!title && !short && !full) {
    console.error(
      'Usage: play-store listing --lang ko-KR --title "앱이름" --short "짧은설명" --full "전체설명"',
    );
    process.exit(1);
  }

  const api = getApi();

  await withEdit(api, async (editId) => {
    let existing = {};
    try {
      const { data } = await api.edits.listings.get({
        packageName: PACKAGE_NAME,
        editId,
        language: lang,
      });
      existing = data;
    } catch {
      // new listing
    }

    const requestBody = {
      language: lang,
      title: title || existing.title,
      shortDescription: short || existing.shortDescription,
      fullDescription: full || existing.fullDescription,
    };

    await api.edits.listings.update({
      packageName: PACKAGE_NAME,
      editId,
      language: lang,
      requestBody,
    });

    console.log(`Listing updated for ${lang}:`);
    if (title) console.log(`  title: ${title}`);
    if (short) console.log(`  shortDescription: ${short}`);
    if (full) console.log(`  fullDescription: ${full}`);
  });
}

async function releaseNotes(track, lang, text) {
  if (!track || !text) {
    console.error(
      'Usage: play-store release-notes <track> [lang] "release notes text"',
    );
    console.error('Example: play-store release-notes production ko-KR "버그 수정"');
    process.exit(1);
  }

  const api = getApi();

  await withEdit(api, async (editId) => {
    const trackData = await getTrackOrExit(api, editId, track);

    const releases = trackData.releases || [];
    const activeRelease = releases.find(
      (r) =>
        r.status === 'draft' ||
        r.status === 'completed' ||
        r.status === 'inProgress',
    );

    if (!activeRelease) {
      console.error(`No active release found in ${track} track.`);
      process.exit(1);
    }

    activeRelease.releaseNotes = [{ language: lang, text }];

    await api.edits.tracks.update({
      packageName: PACKAGE_NAME,
      editId,
      track,
      requestBody: { track, releases: [activeRelease] },
    });

    console.log(`Release notes updated on ${track} (${lang}):`);
    console.log(`  ${text}`);
  });
}

async function testers(track, action, groupEmail) {
  if (!track || !action) {
    console.error(
      'Usage: play-store testers <track> <list|add|remove> [google-group-email]',
    );
    process.exit(1);
  }

  const api = getApi();

  await withEdit(api, async (editId) => {
    if (action === 'list') {
      const { data } = await api.edits.testers.get({
        packageName: PACKAGE_NAME,
        editId,
        track,
      });
      const groups = data.googleGroups || [];
      console.log(`Testers on ${track}:`);
      if (groups.length === 0) {
        console.log('  (none)');
      } else {
        groups.forEach((g) => console.log(`  - ${g}`));
      }
      return;
    }

    if (!groupEmail) {
      console.error('Google Group email required for add/remove.');
      process.exit(1);
    }

    const { data: current } = await api.edits.testers.get({
      packageName: PACKAGE_NAME,
      editId,
      track,
    });

    let groups = current.googleGroups || [];

    if (action === 'add') {
      if (!groups.includes(groupEmail)) groups.push(groupEmail);
    } else if (action === 'remove') {
      groups = groups.filter((g) => g !== groupEmail);
    }

    await api.edits.testers.update({
      packageName: PACKAGE_NAME,
      editId,
      track,
      requestBody: { googleGroups: groups },
    });

    console.log(`Testers ${action}ed on ${track}: ${groupEmail}`);
  });
}

// --- CLI ---

function parseArgs(args) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next === undefined || next.startsWith('--')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positional.push(args[i]);
    }
  }
  return { positional, flags };
}

function printHelp() {
  console.log(`
Google Play Store CLI for ${PACKAGE_NAME}

Commands:
  upload <aab-path> [track] [--submit] [--release-notes "text"]
                                           Upload AAB (default: draft, --submit for review)
  status                                    Show all track statuses
  promote <from> <to>                       Promote release between tracks
  rollout <track> <percentage>              Set staged rollout percentage
  halt <track>                              Halt a staged rollout
  listing [--lang ko-KR] [--title] [--short] [--full]  Update store listing
  release-notes <track> [lang] "text"       Update release notes
  testers <track> <list|add|remove> [email] Manage test Google Groups

Tracks: internal, alpha, beta, production

Environment:
  GOOGLE_PLAY_KEY_PATH   Path to service account JSON key
                         (default: ./google-service-account.json)

Examples:
  node scripts/play-store.mjs upload apps/mobile/build-123.aab production
  node scripts/play-store.mjs status
  node scripts/play-store.mjs promote internal alpha
  node scripts/play-store.mjs promote alpha production
  node scripts/play-store.mjs rollout production 20
  node scripts/play-store.mjs rollout production 100
  node scripts/play-store.mjs halt production
  node scripts/play-store.mjs listing --title "앱이름" --short "앱 설명"
  node scripts/play-store.mjs release-notes production ko-KR "버그 수정 및 성능 개선"
  node scripts/play-store.mjs testers alpha list
  node scripts/play-store.mjs testers alpha add my-group@googlegroups.com
`);
}

const args = process.argv.slice(2);
const { positional, flags } = parseArgs(args);
const command = positional[0];

try {
  switch (command) {
    case 'upload':
      await upload(positional[1], positional[2], {
        submit: flags.submit === true,
        releaseNotes: typeof flags['release-notes'] === 'string' ? flags['release-notes'] : undefined,
      });
      break;
    case 'status':
      await status();
      break;
    case 'promote':
      await promote(positional[1], positional[2]);
      break;
    case 'rollout':
      await rollout(positional[1], positional[2]);
      break;
    case 'halt':
      await halt(positional[1]);
      break;
    case 'listing':
      await listing({
        lang: flags.lang || 'ko-KR',
        title: flags.title,
        short: flags.short,
        full: flags.full,
      });
      break;
    case 'release-notes': {
      const rnTrack = positional[1];
      const rnLang = positional[3] ? positional[2] : 'ko-KR';
      const rnText = positional[3] || positional[2];
      await releaseNotes(rnTrack, rnLang, rnText);
      break;
    }
    case 'testers':
      await testers(positional[1], positional[2], positional[3]);
      break;
    default:
      printHelp();
      if (command) {
        console.error(`Unknown command: ${command}`);
        process.exit(1);
      }
  }
} catch (err) {
  if (err.response?.data) {
    console.error('API Error:', JSON.stringify(err.response.data, null, 2));
  } else {
    console.error('Error:', err.message);
  }
  process.exit(1);
}
