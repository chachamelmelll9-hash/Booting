#!/usr/bin/env node
/**
 * seed-demo.mjs — 에뮬레이터에서 앱을 직접 몰아보기 위한 데모 데이터.
 *
 * 만드는 것:
 *   - 공개 프로필 14개 (남녀·지역·목적을 흩어 놓은 추천 대상)
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

/**
 * 시드 프로필.
 *
 * 남녀를 모두 넣는다 — demo 계정 부모님이 여성이라 여성만 있으면 추천이
 * 사실상 비고, 몇 번 넘기면 바로 바닥난다. 지역도 수도권 안에서 흩어 놓아
 * 반경 필터(10/30/50km)가 실제로 다르게 동작하는 걸 볼 수 있게 했다.
 */
const PROFILES = [
  // --- 여성 ---
  ['sook', '이영숙', 'female', '1959-03-14', '11710', 'bereaved', ['serious', 'meal_walk'],
    '어머니는 아침마다 석촌호수를 한 바퀴 도십니다. 텃밭 가꾸기와 트로트를 좋아하세요.',
    '함께 산책하며 이야기 나눌 수 있는 분이면 좋겠습니다.', '2명', '혼자 거주', '은퇴 (주부)', ['산책', '텃밭']],
  ['jung', '박정희', 'female', '1962-11-02', '11680', 'divorced', ['travel_hobby'],
    '어머니는 사진 동호회 총무를 10년 하셨습니다. 여행 이야기가 끊이지 않으세요.',
    '여행을 함께 다닐 수 있는 분을 찾습니다.', '1명', '자녀와 거주', '은퇴 (약사)', ['사진', '여행']],
  ['ok', '최순옥', 'female', '1957-07-21', '41130', 'bereaved', ['undecided'],
    '어머니는 서예를 20년 하셨습니다. 조용하고 단정한 분이십니다.',
    '천천히 알아가고 싶습니다.', '3명', '혼자 거주', '은퇴 (공무원)', ['서예', '독서']],
  ['mija', '한미자', 'female', '1955-05-09', '11440', 'bereaved', ['meal_walk'],
    '어머니는 40년 동안 동네에서 반찬가게를 하셨습니다. 음식 솜씨가 좋으세요.',
    '가까운 곳에서 자주 볼 수 있는 분이면 좋겠습니다.', '2명', '자녀와 거주', '자영업 (은퇴)', ['요리', '등산']],
  ['younghee', '조영희', 'female', '1964-02-18', '11650', 'divorced', ['remarriage'],
    '어머니는 지금도 주 3회 수영을 하십니다. 활동적이고 밝은 분이세요.',
    '건강한 생활을 함께할 분을 찾습니다.', '1명', '혼자 거주', '간호사 (은퇴)', ['수영', '요가']],
  ['boknyeo', '서복녀', 'female', '1953-12-01', '28237', 'bereaved', ['same_sex_friend'],
    '어머니는 이성 교제보다 마음 맞는 친구를 찾고 계십니다.',
    '같이 다닐 동성 친구를 찾습니다.', '4명', '형제와 거주', '은퇴 (교사)', ['성경공부', '뜨개질']],

  // --- 남성 ---
  ['cheolsu', '김철수', 'male', '1958-04-11', '11680', 'bereaved', ['serious'],
    '아버지는 30년간 중학교에서 수학을 가르치셨습니다. 조용하지만 유머가 있으세요.',
    '대화가 잘 통하는 분이면 좋겠습니다.', '2명', '혼자 거주', '교사 (은퇴)', ['바둑', '산책']],
  ['youngsu', '박영수', 'male', '1960-08-23', '11710', 'divorced', ['serious', 'travel_hobby'],
    '아버지는 은퇴 후 국내 여행을 다니십니다. 사진을 많이 찍어 오세요.',
    '함께 여행 다닐 수 있는 분을 찾습니다.', '1명', '자녀와 거주', '공무원 (은퇴)', ['여행', '사진']],
  ['jongho', '이종호', 'male', '1956-01-30', '41130', 'bereaved', ['meal_walk'],
    '아버지는 매일 아침 뒷산에 오르십니다. 부지런한 분이세요.',
    '동네에서 같이 밥 먹고 산책할 분이면 충분합니다.', '3명', '혼자 거주', '자영업 (은퇴)', ['등산', '텃밭']],
  ['sanghoon', '정상훈', 'male', '1963-06-14', '11500', 'divorced', ['remarriage'],
    '아버지는 색소폰을 배우신 지 5년째입니다. 동호회 활동도 하세요.',
    '취미를 함께 나눌 수 있는 분을 찾습니다.', '2명', '혼자 거주', '회사원 (은퇴)', ['색소폰', '음악감상']],
  ['dukbae', '오덕배', 'male', '1954-09-27', '41280', 'bereaved', ['undecided'],
    '아버지는 손주 보는 낙으로 지내십니다. 아직은 조심스러워 하세요.',
    '천천히 알아가고 싶습니다.', '3명', '자녀와 거주', '농업', ['낚시', '바둑']],
  ['giseok', '한기석', 'male', '1961-03-05', '11170', 'divorced', ['same_sex_friend'],
    '아버지는 등산 모임을 오래 하셨습니다. 함께 다닐 친구를 찾으세요.',
    '주말마다 산에 같이 갈 친구를 찾습니다.', '1명', '혼자 거주', '건축사 (은퇴)', ['등산', '캠핑']],
  ['myeongsu', '강명수', 'male', '1959-11-19', '11260', 'bereaved', ['serious', 'meal_walk'],
    '아버지는 40년 이발소를 하셨습니다. 이야기를 재미있게 하세요.',
    '편하게 이야기 나눌 수 있는 분이면 좋겠습니다.', '2명', '혼자 거주', '이용사 (은퇴)', ['장기', '라디오']],
  ['inho', '윤인호', 'male', '1965-07-08', '11215', 'divorced', ['travel_hobby'],
    '아버지는 자전거로 한강을 자주 도십니다. 아직 정정하세요.',
    '활동적인 분과 함께하고 싶습니다.', '1명', '혼자 거주', '엔지니어 (은퇴)', ['자전거', '여행']],

  // --- 50대 (필터 기본 구간이 50~60세라 이 나이대가 없으면 추천이 통째로 빈다) ---
  ['taeho', '문태호', 'male', '1966-04-02', '11680', 'divorced', ['serious'],
    '아버지는 아직 현직에 계십니다. 주말마다 텃밭을 가꾸세요.',
    '서두르지 않고 오래 만날 분을 찾습니다.', '2명', '혼자 거주', '설계사', ['텃밭', '드라이브']],
  ['junsik', '배준식', 'male', '1968-09-15', '11710', 'bereaved', ['serious', 'meal_walk'],
    '아버지는 아내를 먼저 보내시고 3년째 혼자 지내십니다. 손맛이 좋으세요.',
    '함께 밥 먹고 이야기 나눌 분이면 좋겠습니다.', '1명', '혼자 거주', '요리사', ['요리', '등산']],
  ['hyunwoo', '남현우', 'male', '1970-03-22', '11650', 'divorced', ['remarriage'],
    '아버지는 마라톤을 10년째 하십니다. 성실하고 규칙적인 분이세요.',
    '함께 운동하며 지낼 분을 찾습니다.', '1명', '혼자 거주', '물리치료사', ['마라톤', '독서']],
  ['seokjin', '고석진', 'male', '1972-11-08', '41130', 'divorced', ['travel_hobby'],
    '아버지는 캠핑 장비를 직접 만드십니다. 손재주가 좋으세요.',
    '주말마다 함께 나갈 분이면 좋겠습니다.', '2명', '자녀와 거주', '목공', ['캠핑', '목공']],
  ['dongjin', '류동진', 'male', '1974-06-30', '11440', 'divorced', ['meal_walk'],
    '아버지는 동네 축구 동호회 총무를 맡고 계십니다.',
    '가볍게 자주 볼 수 있는 분을 찾습니다.', '1명', '혼자 거주', '자영업', ['축구', '산책']],
  ['hyeja', '노혜자', 'female', '1967-05-12', '11170', 'bereaved', ['serious'],
    '어머니는 20년째 합창단에서 노래하십니다. 목소리가 고우세요.',
    '음악을 좋아하는 분이면 좋겠습니다.', '2명', '혼자 거주', '음악강사', ['합창', '피아노']],
  ['eunsook', '차은숙', 'female', '1969-12-03', '11500', 'divorced', ['travel_hobby'],
    '어머니는 매년 한 번은 혼자 여행을 다녀오십니다. 독립적인 분이세요.',
    '여행 취향이 맞는 분을 찾습니다.', '1명', '혼자 거주', '여행사 근무', ['여행', '사진']],
  ['jina', '신진아', 'female', '1971-08-19', '11260', 'bereaved', ['remarriage'],
    '어머니는 도자기 공방을 운영하십니다. 손으로 무언가 만드는 걸 좋아하세요.',
    '취미를 함께 나눌 분을 찾습니다.', '1명', '자녀와 거주', '공방 운영', ['도예', '전시관람']],
  ['sunmi', '홍선미', 'female', '1973-02-27', '41280', 'divorced', ['meal_walk'],
    '어머니는 아침마다 호수공원을 걸으십니다. 부지런한 분이세요.',
    '가까운 곳에서 자주 볼 분이면 충분합니다.', '2명', '혼자 거주', '보험설계사', ['걷기', '요리']],
].map(
  ([
    tag, displayName, gender, birthDate, regionCode, maritalStatus, goals,
    intro, desired, children, livingWith, occupation, hobbies,
  ]) => ({
    tag, displayName, gender, birthDate, regionCode, maritalStatus, goals,
    intro, desired, children, livingWith, occupation, hobbies,
    message: desired,
  })
);

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

