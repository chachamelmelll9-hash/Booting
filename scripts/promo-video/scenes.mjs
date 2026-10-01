// scenes.mjs - the single source of truth for the promo film.
//
// Each scene carries three things:
//   - what is said    (narration -> narrate.mjs -> audio/<id>.mp3)
//   - what is written (caption text -> film.html)
//   - what is done    (pre/actions -> record.mjs drives the REAL app on the
//                      emulator while the emulator records its own display)
//
// A scene lasts as long as its narration plus `tail` seconds. Action times
// (`at`) are seconds from the start of the scene; a negative `at` counts back
// from the end of the scene, so an action can land on the last word.
//
// Coordinates are device pixels (1080x2400) - get them with
//   .\shot.ps1 -Name x -Dump

export const VOICE = 'ko-KR-SunHiNeural';
export const RATE = '+6%';

const GEM = [538, 803]; // which face-down card s4 reveals
const TAB = { home: [135, 2299], hearts: [405, 2299], match: [675, 2299] };

export const SCENES = [
  { id: 's1', kind: 'type', align: 'left', tail: 0.5,
    narration: '어머니가 혼자 되신 지 삼 년. 좋은 분을 만나셨으면 좋겠는데, 방법을 모르겠습니다.',
    eyebrow: '부모님의 다음 인연',
    head: '어머니가<br>혼자 되신 지<br><b class="hl">3년.</b>',
    sub: '좋은 분 계시면 좋겠는데,<br>어떻게 해드려야 할지 모르겠습니다.' },

  { id: 's2', kind: 'type', align: 'left', tail: 0.4, headSm: true,
    narration: '앱을 깔아 드려도, 가입부터 사진 등록까지 어머니께는 너무 멉니다.',
    head: '그런데 정작<br><b class="dim">어머니껜</b><br><b class="dim">앱이 너무 멉니다.</b>',
    chips: ['회원가입', '사진 등록', '작은 글씨', '낯선 화면'] },

  { id: 's3', kind: 'type', align: 'center', logo: true, tail: 0.5,
    narration: '그래서 부팅은, 자녀가 대신 찾아 드립니다.',
    head: '그래서<br><b class="hl">자녀가 대신합니다.</b>',
    sub: '찾는 건 자녀가, 정하는 건 부모님이.' },

  { id: 's4', kind: 'phone', tail: 0.6,
    narration: '매일 여섯 분의 추천이 도착합니다. 카드를 열면 나이와 지역, 사주 궁합까지 한눈에 보입니다.',
    step: '01 · 매일 도착', cap: '매일 <b class="hl">6장</b>의 추천',
    capSub: '나이 · 지역 · 사주 궁합까지 한눈에',
    // ONE-SHOT: a gem card can be revealed once a day. GEM must be a card that is
    // still face-down - change it for a retake.
    pre: [{ app: true }, { tap: TAB.home, wait: 1.5 }],
    actions: [
      { at: 2.0, tap: GEM },                   // the flip takes ~2.5s
    ] },

  { id: 's5', kind: 'phone', tail: 0.6, skip: 0.7,
    narration: '프로필에는 자녀가 직접 쓴 부모님 소개가 담겨 있습니다. 마음에 들면 관심을 보냅니다.',
    step: '02 · 사람을 봅니다', cap: '<b class="hl">자녀가 쓴 소개</b>로<br>부모님을 만납니다',
    capSub: '취미 · 생활 · 만나고 싶은 분까지',
    // Continues from s4 (card open). The profile is opened BEFORE recording and
    // given time: its photos take ~3s to appear and an empty photo area at the
    // top of the scene reads as a broken app.
    // The last tap only opens the "관심 보내기" sheet - nothing is sent.
    pre: [{ tap: [540, 1777], wait: 6 }],      // "전체 프로필 보기"
    actions: [
      { at: 1.0, swipe: [540, 1750, 540, 900, 1400] },
      { at: 3.3, swipe: [540, 1750, 540, 800, 1300] },
      { at: -1.9, tap: [540, 2138] },          // "관심 보내기"
    ] },

  { id: 's6', kind: 'phone', tail: 0.6,
    narration: '서로 관심이 닿으면, 먼저 자녀끼리 대화를 나눕니다.',
    step: '03 · 자녀끼리 먼저', cap: '먼저 <b class="hl">자녀끼리</b><br>이야기를 나눕니다',
    capSub: '아직 부모님께 알려드리기 전입니다',
    // Starts on the "대화 연결" screen the app shows right after a mutual match.
    // Getting there is manual and one-shot per person: from the s5 sheet tap
    // "관심만 보내기" for someone who already sent interest, and wait ~6s for the
    // screen to load (the send itself is too slow to keep in the scene).
    actions: [
      { at: 2.6, tap: [540, 2138] },           // "대화 시작하기"
    ] },

  { id: 's7', kind: 'phone', tail: 0.5,
    narration: '괜찮은 분이다 싶으면, 카카오톡으로 부모님께 보내 드립니다.',
    step: '04 · 부모님께', cap: '괜찮다 싶으면<br><b class="hl">카톡으로 보내드립니다</b>',
    capSub: '버튼 하나로 프로필 카드가 전해집니다',
    pre: [{ app: true }, { tap: TAB.match, wait: 1.5 }],
    actions: [
      { at: -1.0, tap: [926, 540] },           // "부모님께" pill
    ],
    // KakaoTalk takes over the screen right after the tap; hold the last app frame.
    // The app is stopped afterwards so the dev fallback does not record a share.
    freezeAfterLastAction: 0.45,
    post: [{ stop: 'com.booting.app' }, { stop: 'com.kakao.talk' }] },

  { id: 's8', kind: 'phone', tail: 0.6, parent: true,
    narration: '부모님은 설치도 가입도 필요 없습니다. 큰 글씨 화면에서 버튼 하나로 정하십니다.',
    step: '05 · 부모님의 화면', cap: '정하시는 분은<br><b class="hl">부모님입니다</b>',
    capSub: '설치도 가입도 없이, 큰 글씨로',
    pre: [{ parentWeb: 'parent_intent', wait: 7 }],
    actions: [
      { at: 1.6, swipe: [540, 1800, 540, 600, 1300] },
      { at: 3.4, swipe: [540, 1800, 540, 500, 1200] },
      { at: 5.0, swipe: [540, 1800, 540, 500, 1200] },
      { at: 6.4, swipe: [540, 1800, 540, 500, 1200] },
    ] },

  { id: 's9', kind: 'phone', tail: 0.7, parent: true,
    narration: '두 분 모두 원하실 때에만, 연락처가 열립니다.',
    step: '06 · 두 분이 맞을 때', cap: '두 분 <b class="hl">모두 원하실 때만</b><br>연락처가 열립니다',
    capSub: '그전까지 실명도 번호도 공개되지 않습니다',
    pre: [{ parentWeb: 'matched', wait: 7 }],
    // short swipes fling: three of them reach the contact box at the bottom
    actions: [
      { at: 0.4, swipe: [540, 1800, 540, 500, 500] },
      { at: 1.4, swipe: [540, 1800, 540, 500, 500] },
      { at: 2.4, swipe: [540, 1800, 540, 500, 500] },
    ] },

  { id: 's10', kind: 'type', align: 'center', logo: true, cta: true, tail: 1.2,
    narration: '부모님의 다음 인연, 자녀의 손으로. 부팅.',
    head: '부모님의 다음 인연,<br><b class="hl">자녀의 손으로.</b>',
    sub: '사별·이혼하신 부모님을 위한 매칭' },
];
