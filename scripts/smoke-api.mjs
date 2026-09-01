#!/usr/bin/env node
/**
 * smoke-api.mjs — 부팅 도메인 전체 흐름을 API 수준에서 관통 검증한다.
 *
 * docs/features/test-scenarios.md 의 E2E-01 과 SEC.1~SEC.4 에 대응한다.
 * 모바일 화면을 짜기 전에 서버 계약이 실제로 맞는지 먼저 증명하는 용도다.
 *
 * 계정 2개를 새로 만들어 다음을 관통한다:
 *   인증 → 프로필 등록 → 동의 → 공개 → 하트 → 상호 하트 → 대화
 *   → 부모님 의사 → 만남 일정 → 한쪽 확인 → 양쪽 확인(최종 매칭) → 사후 응답
 *
 * 그리고 다음을 **부재로** 검증한다:
 *   - 공개 프로필 응답에 실명·생년월일·연락처·증명서 경로가 없다
 *   - 한쪽만 확인한 시점의 상태가 matched 가 아니다
 *   - 사후 응답 조회 경로가 존재하지 않는다
 *
 * 사용: node scripts/smoke-api.mjs [--keep]
 *   --keep  검증 후 계정을 지우지 않는다 (모바일 수동 확인용 시드로 재사용)
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = process.env.SMOKE_API_URL || 'http://localhost:3000/api';
const KEEP = process.argv.includes('--keep');

let passed = 0;
let failed = 0;

function check(label, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function loadEnv() {
  const text = await readFile(path.join(ROOT, 'apps', 'server', '.env.development'), 'utf8');
  const get = (key) => text.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim();
  return {
    url: get('SUPABASE_URL'),
    anonKey: get('SUPABASE_ANON_KEY'),
    secretKey: get('SUPABASE_SECRET_KEY'),
  };
}

/**
 * 테스트 계정은 공개 /auth/signup 이 아니라 service-role admin API 로 만든다.
 * 공개 가입 경로는 Supabase 자체 rate limit(시간당)이 걸려 있어서, 스모크를 몇 번만
 * 돌려도 429 로 막힌다 — 검증하려는 건 가입 경로가 아니라 도메인 흐름이다.
 * (가입 경로 자체는 로그인 화면 ADB 스모크에서 실제로 눌러 확인한다.)
 */
async function createTestUser(admin, email, password) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`admin createUser(${email}): ${error.message}`);
  return data.user.id;
}

async function signIn(anon, email, password) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn(${email}): ${error.message}`);
  return data.session.access_token;
}

class Client {
  constructor(name) {
    this.name = name;
    this.token = null;
    this.userId = null;
  }

  async call(method, endpoint, body) {
    const res = await fetch(`${API}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: res.status, data };
  }

  async expect(method, endpoint, body, label) {
    const res = await this.call(method, endpoint, body);
    if (res.status >= 400) {
      throw new Error(
        `${label} failed: ${method} ${endpoint} → ${res.status} ${JSON.stringify(res.data)}`
      );
    }
    return res.data;
  }
}

const PASSWORD = 'BootingSmoke123!';

