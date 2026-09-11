// Claude Code 세션 jsonl → 위키 ingest 용 마크다운.
//   node scripts/wiki-extract-sessions.mjs "<세션 디렉터리>" "<출력 디렉터리>"
// 예: node scripts/wiki-extract-sessions.mjs "$env:USERPROFILE\.claude\projects\C--proj-Booting" .\tmp\sessions
//
// 사용자 텍스트 / 어시스턴트 텍스트 / tool_use 이름만 남기고 tool_result·thinking·sidechain 은 버린다.
// `<id>.md` 는 전체, `<id>.user.md` 는 사용자 발화만 (요구사항 흐름을 빠르게 훑는 용도).
// 출력에는 비밀값이 섞일 수 있다 — 위키에 옮길 때 schema.md 의 "쓰지 않는 것" 을 지킨다.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const dir = process.argv[2];
const out = process.argv[3];
if (!dir || !out) {
  console.error('usage: node scripts/wiki-extract-sessions.mjs <session dir> <out dir>');
  process.exit(2);
}
fs.mkdirSync(out, { recursive: true });

const SYS_PREFIX = /^(<system-reminder>|<local-command-caveat>|<command-name>|<task-notification>)/;

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.jsonl'))) {
  const id = f.replace('.jsonl', '');
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(dir, f)), crlfDelay: Infinity });
  const lines = [];
  const stats = { user: 0, userSys: 0, assistant: 0, tool_use: 0, tool_result: 0, bad: 0 };
  let first = null;
  let last = null;
  const models = new Set();

  for await (const line of rl) {
    let o;
    try { o = JSON.parse(line); } catch { stats.bad++; continue; }
    if (o.isSidechain) continue;
    const ts = o.timestamp ? String(o.timestamp).slice(0, 16).replace('T', ' ') : '';
    if (o.timestamp) { first ??= o.timestamp; last = o.timestamp; }
    if (o.type !== 'user' && o.type !== 'assistant') continue;
    const m = o.message;
    if (!m) continue;
    if (m.model) models.add(m.model);
    const content = m.content;
    const blocks = typeof content === 'string' ? [{ type: 'text', text: content }] : Array.isArray(content) ? content : [];
    for (const b of blocks) {
      if (b.type === 'text' && b.text && b.text.trim()) {
        const text = b.text.trim();
        if (o.type === 'user') {
          if (SYS_PREFIX.test(text)) { stats.userSys++; lines.push(`\n> [SYS ${ts}] ${text.split('\n')[0].slice(0, 160)}\n`); }
          else { stats.user++; lines.push(`\n## [${ts}] USER\n${text}\n`); }
        } else { stats.assistant++; lines.push(`\n## [${ts}] ASSISTANT\n${text}\n`); }
      } else if (b.type === 'tool_use') {
        stats.tool_use++;
        const i = b.input || {};
        const hint = i.description || i.file_path || i.pattern || (i.command ? String(i.command).slice(0, 100) : '');
        lines.push(`\n> tool_use ${b.name}: ${String(hint).replace(/\s+/g, ' ').slice(0, 160)}\n`);
      } else if (b.type === 'tool_result') stats.tool_result++;
    }
  }

  const header = [`# Session ${id}`, `first: ${first}`, `last: ${last}`, `models: ${[...models].join(', ')}`, `stats: ${JSON.stringify(stats)}`, ''].join('\n');
  const body = lines.join('');
  fs.writeFileSync(path.join(out, `${id}.md`), header + body, 'utf8');
  fs.writeFileSync(path.join(out, `${id}.user.md`), header + lines.filter((l) => l.includes('] USER\n')).join(''), 'utf8');
  console.log(`${id}  ${(first || '').slice(0, 10)}→${(last || '').slice(0, 10)}  ${(body.length / 1024).toFixed(0)}KB  ${JSON.stringify(stats)}`);
}
