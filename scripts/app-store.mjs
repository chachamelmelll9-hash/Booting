#!/usr/bin/env node

import crypto from 'crypto';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { homedir } from 'os';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const BASE_URL = 'https://api.appstoreconnect.apple.com';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BUILD_NUMBER_FILE = join(
  REPO_ROOT,
  'apps/mobile/build/ipa/.last-build-number',
);

// App Store Connect screenshot display types.
// 6.9" (1320x2868) 시뮬레이터에서 캡처했다면 iphone-69, 6.7" (1290x2796)이면 iphone-67.
// 캡처 해상도와 display type이 어긋나면 업로드가 거부되므로 sips로 확인 후 지정한다.
const SCREENSHOT_TYPES = {
  'iphone-55': 'APP_IPHONE_55',
  'iphone-65': 'APP_IPHONE_65',
  'iphone-67': 'APP_IPHONE_67',
  'iphone-69': 'APP_IPHONE_69',
  'ipad-129': 'APP_IPAD_PRO_3GEN_129',
};

// 캡처 해상도 → display type 자동 판정 (가로/세로 무관하게 매칭)
const RESOLUTION_TO_TYPE = [
  { w: 1290, h: 2796, type: 'iphone-67' },
  { w: 1320, h: 2868, type: 'iphone-69' },
  { w: 1284, h: 2778, type: 'iphone-67' },
  { w: 1242, h: 2688, type: 'iphone-65' },
  { w: 1242, h: 2208, type: 'iphone-55' },
];

export function displayTypeForResolution(width, height) {
  const [w, h] = width > height ? [height, width] : [width, height];
  const hit = RESOLUTION_TO_TYPE.find((r) => r.w === w && r.h === h);
  return hit ? hit.type : null;
}