async function main() {
  const { url, anonKey, secretKey } = await loadEnv();
  const stamp = Date.now();

  const admin = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anon = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const a = new Client('A');
  const b = new Client('B');

  console.log('\n[1] 계정 생성 + 자녀 인증');
  for (const [client, tag] of [
    [a, 'a'],
    [b, 'b'],
  ]) {
    const email = `booting.smoke.${tag}.${stamp}@smoke.booting.app`;
    client.email = email;
    client.userId = await createTestUser(admin, email, PASSWORD);
    client.token = await signIn(anon, email, PASSWORD);

    await client.expect(
      'POST',
      '/me/verification/phone',
      { phone: tag === 'a' ? '01012345678' : '01087654321', token: '123456' },
      `${client.name} phone`
    );
    await client.expect(
      'POST',
      '/me/verification/family',
      { storagePath: `${client.userId}/family.pdf` },
      `${client.name} family`
    );
  }
  const statusA = await a.expect('GET', '/me/verification', null, 'A verification');
  check('자녀 인증 2종 완료 → 프로필 작성 가능', statusA.canCreateProfile === true);
  check(
    'SEC: 인증 응답에 가족관계증명서 경로가 없다',
    !JSON.stringify(statusA).includes('family.pdf'),
    JSON.stringify(statusA)
  );
  check('연락처는 마스킹되어 내려온다', statusA.phoneMasked === '010-****-5678', statusA.phoneMasked);

  console.log('\n[2] 미인증 상태 가드 (별도 계정)');
  {
    const c = new Client('C');
    c.email = `booting.smoke.c.${stamp}@smoke.booting.app`;
    c.userId = await createTestUser(admin, c.email, PASSWORD);
    c.token = await signIn(anon, c.email, PASSWORD);
    const res = await c.call('POST', '/parent-profile', {
      displayName: '테스트',
      nickname: '테스트',
      gender: 'male',
      birthDate: '1960-01-01',
      regionCode: '11680',
      maritalStatus: 'bereaved',
      goals: ['serious'],
    });
    check('인증 없이 프로필 생성 시 403', res.status === 403, `status=${res.status}`);
    check(
      '에러 코드가 child_not_verified',
      res.data?.code === 'child_not_verified' || res.data?.message?.code === 'child_not_verified',
      JSON.stringify(res.data)
    );
    c.cleanupToken = c.token;
    smokeExtras.push(c);
  }

  console.log('\n[3] 부모님 프로필 등록');
  const profileA = await a.expect(
    'POST',
    '/parent-profile',
    {
      displayName: '김철수',
      nickname: '바둑한판',
      gender: 'male',
      birthDate: '1958-04-11',
      regionCode: '11680', // 서울 강남구
      maritalStatus: 'bereaved',
      maritalSince: '2019-03-01',
      goals: ['serious', 'meal_walk'],
    },
    'A create profile'
  );
  check('A 프로필 생성 status=draft', profileA.status === 'draft', profileA.status);
  check('나이는 생년월일에서 계산된다', profileA.age >= 60, String(profileA.age));

  const profileB = await b.expect(
    'POST',
    '/parent-profile',
    {
      displayName: '이영희',
      nickname: '텃밭지기',
      gender: 'female',
      birthDate: '1961-09-22',
      regionCode: '11710', // 서울 송파구
      maritalStatus: 'divorced',
      goals: ['serious'],
    },
    'B create profile'
  );

  console.log('\n[4] 도메인 규칙 거부');
  {
    const tooYoung = await a.call('PATCH', '/parent-profile', { regionCode: '99999' });
    check('없는 지역 코드 거부', tooYoung.status === 400, `status=${tooYoung.status}`);

    const tooManyGoals = await a.call('PATCH', '/parent-profile', {
      goals: ['serious', 'travel_hobby', 'meal_walk'],
    });
    check('관계 목적 3개 거부', tooManyGoals.status === 400, `status=${tooManyGoals.status}`);

    const undecidedMix = await a.call('PATCH', '/parent-profile', {
      goals: ['undecided', 'serious'],
    });
    check(
      "'아직 모르겠음' + 다른 목적 조합 거부",
      undecidedMix.status === 400,
      `status=${undecidedMix.status}`
    );

    const submitEarly = await a.call('POST', '/parent-profile/submit');
    check('동의 없이 제출 거부', submitEarly.status === 400, `status=${submitEarly.status}`);

    const tooShortNickname = await a.call('PATCH', '/parent-profile', { nickname: '김' });
    check('별명 1자 거부', tooShortNickname.status === 400, `status=${tooShortNickname.status}`);

    // 별명을 실명과 같게 두는 건 허용한다 — 밝힐지 말지는 본인 선택이고,
    // 서버가 보장하는 건 "실명 컬럼이 공개 응답에 안 실린다" 는 것뿐이다.
    // (실수 방지용 확인은 화면에서 한다)
    const sameAsRealName = await a.call('PATCH', '/parent-profile', { nickname: '김철수' });
    check('별명을 실명과 같게 두는 건 허용', sameAsRealName.status === 200, `status=${sameAsRealName.status}`);
    await a.expect('PATCH', '/parent-profile', { nickname: '바둑한판' }, 'A restore nickname');
  }

  console.log('\n[5] 프로필 내용 + 사진 + 동의 + 공개');
  const storage = (token) =>
    createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

  const pngBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );

  for (const [client, profile, intro] of [
    [a, profileA, '아버지는 조용한 산책과 바둑을 좋아하십니다.'],
    [b, profileB, '어머니는 텃밭 가꾸기와 트로트를 좋아하십니다.'],
  ]) {
    // 사진 최소 3장이 제출 조건이다
    for (let i = 0; i < 3; i += 1) {
      const objectPath = `${client.userId}/photo-${i + 1}.png`;
      const { error: uploadError } = await storage(client.token)
        .storage.from('parent-photos')
        .upload(objectPath, pngBytes, { contentType: 'image/png', upsert: true });
      if (uploadError) throw new Error(`${client.name} photo upload: ${uploadError.message}`);

      await client.expect(
        'POST',
        '/parent-profile/photos',
        { storagePath: objectPath, isPrimary: i === 0 },
        `${client.name} add photo ${i + 1}`
      );

      // 2장까지는 아직 부족해야 한다 (최소 3장)
      if (client === a && i === 1) {
        const partial = await a.expect('GET', '/parent-profile', null, 'A partial');
        check(
          '사진 2장이면 아직 제출 불가 (최소 3장)',
          partial.missing.includes('photos'),
          JSON.stringify(partial.missing)
        );
      }
    }
    await client.expect(
      'PATCH',
      '/parent-profile',
      {
        introByChild: intro,
        desiredPartner: '대화가 잘 통하는 분이면 좋겠습니다.',
        parentMessage: '건강하게 함께 걸을 수 있는 분을 찾습니다.',
        childrenCount: '2명',
        livingWith: '자녀와 거주',
        religion: '무교',
        heightCm: 172,
        occupation: '교사',
        drinking: '가끔',
        smoking: '비흡연',
        economicallyActive: false,
        hobbies: ['산책', '바둑'],
      },
      `${client.name} fill profile`
    );
    await client.expect(
      'POST',
      '/parent-profile/consent',
      { method: 'in_person', parentName: profile.displayName },
      `${client.name} consent`
    );
    const published = await client.expect(
      'POST',
      '/parent-profile/submit',
      null,
      `${client.name} submit`
    );
    check(
      `${client.name} 제출 → 검수 승인 → published`,
      published.status === 'published',
      published.status
    );
    check(`${client.name} 배지 4종 충족`, Object.values(published.badges).every(Boolean));
  }

  console.log('\n[6] 추천 + 반경 필터');
  await a.expect(
    'PUT',
    '/discovery/filters',
    { targetGender: 'female', radiusKm: 30, ageMin: 50, ageMax: 80 },
    'A save filter'
  );
  const feed = await a.expect('GET', '/discovery', null, 'A discovery');
  const found = feed.items.find((i) => i.profileId === profileB.id);
  check('추천에 상대 프로필이 뜬다', !!found, `items=${feed.items.length}`);
  check('별명으로 내려온다', found?.nickname === '텃밭지기', found?.nickname);
  check('시·군·구까지만 표기', found?.region === '서울 송파구', found?.region);
  check('강남↔송파 거리 계산', found?.distanceKm !== null && found?.distanceKm < 15, String(found?.distanceKm));
  check('대표 사진 서명 URL 발급', !!found?.primaryPhotoUrl?.startsWith('http'));

  const selfInFeed = feed.items.some((i) => i.profileId === profileA.id);
  check('내 프로필은 추천에 안 나온다', !selfInFeed);

  console.log('\n[7] SEC: 공개 프로필 응답에 원본 개인정보 부재');
  const detail = await a.expect('GET', `/profiles/${profileB.id}`, null, 'A view B');
  const raw = JSON.stringify(detail);
  check('SEC.1 실명 없음', !raw.includes('이영희'), raw.slice(0, 200));
  check('SEC.2 생년월일 없음', !raw.includes('1961-09-22'));
  check('SEC.3 연락처 없음', !raw.includes('01087654321'));
  check('SEC.3 증명서 경로 없음', !raw.includes('family.pdf'));
  check('상세에서만 보이는 자녀 수는 포함', detail.childrenCount === '2명', detail.childrenCount);
  check('자녀 수는 필터 항목에 없다', !('childrenCount' in (await a.expect('GET', '/discovery/filters', null, 'filters'))));

  console.log('\n[7.5] 동성 친구 규칙');
  {
    // A(남) 목적을 '동성 친구'로 바꾸면 이성(B)은 추천에서 사라져야 한다
    await a.expect('PATCH', '/parent-profile', { goals: ['same_sex_friend'] }, 'A → same_sex');
    const sameSexFeed = await a.expect('GET', '/discovery', null, 'A feed (same_sex)');
    check(
      '동성 친구 목적이면 이성 프로필이 안 나온다',
      !sameSexFeed.items.some((i) => i.profileId === profileB.id),
      `items=${sameSexFeed.items.length}`
    );

    // 목적을 되돌리면 다시 나온다
    await a.expect('PATCH', '/parent-profile', { goals: ['serious', 'meal_walk'] }, 'A restore');
    const normalFeed = await a.expect('GET', '/discovery', null, 'A feed (normal)');
    check(
      '목적을 되돌리면 이성 프로필이 다시 나온다',
      normalFeed.items.some((i) => i.profileId === profileB.id)
    );

    // 반대 방향: 목적이 '동성 친구' 하나뿐인 분은 이성 추천에서 빠진다
    await b.expect('PATCH', '/parent-profile', { goals: ['same_sex_friend'] }, 'B → same_sex only');
    const excluded = await a.expect('GET', '/discovery', null, 'A feed (B same_sex only)');
    check(
      "목적이 '동성 친구'뿐인 분은 이성에게 추천되지 않는다",
      !excluded.items.some((i) => i.profileId === profileB.id),
      `items=${excluded.items.length}`
    );

    await b.expect('PATCH', '/parent-profile', { goals: ['serious'] }, 'B restore');
  }

  console.log('\n[8] 하트 → 상호 하트 → 대화');
  const GREETING_A = '저희 어머니도 매일 오전 광교호수공원 산책 가십니다!';
  const GREETING_B = '아버님 소개글 잘 읽었습니다. 반갑습니다.';

  const heart1 = await a.expect(
    'POST',
    '/hearts',
    { targetProfileId: profileB.id, message: GREETING_A },
    'A heart B'
  );
  check('단방향 하트는 mutual=false', heart1.mutual === false && heart1.connectionId === null);

  const bReceived = await b.expect('GET', '/hearts/received', null, 'B received (greeting)');
  check(
    '받은 관심에 인사말이 함께 온다',
    bReceived.items.some((i) => i.message === GREETING_A),
    JSON.stringify(bReceived.items.map((i) => i.message))
  );

  const dupe = await a.call('POST', '/hearts', { targetProfileId: profileB.id });
  check('같은 상대에게 중복 하트 거부', dupe.status === 400, `status=${dupe.status}`);

  const heart2 = await b.expect(
    'POST',
    '/hearts',
    { targetProfileId: profileA.id, message: GREETING_B },
    'B heart A'
  );
  check('역방향 하트로 상호 하트 성립', heart2.mutual === true && !!heart2.connectionId);
  const connectionId = heart2.connectionId;

  // 인사말은 대화방 첫 메시지로 옮겨간다 — 빈 채팅방에서 말을 트는 부담을 없앤다
  {
    const carried = await a.expect(
      'GET',
      `/connections/${connectionId}/messages`,
      null,
      'A messages (carried)'
    );
    const bodies = carried.items.map((m) => m.body);
    check('보낸 인사말이 대화방에 남는다', bodies.includes(GREETING_A), JSON.stringify(bodies));
    check('상대 인사말도 대화방에 남는다', bodies.includes(GREETING_B));
    // items 는 최신순이라 먼저 보낸 A 의 인사말이 뒤에 온다
    check(
      '인사말은 보낸 순서를 지킨다',
      bodies.indexOf(GREETING_A) > bodies.indexOf(GREETING_B),
      JSON.stringify(bodies)
    );
  }

  // 인연이 되면 그 관계는 '인연' 탭으로 옮겨간다 — 받은 관심에 남아 있으면
  // 이미 대화 중인 사람에게 아직 답할 게 남은 것처럼 보인다
  const received = await b.expect('GET', '/hearts/received', null, 'B received');
  check(
    '인연이 된 상대는 받은 관심에서 빠진다',
    !received.items.some((i) => i.profile.profileId === profileA.id),
    JSON.stringify(received.items.map((i) => i.profile.nickname))
  );
  const unread = await b.expect('GET', '/hearts/unread-count', null, 'B unread');
  check('받은 관심 배지도 같이 빠진다', unread.count === 0, `count=${unread.count}`);

  const connections = await a.expect('GET', '/connections', null, 'A connections');
  const conn = connections.find((c) => c.id === connectionId);
  // 양쪽이 인사말을 주고받았으므로 이미 대화가 오간 상태다.
  // (인사말 없이 하트만 오간 경우에는 mutual_heart 에 머문다)
  check('양쪽 인사말이 오갔으면 chatting', conn?.status === 'chatting', conn?.status);
  check(
    'SEC.4 인연 목록에도 실명이 없다',
    !JSON.stringify(connections).includes('이영희')
  );

  await a.expect('POST', `/connections/${connectionId}/messages`, { body: '안녕하세요, 연락 주셔서 감사합니다.' }, 'A message');
  await b.expect('POST', `/connections/${connectionId}/messages`, { body: '네, 반갑습니다.' }, 'B message');
  const messages = await a.expect('GET', `/connections/${connectionId}/messages`, null, 'A messages');
  // 인사말 2건이 먼저 들어가 있으므로 총 4건
  check('인사말 2 + 대화 2 = 4건', messages.items.length === 4, String(messages.items.length));
  const afterChat = await a.expect('GET', `/connections/${connectionId}`, null, 'A conn');
  check("첫 메시지 후 상태는 'chatting'", afterChat.status === 'chatting', afterChat.status);

  console.log('\n[9] IDOR 방어');
  {
    const c = smokeExtras[0];
    const res = await c.call('GET', `/connections/${connectionId}/messages`);
    check('제3자는 남의 대화를 못 읽는다 (404)', res.status === 404, `status=${res.status}`);
    const peek = await c.call('GET', `/connections/${connectionId}`);
    check('제3자는 인연 존재 여부도 알 수 없다', peek.status === 404, `status=${peek.status}`);
  }

  console.log('\n[10] 부모님 의사 → 매칭 (양측이 있어야만 성립)');
  const early = await a.call('POST', `/connections/${connectionId}/meeting`, {
    meetAt: new Date(Date.now() - 3600_000).toISOString(),
    place: '카페',
    childAccompanied: true,
  });
  check('의사 확인 전 일정 제안 거부', early.status === 400, `status=${early.status}`);

  const oneIntent = await a.expect(
    'POST',
    `/connections/${connectionId}/parent-intent`,
    { intent: 'willing' },
    'A intent'
  );
  check("한쪽 의사만으로는 'parent_intent'", oneIntent.status === 'parent_intent', oneIntent.status);
  check('한쪽 의사 시점에 matched 가 아니다', oneIntent.status !== 'matched');

  const afterIntent = await b.expect(
    'POST',
    `/connections/${connectionId}/parent-intent`,
    { intent: 'willing' },
    'B intent'
  );
  check('양측 의사 확인 → matched', afterIntent.status === 'matched', afterIntent.status);

  console.log('\n[11] 만남 일정 — 매칭 이후 기록용');
  const soloBad = await a.call('POST', `/connections/${connectionId}/meeting`, {
    meetAt: new Date(Date.now() - 3600_000).toISOString(),
    place: '분당 카페',
    childAccompanied: false,
  });
  check('자녀 미동행인데 사유·안전수칙 없으면 거부', soloBad.status === 400, `status=${soloBad.status}`);

  const meeting = await a.expect(
    'POST',
    `/connections/${connectionId}/meeting`,
    {
      meetAt: new Date(Date.now() - 3600_000).toISOString(),
      place: '송파구 롯데월드타워 1층 카페',
      childAccompanied: true,
    },
    'A propose meeting'
  );
  check('일정 제안 status=proposed', meeting.status === 'proposed', meeting.status);

  const tooEarly = await a.call('POST', `/connections/${connectionId}/meeting/confirm`);
  check('수락 전 확인 거부', tooEarly.status === 400, `status=${tooEarly.status}`);

  const accepted = await b.expect('POST', `/connections/${connectionId}/meeting/accept`, null, 'B accept');
  check('상대 수락 → accepted', accepted.status === 'accepted', accepted.status);

  // 매칭은 이미 성립했다. 일정 API 를 어떻게 부르든 그 상태를 되돌리지 않는다 —
  // '매칭 성공'을 본 사용자에게 그게 취소된 것처럼 보이면 안 된다.
  const confirm1 = await a.expect('POST', `/connections/${connectionId}/meeting/confirm`, null, 'A confirm');
  check(
    '한쪽 확인으로 만남은 confirm_pending',
    confirm1.meeting.status === 'confirm_pending',
    confirm1.meeting.status
  );
  check('매칭 상태는 되돌아가지 않는다', confirm1.connectionStatus === 'matched', confirm1.connectionStatus);

  const dupeConfirm = await a.call('POST', `/connections/${connectionId}/meeting/confirm`);
  check('같은 사람의 중복 확인 거부', dupeConfirm.status === 400, `status=${dupeConfirm.status}`);

  const confirm2 = await b.expect('POST', `/connections/${connectionId}/meeting/confirm`, null, 'B confirm');
  check('만남 status=completed', confirm2.meeting.status === 'completed', confirm2.meeting.status);
  check('여전히 matched', confirm2.connectionStatus === 'matched', confirm2.connectionStatus);

  console.log('\n[12] 사후 응답 비공개');
  const fb = await a.call('POST', `/connections/${connectionId}/meeting/feedback`, { response: 'continue' });
  check('사후 응답 저장 204', fb.status === 204, `status=${fb.status}`);
  await b.expect('POST', `/connections/${connectionId}/meeting/feedback`, { response: 'thinking' }, 'B feedback');

  const meetingSeenByA = await a.expect('GET', `/connections/${connectionId}/meeting`, null, 'A meeting');
  check('내 사후 응답만 보인다', meetingSeenByA.myFeedback === 'continue', meetingSeenByA.myFeedback);
  check(
    'S20.3 상대 사후 응답은 어디에도 없다',
    !JSON.stringify(meetingSeenByA).includes('thinking'),
    JSON.stringify(meetingSeenByA)
  );
  const feedbackGet = await a.call('GET', `/connections/${connectionId}/meeting/feedback`);
  check('사후 응답 조회 경로가 없다 (404)', feedbackGet.status === 404, `status=${feedbackGet.status}`);

  console.log('\n[13] 신고 · 차단');
  const report = await a.expect(
    'POST',
    '/reports',
    { targetProfileId: profileB.id, reason: 'safety_concern', detail: '스모크 테스트' },
    'A report'
  );
  check('신고 접수', report.status === 'pending');
  check('신고 이력에도 별명', report.targetNickname === '텃밭지기', report.targetNickname);

  const block = await a.expect('POST', '/blocks', { targetProfileId: profileB.id }, 'A block');
  check('차단 등록', !!block.id);
  const afterBlock = await a.expect('GET', `/connections/${connectionId}`, null, 'A conn after block');
  check('차단하면 인연도 종료된다', afterBlock.status === 'ended', afterBlock.status);
  const blockedDetail = await a.call('GET', `/profiles/${profileB.id}`);
  check('차단한 상대 프로필 접근 403', blockedDetail.status === 403, `status=${blockedDetail.status}`);

  console.log('\n[14] 동의 철회 → 즉시 비공개');
  const revoked = await b.expect('POST', '/parent-profile/consent/revoke', null, 'B revoke');
  check('철회 시 프로필 hidden', revoked.status === 'hidden', revoked.status);
  const republish = await b.call('POST', '/parent-profile/visibility', { visible: true });
  check('동의 없이 재공개 거부', republish.status === 400, `status=${republish.status}`);

  console.log('\n[15] 유지보수 규칙');
  {
    const { data, error } = await admin.rpc('run_maintenance');
    check('run_maintenance 실행', !error, error?.message);
    check('advisory lock 결과 반환', data && data.skipped === false, JSON.stringify(data));
  }

  if (!KEEP) {
    console.log('\n[정리] 테스트 계정 삭제');
    for (const client of [a, b, ...smokeExtras]) {
      if (client.userId) await admin.auth.admin.deleteUser(client.userId);
    }
  } else {
    console.log('\n[정리] --keep 지정 — 계정 유지 (모바일 수동 확인용)');
    console.log(`  A: ${a.email} / ${PASSWORD}`);
    console.log(`  B: ${b.email} / ${PASSWORD}`);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`통과 ${passed} · 실패 ${failed}`);
  console.log('='.repeat(50));
  if (failed > 0) process.exit(1);
}

const smokeExtras = [];

main().catch((err) => {
  console.error(`\nSMOKE ABORTED: ${err.message}`);
  process.exit(1);
});