/** 사진은 최소 3장이 필수라 시드도 3장을 올린다 */
async function uploadPhotos(url, anonKey, token, userId, count = 3) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const paths = [];
  for (let i = 0; i < count; i += 1) {
    const objectPath = `${userId}/photo-${i + 1}.png`;
    const { error } = await client.storage
      .from('parent-photos')
      .upload(objectPath, PLACEHOLDER_PNG, { contentType: 'image/png', upsert: true });
    if (error) throw new Error(`photo upload: ${error.message}`);
    paths.push(objectPath);
  }
  return paths;
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

  /**
   * demo 계정이 이미 보낸 하트·넘김을 지운다.
   * 추천 제외 집합에 쌓이면 몇 번 넘기고 나서 피드가 비는데, 그때마다
   * 계정을 새로 만들 필요 없이 이걸로 되돌린다.
   */
  if (process.argv.includes('--reset-feed')) {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const demo = list.users.find((u) => u.email === `demo@${DOMAIN}`);
    if (!demo) throw new Error('demo 계정이 없습니다');

    const hearts = await admin.from('hearts').delete().eq('sender_user_id', demo.id).select('id');
    const passes = await admin.from('passes').delete().eq('user_id', demo.id).select('id');
    console.log(
      `초기화: 하트 ${hearts.data?.length ?? 0}건, 넘김 ${passes.data?.length ?? 0}건 삭제`
    );
    return;
  }

  // 앱에서 "안 된다"고 할 때 서버 쪽에서 같은 동작을 재현해 본다
  if (process.argv.includes('--diagnose')) {
    const res = await fetch(`${API}/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const session = await res.json();
    if (!res.ok) throw new Error(`dev-login ${res.status} ${JSON.stringify(session)}`);
    const token = session.accessToken;

    const profile = await call(token, 'GET', '/parent-profile');
    console.log(`내 프로필: status=${profile?.status} gender=${profile?.gender} goals=${profile?.goals}`);

    const filter = await call(token, 'GET', '/discovery/filters');
    console.log(`필터: ${JSON.stringify(filter)}`);

    const feed = await call(token, 'GET', '/discovery');
    console.log(`추천 ${feed.items.length}명: ${feed.items.map((i) => `${i.maskedName}(${i.region})`).join(', ') || '없음'}`);

    if (!feed.items.length) {
      console.log('→ 추천이 비어 있어서 하트를 보낼 대상이 없다.');
      return;
    }

    const target = feed.items[0];
    const heartRes = await fetch(`${API}/hearts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ targetProfileId: target.profileId }),
    });
    const heartBody = await heartRes.text();
    console.log(`하트 → ${target.maskedName}: ${heartRes.status} ${heartBody}`);
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

  console.log(`공개 프로필 `+PROFILES.length+`개 준비 중…`);
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

    const photoPaths = await uploadPhotos(url, anonKey, token, userId);
    for (const [index, photoPath] of photoPaths.entries()) {
      await call(token, 'POST', '/parent-profile/photos', {
        storagePath: photoPath,
        isPrimary: index === 0,
      });
    }

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
