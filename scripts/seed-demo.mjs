#!/usr/bin/env node
/**
 * seed-demo.mjs — 에뮬레이터에서 앱을 직접 몰아보기 위한 데모 데이터.
 *
 * 만드는 것:
 *   - 공개 프로필 3개 (추천 피드에 뜰 상대들)
 *   - demo 계정 1개: 자녀 인증만 끝난 상태, 프로필은 없음
 *     → 앱에서 등록 플로우 5단계를 처음부터 실제로 걸어볼 수 있다
 *
 * 사용:
 *   node scripts/seed-demo.mjs                 # 시드 생성 + 계정 정보 출력
 *   node scripts/seed-demo.mjs --heart <email> # 시드 계정이 demo 프로필에 하트를 보낸다
 *                                              # (앱에서 되보내면 상호 하트 → 대화)
 *   node scripts/seed-demo.mjs --clean         # seed/demo 계정 전부 삭제
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = process.env.SEED_API_URL || 'http://localhost:3000/api';
const PASSWORD = 'BootingDemo123!';
const DOMAIN = 'seed.booting.app';

const PROFILES = [
  {
    tag: 'sook',
    displayName: '이영숙',
    gender: 'female',
    birthDate: '1959-03-14',
    regionCode: '11710', // 서울 송파구
    maritalStatus: 'bereaved',
    goals: ['serious', 'meal_walk'],
    intro: '어머니는 아침마다 석촌호수를 한 바퀴 도십니다. 텃밭 가꾸기와 트로트를 좋아하세요.',
    desired: '함께 산책하며 이야기 나눌 수 있는 분이면 좋겠습니다.',
    message: '건강하게 오래 걸을 수 있는 사람이면 좋겠습니다.',
    children: '2명',
    livingWith: '혼자 지내십니다',
    occupation: '은퇴 (주부)',
    hobbies: ['산책', '텃밭'],
  },
  {
    tag: 'jung',
    displayName: '박정희',
    gender: 'female',
    birthDate: '1962-11-02',
    regionCode: '11680', // 서울 강남구
    maritalStatus: 'divorced',
    goals: ['travel_hobby'],
    intro: '어머니는 사진 동호회 총무를 10년 하셨습니다. 여행 이야기가 끊이지 않으세요.',
    desired: '여행을 함께 다닐 수 있는 분을 찾습니다.',
    message: '자주 웃는 사람이 좋습니다.',
    children: '1명',
    livingWith: '자녀와 함께',
    occupation: '은퇴 (약사)',
    hobbies: ['사진', '여행'],
  },
  {
    tag: 'ok',
    displayName: '최순옥',
    gender: 'female',
    birthDate: '1957-07-21',
    regionCode: '41130', // 경기 성남시
    maritalStatus: 'bereaved',
    goals: ['undecided'],
    intro: '어머니는 서예를 20년 하셨습니다. 조용하고 단정한 분이십니다.',
    desired: '천천히 알아가고 싶습니다.',
    message: '서두르지 않았으면 합니다.',
    children: '3명',
    livingWith: '혼자 지내십니다',
    occupation: '은퇴 (공무원)',
    hobbies: ['서예', '독서'],
  },
];

const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAAWklEQVR4nO3BAQ0AAADCoPdPbQ8H' +
    'FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAvAYtAAABAKuVvQAAAABJRU5ErkJggg==',
  'base64'
);

async function loadEnv() {
  const text = await readFile(path.join(ROOT, 'apps', 'server', '.env.development'), 'utf8');
  const get = (key) => text.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim();
  return {
    url: get('SUPABASE_URL'),
    anonKey: get('SUPABASE_ANON_KEY'),
    secretKey: get('SUPABASE_SECRET_KEY'),
  };
}

async function call(token, method, endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${endpoint} → ${res.status} ${text}`);
  return data;
}

async function makeUser(admin, anon, email) {
  let userId;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) {
    if (!/already/i.test(error.message)) throw new Error(`${email}: ${error.message}`);
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId = list.users.find((u) => u.email === email)?.id;
  } else {
    userId = data.user.id;
  }

  const { data: session, error: signInError } = await anon.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signInError) throw new Error(`signIn ${email}: ${signInError.message}`);

  return { userId, token: session.session.access_token };
}

async function verify(token, userId, phoneSuffix) {
  await call(token, 'POST', '/me/verification/phone', {
    phone: `010${String(phoneSuffix).padStart(8, '0')}`,
    token: '123456',
  });
  await call(token, 'POST', '/me/verification/family', {
    storagePath: `${userId}/family.pdf`,
  });
}

async function uploadPhoto(url, anonKey, token, userId) {
  const objectPath = `${userId}/primary.png`;
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { error } = await client.storage
    .from('parent-photos')
    .upload(objectPath, PLACEHOLDER_PNG, { contentType: 'image/png', upsert: true });
  if (error) throw new Error(`photo upload: ${error.message}`);
  return objectPath;
}

async function main() {
  const { url, anonKey, secretKey } = await loadEnv();
  const admin = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anon = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (process.argv.includes('--clean')) {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const targets = list.users.filter((u) => u.email?.endsWith(`@${DOMAIN}`));
    for (const user of targets) await admin.auth.admin.deleteUser(user.id);
    console.log(`삭제한 계정 ${targets.length}개`);
    return;
  }

  const heartIndex = process.argv.indexOf('--heart');
  if (heartIndex > -1) {
    const demoEmail = process.argv[heartIndex + 1];
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const demo = list.users.find((u) => u.email === demoEmail);
    if (!demo) throw new Error(`계정을 찾을 수 없습니다: ${demoEmail}`);

    const { data: profile } = await admin
      .from('parent_profiles')
      .select('id, status')
      .eq('user_id', demo.id)
      .maybeSingle();
    if (!profile) throw new Error('demo 계정에 부모님 프로필이 없습니다 (앱에서 먼저 등록하세요)');
    if (profile.status !== 'published') throw new Error(`프로필이 공개 상태가 아닙니다 (${profile.status})`);

    const seeder = await makeUser(admin, anon, `seed.sook@${DOMAIN}`);
    const result = await call(seeder.token, 'POST', '/hearts', { targetProfileId: profile.id });
    console.log(`이영숙 → demo 하트 전송 (mutual=${result.mutual})`);
    console.log('앱의 [관심] 탭에서 하트를 되보내면 상호 하트가 됩니다.');
    return;
  }

  console.log('공개 프로필 3개 생성 중…');
  let phoneSuffix = 10000001;

  for (const spec of PROFILES) {
    const email = `seed.${spec.tag}@${DOMAIN}`;
    const { userId, token } = await makeUser(admin, anon, email);
    await verify(token, userId, phoneSuffix++);

    const existing = await call(token, 'GET', '/parent-profile');
    if (existing?.status === 'published') {
      console.log(`  이미 있음: ${spec.displayName}`);
      continue;
    }

    if (!existing) {
      await call(token, 'POST', '/parent-profile', {
        displayName: spec.displayName,
        gender: spec.gender,
        birthDate: spec.birthDate,
        regionCode: spec.regionCode,
        maritalStatus: spec.maritalStatus,
        goals: spec.goals,
      });
    }

    const photoPath = await uploadPhoto(url, anonKey, token, userId);
    await call(token, 'POST', '/parent-profile/photos', {
      storagePath: photoPath,
      isPrimary: true,
    });

    await call(token, 'PATCH', '/parent-profile', {
      introByChild: spec.intro,
      desiredPartner: spec.desired,
      parentMessage: spec.message,
      childrenCount: spec.children,
      livingWith: spec.livingWith,
      hobbies: spec.hobbies,
      religion: '무교',
      occupation: spec.occupation,
      drinking: '가끔',
      smoking: '비흡연',
      economicallyActive: false,
    });

    await call(token, 'POST', '/parent-profile/consent', {
      method: 'in_person',
      parentName: spec.displayName,
    });
    const published = await call(token, 'POST', '/parent-profile/submit');
    console.log(`  ${spec.displayName} (${published.region}) → ${published.status}`);
  }

  const demoEmail = `demo@${DOMAIN}`;
  const demo = await makeUser(admin, anon, demoEmail);
  await verify(demo.token, demo.userId, 10009999);
  console.log('\ndemo 계정 준비 완료 (자녀 인증 O / 부모님 프로필 X)');

  console.log('\n' + '='.repeat(52));
  console.log('에뮬레이터 로그인 정보');
  console.log(`  이메일   ${demoEmail}`);
  console.log(`  비밀번호 ${PASSWORD}`);
  console.log('='.repeat(52));
  console.log('앱에서 [부모님 프로필 등록하기] → 5단계 진행 → 공개까지 직접 확인하세요.');
  console.log(`공개한 뒤: node scripts/seed-demo.mjs --heart ${demoEmail}`);
}

main().catch((err) => {
  console.error(`\nSEED FAILED: ${err.message}`);
  process.exit(1);
});
