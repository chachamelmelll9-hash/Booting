// parent-url.mjs - print the parent-web path (/p/<token>) for a demo connection.
//
//   node parent-url.mjs parent_intent   # most recent connection waiting on the parent
//   node parent-url.mjs matched         # most recent connection where both parents agreed
//
// Same HMAC as scripts/open-parent-web.mjs, but picks the connection by status
// for the demo account so the recording does not depend on hard-coded ids.
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// @supabase/supabase-js lives in the server app's node_modules, not here
const require = createRequire(path.join(ROOT, 'apps', 'server', 'package.json'));
const { createClient } = require('@supabase/supabase-js');

const DEMO_EMAIL = 'dev.mu0ycqb3@seed.booting.app';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

const env = {};
for (const line of readFileSync(path.join(ROOT, 'apps', 'server', '.env.development'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

export async function parentPath(status) {
  const secret = env.SUPABASE_SECRET_KEY;
  const admin = createClient(env.SUPABASE_URL, secret, { auth: { persistSession: false } });
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const me = users.users.find((u) => u.email === DEMO_EMAIL);
  if (!me) throw new Error(`demo account ${DEMO_EMAIL} not found`);

  const { data, error } = await admin
    .from('connections')
    .select('*')
    .eq('status', status)
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  const conn = data.find((c) => Object.values(c).includes(me.id));
  if (!conn) throw new Error(`no ${status} connection for the demo account`);

  const body = Buffer.from(`${conn.id}.${me.id}.${Date.now() + TTL_MS}`).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `/p/${body}.${sig}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(await parentPath(process.argv[2] || 'parent_intent'));
}
