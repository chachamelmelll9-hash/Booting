#!/usr/bin/env node
/**
 * 로케일 무결성 검사
 * 1. src/locales/ 디렉토리 목록이 SUPPORTED_LANGUAGES(src/config/languages.ts)와 일치하는지
 * 2. 언어별 네임스페이스 파일 목록이 동일한지
 * 3. 기준 언어(ko) 대비 모든 언어의 키가 정확히 일치하는지 (누락/초과 diff)
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const localesDir = join(pkgRoot, 'src', 'locales');
const languagesFile = join(pkgRoot, 'src', 'config', 'languages.ts');

let failed = false;
const fail = (message) => {
  failed = true;
  console.error(`✗ ${message}`);
};

// 1. SUPPORTED_LANGUAGES ↔ locales 디렉토리 일치
const languagesSource = readFileSync(languagesFile, 'utf8');
const supportedMatch = languagesSource.match(/SUPPORTED_LANGUAGES\s*=\s*\[([^\]]*)\]/);
if (!supportedMatch) {
  console.error('✗ Could not parse SUPPORTED_LANGUAGES from src/config/languages.ts');
  process.exit(1);
}
const supported = [...supportedMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
const localeDirs = readdirSync(localesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

if (JSON.stringify(supported) !== JSON.stringify(localeDirs)) {
  fail(
    `SUPPORTED_LANGUAGES [${supported.join(', ')}] != locales directories [${localeDirs.join(', ')}]`
  );
}

// 2 & 3. 네임스페이스 파일 목록 + 키 패리티 (기준: ko)
const BASE_LANGUAGE = 'ko';
const flattenKeys = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) =>
    value !== null && typeof value === 'object'
      ? flattenKeys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );
const namespaceFiles = (lang) =>
  readdirSync(join(localesDir, lang))
    .filter((file) => file.endsWith('.json'))
    .sort();

const baseFiles = namespaceFiles(BASE_LANGUAGE);

for (const lang of localeDirs.filter((dir) => dir !== BASE_LANGUAGE)) {
  const files = namespaceFiles(lang);
  const missingFiles = baseFiles.filter((file) => !files.includes(file));
  const extraFiles = files.filter((file) => !baseFiles.includes(file));
  if (missingFiles.length > 0) fail(`${lang}: missing namespace files: ${missingFiles.join(', ')}`);
  if (extraFiles.length > 0) fail(`${lang}: extra namespace files: ${extraFiles.join(', ')}`);

  for (const file of baseFiles.filter((f) => files.includes(f))) {
    const baseKeys = flattenKeys(
      JSON.parse(readFileSync(join(localesDir, BASE_LANGUAGE, file), 'utf8'))
    );
    const langKeys = new Set(
      flattenKeys(JSON.parse(readFileSync(join(localesDir, lang, file), 'utf8')))
    );
    const baseKeySet = new Set(baseKeys);
    const missing = baseKeys.filter((key) => !langKeys.has(key));
    const extra = [...langKeys].filter((key) => !baseKeySet.has(key));
    if (missing.length > 0) fail(`${lang}/${file}: missing keys: ${missing.join(', ')}`);
    if (extra.length > 0) fail(`${lang}/${file}: extra keys: ${extra.join(', ')}`);
  }
}

if (failed) {
  process.exit(1);
}
console.log(`✓ Locales OK — languages: [${localeDirs.join(', ')}], namespaces: [${baseFiles.map((f) => f.replace('.json', '')).join(', ')}]`);
