#!/usr/bin/env node
/**
 * open-parent-web.mjs — 부모님이 카톡 카드를 눌러 도착하는 화면(`/p/:token`)을 PC 브라우저에 띄운다.
 *
 * 왜: 개발 기기의 카카오톡에는 로그인할 수 없어(폰 1대만) 카드를 실제로 받을 수 없고,
 * 시연할 때는 "공유하면 부모님 화면에 이렇게 뜬다" 를 옆 창에서 바로 보여 줘야 한다.
 * 토큰은 서버와 같은 방식(HMAC, `ConnectionsService.parentViewToken`)으로 만든다 —
 * 서버가 보기에 카톡 카드의 링크와 구분되지 않는다.
 *
 * 사용:
 *   node scripts/open-parent-web.mjs                 # 가장 최근에 부모님께 공유된 인연(parent_intent)
 *   node scripts/open-parent-web.mjs <connectionId>  # 특정 인연
 *   node scripts/open-parent-web.mjs --print         # 열지 않고 주소만 출력
 *
 * 필요한 값은 apps/server/.env.development 에서 읽는다 (SUPABASE_URL, SUPABASE_SECRET_KEY, PUBLIC_BASE_URL).
 */
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PARENT_VIEW_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 서버와 같은 30일

function loadEnv() {
  const file = path.join(ROOT, 'apps', 'server', '.env.development');
  const out = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function parentViewToken(secret, connectionId, userId) {
  const body = Buffer.from(`${connectionId}.${userId}.${Date.now() + PARENT_VIEW_TTL_MS}`).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

const env = loadEnv();
const secret = env.SUPABASE_SECRET_KEY ?? 'booting-dev-share-secret';
const base = (env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const args = process.argv.slice(2);
const printOnly = args.includes('--print');
const wanted = args.find((a) => !a.startsWith('--'));

const admin = createClient(env.SUPABASE_URL, secret, { auth: { persistSession: false } });

// 인연 컬럼명을 가정하지 않는다 — `*` 로 받고 user 가 들어간 문자열 컬럼에서 자녀를 찾는다
const query = wanted
  ? admin.from('connections').select('*').eq('id', wanted).limit(1)
  : admin
      .from('connections')
      .select('*')
      .in('status', ['parent_intent', 'matched', 'chatting', 'mutual_heart'])
      .order('updated_at', { ascending: false })
      .limit(1);

const { data, error } = await query;
if (error) throw new Error(`connections 조회 실패: ${error.message}`);
const conn = data?.[0];
if (!conn) throw new Error('인연이 없습니다 (앱에서 상호 하트를 먼저 만드세요)');

// 인연의 두 자녀 중 "가장 최근 개발 계정" 쪽을 자녀(userId)로 삼는다 — 없으면 첫 번째 사용자 컬럼
const userCols = Object.keys(conn).filter((k) => /user/i.test(k) && typeof conn[k] === 'string');
const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
const byId = new Map((users?.users ?? []).map((u) => [u.id, u]));
const candidates = userCols.map((k) => conn[k]).filter((id) => byId.has(id));
const dev = candidates
  .map((id) => byId.get(id))
  .filter((u) => u.email?.startsWith('dev.') || u.email?.startsWith('demo@'))
  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
const userId = dev?.id ?? candidates[0];
if (!userId) throw new Error(`인연 ${conn.id} 에서 자녀 계정을 찾지 못했습니다 (컬럼: ${userCols.join(', ')})`);

const url = `${base}/p/${parentViewToken(secret, conn.id, userId)}`;
console.log(`인연 ${conn.id} (${conn.status}) · 자녀 ${byId.get(userId)?.email ?? userId}`);
console.log(url);
if (!printOnly) {
  const opener = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  spawn(opener[0], opener[1], { detached: true, stdio: 'ignore' }).unref();
}