// PNG IHDR에서 크기를 읽는다 (외부 의존성 없이 — sips는 macOS 전용).
function pngSize(path) {
  const buf = readFileSync(path);
  const isPng =
    buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47 && buf.readUInt32BE(12) === 0x49484452;
  if (!isPng) {
    throw new Error(`Not a PNG (or truncated): ${path}`);
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const EDITABLE_STATES = [
  'PREPARE_FOR_SUBMISSION',
  'DEVELOPER_REJECTED',
  'REJECTED',
  'METADATA_REJECTED',
  'INVALID_BINARY',
];

// --- Env ---

function loadEnvFile() {
  const envPath = join(REPO_ROOT, '.appstoreconnect.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

// --- Auth ---

let _token = null;
let _tokenExp = 0;

function getConfig() {
  const issuerId = process.env.ASC_ISSUER_ID;
  const keyId = process.env.ASC_KEY_ID;

  if (!issuerId || !keyId) {
    console.error(
      'Set ASC_ISSUER_ID and ASC_KEY_ID env vars (or add them to .appstoreconnect.env in project root).\n' +
        '→ App Store Connect > Users and Access > Integrations > App Store Connect API',
    );
    process.exit(1);
  }

  const keyPath =
    process.env.ASC_KEY_PATH ||
    join(homedir(), '.appstoreconnect', `AuthKey_${keyId}.p8`);

  if (!existsSync(keyPath)) {
    console.error(
      `API key not found: ${keyPath}\n` +
        `Place AuthKey_${keyId}.p8 in ~/.appstoreconnect/ or set ASC_KEY_PATH.`,
    );
    process.exit(1);
  }

  return { issuerId, keyId, privateKey: readFileSync(keyPath, 'utf8') };
}

function getToken() {
  const now = Math.floor(Date.now() / 1000);
  if (_token && _tokenExp > now + 60) return _token;

  const { issuerId, keyId, privateKey } = getConfig();
  const header = Buffer.from(
    JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }),
  ).toString('base64url');
  const exp = now + 1200;
  const payload = Buffer.from(
    JSON.stringify({ iss: issuerId, iat: now, exp, aud: 'appstoreconnect-v1' }),
  ).toString('base64url');
  const input = `${header}.${payload}`;

  const sig = crypto.sign('sha256', Buffer.from(input), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  _token = `${input}.${sig.toString('base64url')}`;
  _tokenExp = exp;
  return _token;
}

// --- API ---

async function api(method, path, body) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

// --- App ID resolution ---

let _appId = null;
let _appIdOverride = null;

function readAppJson() {
  const appJsonPath = join(REPO_ROOT, 'apps/mobile/app.json');
  if (!existsSync(appJsonPath)) return null;
  try {
    return JSON.parse(readFileSync(appJsonPath, 'utf8'));
  } catch {
    return null;
  }
}

async function resolveAppId() {
  if (_appId) return _appId;

  if (_appIdOverride) {
    _appId = _appIdOverride;
    return _appId;
  }
  if (process.env.ASC_APP_ID) {
    _appId = process.env.ASC_APP_ID;
    return _appId;
  }

  const bundleId = readAppJson()?.expo?.ios?.bundleIdentifier;
  if (!bundleId) {
    console.error(
      'ASC_APP_ID not set and expo.ios.bundleIdentifier not found in apps/mobile/app.json.\n' +
        'Set ASC_APP_ID in .appstoreconnect.env or pass --app-id.',
    );
    process.exit(1);
  }

  const { data } = await api(
    'GET',
    `/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}`,
  );
  if (!data?.length) {
    console.error(
      `No App Store Connect app found for bundleId ${bundleId}.\n` +
        'Create the app in App Store Connect first, or pass --app-id.',
    );
    process.exit(1);
  }
  _appId = data[0].id;
  console.log(`Resolved app id ${_appId} from bundleId ${bundleId}`);
  return _appId;
}

function readSavedBuildNumber() {
  if (!existsSync(BUILD_NUMBER_FILE)) return null;
  const value = readFileSync(BUILD_NUMBER_FILE, 'utf8').trim();
  return value || null;
}

async function findEditableVersion() {
  const appId = await resolveAppId();
  const { data } = await api(
    'GET',
    `/v1/apps/${appId}/appStoreVersions?filter[platform]=IOS&limit=5`,
  );
  return (
    data.find((v) => EDITABLE_STATES.includes(v.attributes.appStoreState)) ||
    null
  );
}

async function getEditableVersion() {
  const editable = await findEditableVersion();
  if (!editable) {
    console.error(
      'No editable version found. Run: app-store create-version <version>',
    );
    process.exit(1);
  }
  return editable;
}

async function getLocalization(versionId, locale = 'ko') {
  const { data } = await api(
    'GET',
    `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`,
  );
  let loc = data.find((l) => l.attributes.locale === locale);

  if (!loc) {
    const res = await api('POST', '/v1/appStoreVersionLocalizations', {
      data: {
        type: 'appStoreVersionLocalizations',
        attributes: { locale },
        relationships: {
          appStoreVersion: {
            data: { type: 'appStoreVersions', id: versionId },
          },
        },
      },
    });
    loc = res.data;
  }
  return loc;
}

// --- Commands ---

async function status() {
  const appId = await resolveAppId();
  const app = await api('GET', `/v1/apps/${appId}`);
  const versions = await api(
    'GET',
    `/v1/apps/${appId}/appStoreVersions?filter[platform]=IOS&limit=5`,
  );

  console.log(
    `App: ${app.data.attributes.name} (${app.data.attributes.bundleId})`,
  );
  console.log('='.repeat(50));

  for (const v of versions.data) {
    const a = v.attributes;
    console.log(`\n  v${a.versionString} | ${a.appStoreState}`);
    if (a.createdDate)
      console.log(
        `  created: ${new Date(a.createdDate).toLocaleDateString()}`,
      );
  }
}

async function createVersion(versionString) {
  if (!versionString) {
    console.error('Usage: app-store create-version <version>');
    process.exit(1);
  }

  const appId = await resolveAppId();
  const res = await api('POST', '/v1/appStoreVersions', {
    data: {
      type: 'appStoreVersions',
      attributes: { versionString, platform: 'IOS' },
      relationships: { app: { data: { type: 'apps', id: appId } } },
    },
  });
  console.log(
    `Created v${versionString}: ${res.data.attributes.appStoreState}`,
  );
}

async function listing(options) {
  const {
    lang = 'ko',
    desc,
    keywords,
    promo,
    supportUrl,
    marketingUrl,
    copyright,
    whatsNew,
  } = options;

  const version = await getEditableVersion();
  const loc = await getLocalization(version.id, lang);

  const attrs = {};
  if (desc) attrs.description = desc;
  if (keywords) attrs.keywords = keywords;
  if (promo) attrs.promotionalText = promo;
  if (supportUrl) attrs.supportUrl = supportUrl;
  if (marketingUrl) attrs.marketingUrl = marketingUrl;
  if (whatsNew) attrs.whatsNew = whatsNew;

  if (Object.keys(attrs).length === 0 && !copyright) {
    console.error(
      'Provide: --desc, --keywords, --promo, --support-url, --marketing-url, --whats-new, --copyright',
    );
    process.exit(1);
  }

  if (Object.keys(attrs).length > 0) {
    await api('PATCH', `/v1/appStoreVersionLocalizations/${loc.id}`, {
      data: {
        type: 'appStoreVersionLocalizations',
        id: loc.id,
        attributes: attrs,
      },
    });
  }

  if (copyright) {
    await api('PATCH', `/v1/appStoreVersions/${version.id}`, {
      data: {
        type: 'appStoreVersions',
        id: version.id,
        attributes: { copyright },
      },
    });
  }

  console.log(`Listing updated (${lang}):`);
  for (const [k, v] of Object.entries({
    ...attrs,
    ...(copyright ? { copyright } : {}),
  })) {
    const s = String(v);
    console.log(`  ${k}: ${s.substring(0, 80)}${s.length > 80 ? '...' : ''}`);
  }
}

async function setPrivacyUrl(url, locale = 'ko') {
  if (!url) {
    console.error(
      'Usage: app-store set-privacy-url --url <https-url> [--lang ko]',
    );
    process.exit(1);
  }

  const appId = await resolveAppId();
  const { data: appInfos } = await api('GET', `/v1/apps/${appId}/appInfos`);
  if (!appInfos?.length) {
    console.error('No appInfos found for this app.');
    process.exit(1);
  }
  const info =
    appInfos.find((i) => i.attributes.appStoreState !== 'READY_FOR_SALE') ||
    appInfos[0];

  const { data: locs } = await api(
    'GET',
    `/v1/appInfos/${info.id}/appInfoLocalizations`,
  );
  const loc = locs.find((l) => l.attributes.locale === locale);

  if (loc) {
    await api('PATCH', `/v1/appInfoLocalizations/${loc.id}`, {
      data: {
        type: 'appInfoLocalizations',
        id: loc.id,
        attributes: { privacyPolicyUrl: url },
      },
    });
  } else {
    await api('POST', '/v1/appInfoLocalizations', {
      data: {
        type: 'appInfoLocalizations',
        attributes: { locale, privacyPolicyUrl: url },
        relationships: {
          appInfo: { data: { type: 'appInfos', id: info.id } },
        },
      },
    });
  }

  console.log(`[${locale}] privacyPolicyUrl set: ${url}`);
}

async function setReviewDetails(options) {
  const { demoUser, demoPassword, firstName, lastName, phone, email, notes } =
    options;

  const attrs = {};
  if (demoUser) {
    attrs.demoAccountName = demoUser;
    attrs.demoAccountRequired = true;
  }
  if (demoPassword) attrs.demoAccountPassword = demoPassword;
  if (firstName) attrs.contactFirstName = firstName;
  if (lastName) attrs.contactLastName = lastName;
  if (phone) attrs.contactPhone = phone;
  if (email) attrs.contactEmail = email;
  if (notes) attrs.notes = notes;

  if (!Object.keys(attrs).length) {
    console.error(
      'Provide at least one of: --demo-user, --demo-password, --first-name, --last-name, --phone, --email, --notes',
    );
    process.exit(1);
  }

  const version = await getEditableVersion();

  let detail = null;
  try {
    const res = await api(
      'GET',
      `/v1/appStoreVersions/${version.id}/appStoreReviewDetail`,
    );
    detail = res?.data || null;
  } catch {
    detail = null;
  }

  if (detail) {
    await api('PATCH', `/v1/appStoreReviewDetails/${detail.id}`, {
      data: {
        type: 'appStoreReviewDetails',
        id: detail.id,
        attributes: attrs,
      },
    });
  } else {
    await api('POST', '/v1/appStoreReviewDetails', {
      data: {
        type: 'appStoreReviewDetails',
        attributes: attrs,
        relationships: {
          appStoreVersion: {
            data: { type: 'appStoreVersions', id: version.id },
          },
        },
      },
    });
  }

  console.log(
    `Review details updated for v${version.attributes.versionString}:`,
  );
  for (const [k, v] of Object.entries(attrs)) {
    const masked = k === 'demoAccountPassword' ? '********' : v;
    console.log(`  ${k}: ${masked}`);
  }
}

async function uploadScreenshots(dir, displayType) {
  if (!dir || !displayType) {
    console.error('Usage: app-store screenshots <dir> <type|auto>');
    console.error(`Types: ${Object.keys(SCREENSHOT_TYPES).join(', ')}, auto`);
    process.exit(1);
  }

  const absDir = resolve(dir);
  const files = existsSync(absDir)
    ? readdirSync(absDir)
        .filter((f) => /\.(png|jpe?g)$/i.test(f))
        .sort()
    : [];
  if (files.length === 0) {
    console.error(`No images in ${absDir}`);
    process.exit(1);
  }

  // 'auto' — 첫 이미지의 실제 픽셀 크기로 display type을 판정한다.
  // 캡처 해상도와 display type이 어긋나면 ASC가 업로드를 거부하므로,
  // 시뮬레이터 기종이 바뀌어도 스크립트가 알아서 맞춘다.
  let resolvedType = displayType;
  if (displayType === 'auto') {
    const { width, height } = pngSize(join(absDir, files[0]));
    resolvedType = displayTypeForResolution(width, height);
    if (!resolvedType) {
      console.error(
        `Cannot map ${width}x${height} to an App Store display type. ` +
          `Capture on a 6.7" (1290x2796) or 6.9" (1320x2868) simulator, or pass the type explicitly.`,
      );
      process.exit(1);
    }
    console.log(`auto display type: ${width}x${height} -> ${resolvedType}`);
  }

  const mapped = SCREENSHOT_TYPES[resolvedType];
  if (!mapped) {
    console.error(
      `Unknown type: ${resolvedType}. Available: ${Object.keys(SCREENSHOT_TYPES).join(', ')}`,
    );
    process.exit(1);
  }

  const version = await getEditableVersion();
  const loc = await getLocalization(version.id, 'ko');

  // Get or create screenshot set
  const sets = await api(
    'GET',
    `/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets`,
  );
  let set = sets.data.find(
    (s) => s.attributes.screenshotDisplayType === mapped,
  );

  if (!set) {
    const res = await api('POST', '/v1/appScreenshotSets', {
      data: {
        type: 'appScreenshotSets',
        attributes: { screenshotDisplayType: mapped },
        relationships: {
          appStoreVersionLocalization: {
            data: {
              type: 'appStoreVersionLocalizations',
              id: loc.id,
            },
          },
        },
      },
    });
    set = res.data;
  }

  // Delete existing
  const existing = await api(
    'GET',
    `/v1/appScreenshotSets/${set.id}/appScreenshots`,
  );
  for (const ss of existing.data) {
    await api('DELETE', `/v1/appScreenshots/${ss.id}`);
  }

  // Upload
  console.log(`Uploading ${files.length} screenshots (${mapped}):`);
  for (const file of files) {
    const filePath = join(absDir, file);
    const fileData = readFileSync(filePath);
    const fileSize = statSync(filePath).size;
    const checksum = crypto.createHash('md5').update(fileData).digest('base64');

    // Reserve
    const reserved = await api('POST', '/v1/appScreenshots', {
      data: {
        type: 'appScreenshots',
        attributes: { fileName: file, fileSize },
        relationships: {
          appScreenshotSet: {
            data: { type: 'appScreenshotSets', id: set.id },
          },
        },
      },
    });

    // Upload chunks
    for (const op of reserved.data.attributes.uploadOperations) {
      const chunk = fileData.subarray(op.offset, op.offset + op.length);
      const headers = {};
      for (const h of op.requestHeaders) headers[h.name] = h.value;
      await fetch(op.url, { method: op.method, headers, body: chunk });
    }

    // Commit
    await api('PATCH', `/v1/appScreenshots/${reserved.data.id}`, {
      data: {
        type: 'appScreenshots',
        id: reserved.data.id,
        attributes: { uploaded: true, sourceFileChecksum: checksum },
      },
    });

    console.log(`  ${file}: uploaded`);
  }
}

async function listBuilds() {
  const appId = await resolveAppId();
  const res = await api(
    'GET',
    `/v1/builds?filter[app]=${appId}&sort=-uploadedDate&limit=5`,
  );

  console.log('Recent builds:');
  for (const b of res.data) {
    const a = b.attributes;
    console.log(
      `  ${b.id} | v${a.version} (${a.buildNumber || '?'}) | ${a.processingState} | ${new Date(a.uploadedDate).toLocaleDateString()}`,
    );
  }
}

async function selectBuild(buildId) {
  if (!buildId) {
    console.error('Usage: app-store select-build <build-id>');
    process.exit(1);
  }

  const version = await getEditableVersion();
  await api('PATCH', `/v1/appStoreVersions/${version.id}`, {
    data: {
      type: 'appStoreVersions',
      id: version.id,
      relationships: {
        build: { data: { type: 'builds', id: buildId } },
      },
    },
  });

  console.log(
    `Build ${buildId} selected for v${version.attributes.versionString}`,
  );
}

async function submitForReview() {
  const version = await getEditableVersion();
  const appId = await resolveAppId();

  // Reuse open review submission if one exists (avoid duplicate-submission errors)
  const existing = await api(
    'GET',
    `/v1/apps/${appId}/reviewSubmissions?filter[platform]=IOS&filter[state]=READY_FOR_REVIEW,WAITING_FOR_REVIEW,IN_REVIEW,UNRESOLVED_ISSUES&limit=10`,
  );
  const open = existing?.data?.[0];

  if (open) {
    const state = open.attributes.state;
    if (state === 'WAITING_FOR_REVIEW' || state === 'IN_REVIEW') {
      console.log(
        `Already submitted: reviewSubmission ${open.id} is ${state}. Nothing to do.`,
      );
      return;
    }
    if (state === 'UNRESOLVED_ISSUES') {
      console.error(
        `reviewSubmission ${open.id} has UNRESOLVED_ISSUES.\n` +
          'Resolve them in App Store Connect > Resolution Center, then re-run submit.',
      );
      process.exit(1);
    }
  }

  console.log(`Submitting v${version.attributes.versionString}...`);

  let subId;
  if (open && open.attributes.state === 'READY_FOR_REVIEW') {
    console.log(`Reusing open reviewSubmission ${open.id}`);
    subId = open.id;
  } else {
    const sub = await api('POST', '/v1/reviewSubmissions', {
      data: {
        type: 'reviewSubmissions',
        relationships: { app: { data: { type: 'apps', id: appId } } },
      },
    });
    subId = sub.data.id;
  }

  const items = await api('GET', `/v1/reviewSubmissions/${subId}/items`);
  if (!(items?.data || []).length) {
    await api('POST', '/v1/reviewSubmissionItems', {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: {
            data: { type: 'reviewSubmissions', id: subId },
          },
          appStoreVersion: {
            data: { type: 'appStoreVersions', id: version.id },
          },
        },
      },
    });
  } else {
    console.log('Review submission already has an item; skipping item creation.');
  }

  await api('PATCH', `/v1/reviewSubmissions/${subId}`, {
    data: {
      type: 'reviewSubmissions',
      id: subId,
      attributes: { submitted: true },
    },
  });

  console.log('Submitted for review!');
}

async function waitBuild(buildNumber) {
  const appId = await resolveAppId();
  const timeout = 30 * 60 * 1000;
  const interval = 30 * 1000;
  const start = Date.now();

  const filter = buildNumber
    ? `&filter[version]=${encodeURIComponent(buildNumber)}`
    : '';

  if (buildNumber) {
    console.log(`Waiting for build ${buildNumber} to finish processing...`);
  } else {
    console.log(
      'WARNING: no build number given — waiting on the most recent build.\n' +
        'Pass --build-number (saved by submit-ios.sh to apps/mobile/build/ipa/.last-build-number) to avoid selecting a stale build.',
    );
  }

  while (true) {
    const elapsed = Date.now() - start;
    if (elapsed > timeout) {
      console.error('\nError: Timeout after 30 minutes.');
      process.exit(1);
    }

    const res = await api(
      'GET',
      `/v1/builds?filter[app]=${appId}${filter}&sort=-uploadedDate&limit=1&fields[builds]=version,uploadedDate,processingState`,
    );
    const builds = res?.data || [];

    const mins = String(Math.floor(elapsed / 60000)).padStart(2, '0');
    const secs = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');

    if (!builds.length) {
      if (buildNumber) {
        process.stdout.write(
          `  [${mins}:${secs}] Build ${buildNumber} not visible yet (upload still processing) ...\n`,
        );
        await new Promise((r) => setTimeout(r, interval));
        continue;
      }
      console.error('\nNo builds found.');
      process.exit(1);
    }

    const { processingState, version } = builds[0].attributes;

    if (processingState === 'VALID') {
      console.log(`\nBuild ${version} processing complete (VALID)`);
      return builds[0].id;
    }
    if (processingState === 'FAILED' || processingState === 'INVALID') {
      console.error(`\nError: Build ${version} processing ${processingState}.`);
      process.exit(1);
    }

    process.stdout.write(`  [${mins}:${secs}] Build ${version} state: ${processingState} ...\n`);
    await new Promise((r) => setTimeout(r, interval));
  }
}

async function autoSelectBuild(buildId) {
  const version = await getEditableVersion();

  let build;
  if (buildId) {
    const res = await api(
      'GET',
      `/v1/builds/${buildId}?fields[builds]=version,uploadedDate,processingState`,
    );
    build = res.data;
  } else {
    const appId = await resolveAppId();
    const res = await api(
      'GET',
      `/v1/builds?filter[app]=${appId}&filter[processingState]=VALID&sort=-uploadedDate&limit=1&fields[builds]=version,uploadedDate,processingState`,
    );
    const builds = res?.data || [];

    if (!builds.length) {
      console.error('No VALID build found. Upload a build first.');
      process.exit(1);
    }
    build = builds[0];
  }

  console.log(`Version: ${version.attributes.versionString} (${version.attributes.appStoreState})`);
  console.log(`Build:   ${build.attributes.version} (uploaded: ${build.attributes.uploadedDate})`);
  console.log('Linking build to version...');

  await api('PATCH', `/v1/appStoreVersions/${version.id}/relationships/build`, {
    data: { type: 'builds', id: build.id },
  });

  console.log(`Build ${build.attributes.version} selected for v${version.attributes.versionString}`);
}

async function setReleaseNotes(ko, en) {
  const notes = {};
  if (ko) notes['ko'] = ko;
  if (en) notes['en-US'] = en;

  if (!Object.keys(notes).length) {
    console.error('Provide at least one of --ko or --en');
    process.exit(1);
  }

  const version = await getEditableVersion();
  console.log(`Setting release notes for v${version.attributes.versionString}...`);

  const resp = await api(
    'GET',
    `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`,
  );
  const localeMap = {};
  for (const loc of resp?.data || []) {
    localeMap[loc.attributes.locale] = loc.id;
  }

  for (const [locale, text] of Object.entries(notes)) {
    if (localeMap[locale]) {
      await api('PATCH', `/v1/appStoreVersionLocalizations/${localeMap[locale]}`, {
        data: {
          type: 'appStoreVersionLocalizations',
          id: localeMap[locale],
          attributes: { whatsNew: text },
        },
      });
      console.log(`  [${locale}] Updated release notes`);
    } else {
      await api('POST', '/v1/appStoreVersionLocalizations', {
        data: {
          type: 'appStoreVersionLocalizations',
          attributes: { locale, whatsNew: text },
          relationships: {
            appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } },
          },
        },
      });
      console.log(`  [${locale}] Created localization with release notes`);
    }
  }
  console.log('Release notes updated.');
}

