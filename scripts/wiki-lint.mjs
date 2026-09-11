// docs/wiki 린트 — 깨진 상대 링크, frontmatter `type` 누락, 고아 페이지, [[위키링크]] 사용.
// 사용: node scripts/wiki-lint.mjs        (에러가 있으면 exit 1)
//
// 규약은 docs/wiki/schema.md. 예약 파일(index.md, log.md)은 frontmatter 검사에서 뺀다.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const wiki = path.join(root, 'docs', 'wiki');

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === '_attachments') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

const files = walk(wiki);
const rel = (p) => path.relative(root, p).replace(/\\/g, '/');
const errors = [];
const warnings = [];
const inbound = new Map(files.map((f) => [f, 0]));

const RESERVED = new Set(['index.md', 'log.md']);
const LINK_RE = /(?<!!)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const base = path.basename(file);

  // frontmatter
  if (!RESERVED.has(base)) {
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) errors.push(`${rel(file)}: frontmatter 없음`);
    else if (!/^type:\s*\S+/m.test(m[1])) errors.push(`${rel(file)}: frontmatter 에 type 없음`);
  }

  // 코드 블록·인라인 코드는 링크 검사에서 뺀다 (schema.md 가 `[[위키링크]]` 를 예로 든다)
  const stripped = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  if (/\[\[[^\]]+\]\]/.test(stripped)) warnings.push(`${rel(file)}: [[위키링크]] 사용 — 마크다운 링크로 바꿀 것`);
  for (const match of stripped.matchAll(LINK_RE)) {
    let target = match[2];
    if (/^(https?:|mailto:|commit:|session:|tel:)/.test(target)) continue;
    if (target.startsWith('#')) continue;
    target = target.split('#')[0];
    if (!target) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target));
    if (!fs.existsSync(resolved)) {
      errors.push(`${rel(file)}: 깨진 링크 -> ${match[2]}`);
      continue;
    }
    if (inbound.has(resolved)) inbound.set(resolved, inbound.get(resolved) + 1);
  }
}

// 고아: 어디서도 링크되지 않은 위키 페이지 (루트 index/log/schema/INSTRUCTIONS 제외)
for (const [f, n] of inbound) {
  const r = rel(f);
  if (n === 0 && !/docs\/wiki\/(index|log|schema|INSTRUCTIONS)\.md$/.test(r) && !r.endsWith('/index.md')) {
    warnings.push(`${r}: 고아 페이지 (들어오는 링크 없음)`);
  }
}

console.log(`pages: ${files.length}`);
for (const w of warnings) console.log(`WARN  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(`warnings: ${warnings.length}, errors: ${errors.length}`);
process.exit(errors.length ? 1 : 0);
