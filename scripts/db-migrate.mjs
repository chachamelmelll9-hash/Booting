#!/usr/bin/env node
/**
 * db-migrate.mjs — supabase/migrations/*.sql 를 순서대로 적용한다.
 *
 * CLAUDE.md 의 마이그레이션 단일 정책을 지킨다: SQL 정본은 파일이고,
 * 적용은 이 스크립트(또는 Supabase MCP `apply_migration`)가 한다.
 *
 * 적용 이력은 supabase_migrations.schema_migrations 에 기록되므로
 * 이미 적용된 파일은 다시 실행하지 않는다 (Supabase CLI 와 같은 테이블).
 *
 * 사용:
 *   node scripts/db-migrate.mjs            # 미적용 마이그레이션 전부 적용
 *   node scripts/db-migrate.mjs --status   # 적용 여부만 출력
 *   node scripts/db-migrate.mjs --only 20260901093000_init_booting_schema.sql
 *
 * 필요 환경변수:
 *   SUPABASE_ACCESS_TOKEN  개인 액세스 토큰 (sbp_...)
 *   SUPABASE_PROJECT_REF   프로젝트 ref (기본값: apps/server/.env.development 의 SUPABASE_URL 에서 추출)
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');

async function resolveProjectRef() {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;
  const envFile = path.join(ROOT, 'apps', 'server', '.env.development');
  if (!existsSync(envFile)) throw new Error('SUPABASE_PROJECT_REF 를 찾을 수 없다');
  const text = await readFile(envFile, 'utf8');
  const m = text.match(/^SUPABASE_URL=https:\/\/([a-z0-9]+)\.supabase\.co/m);
  if (!m) throw new Error('apps/server/.env.development 에서 SUPABASE_URL 을 읽지 못했다');
  return m[1];
}

async function query(ref, token, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text}`);
  return text ? JSON.parse(text) : [];
}

const LEDGER = `
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  name text,
  statements text[],
  inserted_at timestamptz default now()
);`;

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN 이 없다');
  const ref = await resolveProjectRef();

  const onlyIdx = process.argv.indexOf('--only');
  const only = onlyIdx > -1 ? process.argv[onlyIdx + 1] : null;
  const statusOnly = process.argv.includes('--status');

  // 검증용 임시 쿼리 (마이그레이션 적용 결과 확인 등)
  const sqlIdx = process.argv.indexOf('--sql');
  if (sqlIdx > -1) {
    console.log(JSON.stringify(await query(ref, token, process.argv[sqlIdx + 1]), null, 2));
    return;
  }

  await query(ref, token, LEDGER);
  const applied = new Set(
    (await query(ref, token, 'select version from supabase_migrations.schema_migrations'))
      .map((r) => r.version),
  );

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const version = file.split('_')[0];
    const name = file.replace(/^\d+_/, '').replace(/\.sql$/, '');
    const done = applied.has(version);
    if (statusOnly) {
      console.log(`${done ? 'applied ' : 'PENDING '} ${file}`);
      continue;
    }
    if (only && file !== only) continue;
    if (done && !only) {
      console.log(`skip     ${file}`);
      continue;
    }
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    process.stdout.write(`apply    ${file} ... `);
    await query(ref, token, sql);
    await query(
      ref,
      token,
      `insert into supabase_migrations.schema_migrations (version, name)
       values ('${version}', '${name}') on conflict (version) do nothing`,
    );
    console.log('ok');
  }
}

main().catch((err) => {
  console.error(`\nFAILED: ${err.message}`);
  process.exit(1);
});