async function waitReview(options = {}) {
  const interval = Number(options.interval) > 0 ? Number(options.interval) : 600;
  const timeout = Number(options.timeout) > 0 ? Number(options.timeout) : 1440;
  const appId = await resolveAppId();
  const timeoutMs = timeout * 60 * 1000;
  const intervalMs = interval * 1000;
  const start = Date.now();

  const SUCCESS_STATES = [
    'ACCEPTED',
    'PENDING_DEVELOPER_RELEASE',
    'PROCESSING_FOR_APP_STORE',
    'READY_FOR_SALE',
  ];
  const REJECTED_STATES = [
    'REJECTED',
    'METADATA_REJECTED',
    'DEVELOPER_REJECTED',
    'INVALID_BINARY',
  ];

  console.log(
    `Polling review status every ${interval}s (timeout: ${timeout} min)...`,
  );

  while (true) {
    const { data: versions } = await api(
      'GET',
      `/v1/apps/${appId}/appStoreVersions?filter[platform]=IOS&limit=1`,
    );
    const version = versions?.[0];
    if (!version) {
      console.error('No app store versions found.');
      process.exit(1);
    }
    const state = version.attributes.appStoreState;

    const subs = await api(
      'GET',
      `/v1/apps/${appId}/reviewSubmissions?filter[platform]=IOS&limit=1`,
    );
    const subState = subs?.data?.[0]?.attributes?.state || 'NONE';

    const mins = Math.floor((Date.now() - start) / 60000);
    console.log(
      `  [${mins}m] v${version.attributes.versionString}: ${state} (reviewSubmission: ${subState})`,
    );

    if (SUCCESS_STATES.includes(state)) {
      console.log('\nReview passed!');
      return;
    }

    if (REJECTED_STATES.includes(state) || subState === 'UNRESOLVED_ISSUES') {
      console.error(
        `\nReview REJECTED (version state: ${state}, submission state: ${subState}).`,
      );
      console.error(
        'Rejection reasons are in App Store Connect > Resolution Center:',
      );
      console.error(`  https://appstoreconnect.apple.com/apps/${appId}/distribution`);
      process.exit(1);
    }

    if (Date.now() - start > timeoutMs) {
      console.error(
        `\nTimeout after ${timeout} minutes (still ${state}). Re-run wait-review to keep polling.`,
      );
      process.exit(1);
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

async function fullSubmit(ko, en, buildNumber) {
  if (!ko && !en) {
    console.error('Provide at least one of --ko or --en for release notes');
    process.exit(1);
  }

  const resolvedBuildNumber = buildNumber || readSavedBuildNumber();

  console.log('=== Full Submission Flow ===\n');

  console.log('[1/5] Ensuring editable version...');
  const editable = await findEditableVersion();
  if (editable) {
    console.log(
      `Editable version: v${editable.attributes.versionString} (${editable.attributes.appStoreState})`,
    );
  } else {
    const appVersion = readAppJson()?.expo?.version;
    if (!appVersion) {
      console.error(
        'No editable version and expo.version not found in apps/mobile/app.json.\n' +
          'Run: app-store create-version <version>',
      );
      process.exit(1);
    }
    console.log(`No editable version — creating v${appVersion}...`);
    await createVersion(appVersion);
  }
  console.log();

  console.log('[2/5] Waiting for build processing...');
  const buildId = await waitBuild(resolvedBuildNumber);
  console.log();

  console.log('[3/5] Selecting build...');
  await autoSelectBuild(buildId);
  console.log();

  console.log('[4/5] Setting release notes...');
  await setReleaseNotes(ko, en);
  console.log();

  console.log('[5/5] Submitting for review...');
  await submitForReview();
  console.log();

  console.log('=== Full Submission Complete ===');
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

const str = (v) => (typeof v === 'string' ? v : undefined);

function printHelp() {
  console.log(`
App Store Connect CLI

Commands:
  status                              Show app and version status
  create-version <version>            Create new App Store version
  listing [--lang ko] [--desc] [--keywords] [--promo] [--support-url] [--marketing-url] [--whats-new] [--copyright]
                                      Update version localization
  set-privacy-url --url <url> [--lang ko]
                                      Set privacy policy URL (App Info localization)
  set-review-details [--demo-user] [--demo-password] [--first-name] [--last-name] [--phone] [--email] [--notes]
                                      Set App Review demo account + contact info
  screenshots <dir> <type>            Upload screenshots
  builds                              List recent builds
  select-build <build-id>             Select build for current version
  wait-build [--build-number N]       Wait for build processing (30 min timeout);
                                      defaults to build number saved by submit-ios.sh
  set-release-notes --ko "..." --en "..."
                                      Set release notes (What's New)
  submit                              Submit for review (reuses open submission)
  wait-review [--interval 600] [--timeout 1440]
                                      Poll review status; prints rejection info and exits 1 on rejection
  full-submit [--build-number N] --ko "..." --en "..."
                                      End-to-end: version → wait → select → notes → submit

Screenshot types: ${Object.keys(SCREENSHOT_TYPES).join(', ')}

Global flags:
  --app-id <id>    Override App Store Connect app id

Environment (auto-loaded from .appstoreconnect.env in project root):
  ASC_ISSUER_ID    App Store Connect API Issuer ID (required)
  ASC_KEY_ID       App Store Connect API Key ID (required)
  ASC_APP_ID       App id (optional — auto-resolved from expo.ios.bundleIdentifier)
  ASC_KEY_PATH     Path to AuthKey .p8 file
                   (default: ~/.appstoreconnect/AuthKey_\${ASC_KEY_ID}.p8)

Examples:
  node scripts/app-store.mjs status
  node scripts/app-store.mjs create-version 1.1.0
  node scripts/app-store.mjs listing --desc "앱 설명" --keywords "키워드1,키워드2"
  node scripts/app-store.mjs set-privacy-url --url https://myapp.pages.dev/privacy
  node scripts/app-store.mjs set-review-details --demo-user review@myapp.app --demo-password secret123
  node scripts/app-store.mjs screenshots assets/screenshots/ios/phone iphone-65
  node scripts/app-store.mjs builds
  node scripts/app-store.mjs full-submit --build-number 42 --ko "버그 수정" --en "Bug fixes"
  node scripts/app-store.mjs wait-review
`);
}

const args = process.argv.slice(2);
const { positional, flags } = parseArgs(args);
const command = positional[0];

if (str(flags['app-id'])) {
  _appIdOverride = flags['app-id'];
}

try {
  switch (command) {
    case 'status':
      await status();
      break;
    case 'create-version':
      await createVersion(positional[1]);
      break;
    case 'listing':
      await listing({
        lang: str(flags.lang) || 'ko',
        desc: str(flags.desc),
        keywords: str(flags.keywords),
        promo: str(flags.promo),
        supportUrl: str(flags['support-url']),
        marketingUrl: str(flags['marketing-url']),
        whatsNew: str(flags['whats-new']),
        copyright: str(flags.copyright),
      });
      break;
    case 'set-privacy-url':
      await setPrivacyUrl(str(flags.url), str(flags.lang) || 'ko');
      break;
    case 'set-review-details':
      await setReviewDetails({
        demoUser: str(flags['demo-user']),
        demoPassword: str(flags['demo-password']),
        firstName: str(flags['first-name']),
        lastName: str(flags['last-name']),
        phone: str(flags.phone),
        email: str(flags.email),
        notes: str(flags.notes),
      });
      break;
    case 'screenshots':
      await uploadScreenshots(positional[1], positional[2]);
      break;
    case 'builds':
      await listBuilds();
      break;
    case 'select-build':
      await selectBuild(positional[1]);
      break;
    case 'wait-build':
      await waitBuild(str(flags['build-number']) || readSavedBuildNumber());
      break;
    case 'set-release-notes':
      await setReleaseNotes(str(flags.ko), str(flags.en));
      break;
    case 'submit':
      await submitForReview();
      break;
    case 'wait-review':
      await waitReview({
        interval: str(flags.interval),
        timeout: str(flags.timeout),
      });
      break;
    case 'full-submit':
      await fullSubmit(str(flags.ko), str(flags.en), str(flags['build-number']));
      break;
    default:
      printHelp();
      if (command) {
        console.error(`Unknown command: ${command}`);
        process.exit(1);
      }
  }
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
