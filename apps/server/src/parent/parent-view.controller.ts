import { Controller, Get, Header, Param, Post } from '@nestjs/common';

import { ConnectionsService } from '../connections/connections.service';
import { PublicProfileDto } from '../discovery/dto/discovery.dto';
import { ParentInboxItemDto } from './dto/parent.dto';
import { ParentService } from './parent.service';

/**
 * 부모님이 카카오톡 카드를 눌러 도착하는 자리 — **프로필을 여기서 보여 드린다.**
 *
 * 앱이 아니라 웹인 이유는 동의 페이지와 같다: 부모님은 이 앱을 설치하지 않으신다.
 * PRD 상 부모님의 디지털 접점은 **동의 하나**이고, 프로필은 자녀가 보여 드리는
 * 것으로 돼 있다(`prd.md` 4.3, 9장). 앱 설치와 8자리 코드를 요구하면 이 서비스의
 * 마지막 한 걸음에서 대부분이 멈춘다.
 *
 * 신원은 링크의 서명이 대신한다. 토큰이 곧 열쇠라 추측할 수 없고, 대화방에 남는
 * 주소라 만료가 있다 (`ConnectionsService.parentViewToken`).
 *
 * **버튼을 두지 않는다.** 부모님의 의사는 자녀가 직접 여쭤보는 것이 PRD 의 흐름이고
 * (`prd.md`: "각 자녀가 상대 프로필을 부모님에게 보여주고 만남 의사를 확인한다"),
 * 링크를 받은 사람이 곧 부모님이라는 보장이 없는 자리에서 "대화해보고 싶어요" 를
 * 눌리게 하면 그 결정의 주인이 흐려진다. 여기는 보여 드리는 데까지만 한다.
 */
@Controller('p')
export class ParentViewController {
  constructor(
    private readonly connections: ConnectionsService,
    private readonly parent: ParentService
  ) {}

  /**
   * 어떤 경우에도 200 과 사람이 읽을 문장을 돌려준다.
   *
   * 상태 코드로 알려 주면 이 주소에 값을 넣어 보며 무엇이 살아 있는지 셀 수 있고,
   * 브라우저가 오류 화면을 대신 그리면 부모님은 무엇을 하셔야 하는지 알 수 없다.
   */
  @Get(':token')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async page(@Param('token') token: string): Promise<string> {
    return this.detail(token, null);
  }

  /** 목록에서 고른 다른 프로필 */
  @Get(':token/c/:connectionId')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async other(
    @Param('token') token: string,
    @Param('connectionId') connectionId: string
  ): Promise<string> {
    return this.detail(token, connectionId);
  }

  /** 자녀분이 지금까지 보내드린 프로필 전부 */
  @Get(':token/all')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async all(@Param('token') token: string): Promise<string> {
    const claim = this.connections.verifyParentViewToken(token);
    if (!claim) return expiredNotice();

    const items = await this.parent.webInbox(claim.connectionId, claim.userId);
    return listPage(token, items);
  }

  @Post(':token/c/:connectionId/interest')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async interest(
    @Param('token') token: string,
    @Param('connectionId') connectionId: string
  ): Promise<string> {
    const claim = this.connections.verifyParentViewToken(token);
    if (!claim) return expiredNotice();

    const result = await this.parent.webExpress(claim.connectionId, claim.userId, connectionId);
    if (!result) {
      return notice(
        '지금은 처리할 수 없습니다',
        '인연이 이미 정리되었을 수 있습니다. 자녀분께 확인해 보세요.',
        token
      );
    }

    /**
     * 양쪽 부모님이 모두 누르셨을 때만 연락처가 열린다. 한쪽만 누르셨을 때
     * "상대가 아직입니다" 라고 알리지 않는다 — 거절이 드러나지 않아야 두 분 다
     * 편하게 결정하신다 (앱과 같은 규칙).
     */
    if (result.matched && result.partnerPhone) {
      return notice(
        '연락처를 전해드립니다',
        `${result.partnerNickname ?? result.partnerName ?? '상대분'} · ${result.partnerPhone}\n\n두 분 모두 대화를 원하셨습니다. 편하실 때 연락해 보세요.`,
        token
      );
    }
    return notice(
      '마음을 전해드렸습니다',
      '상대분도 원하시면 그때 연락처를 알려드립니다. 자녀분께도 알려두시면 좋습니다.',
      token
    );
  }

  /**
   * 거절은 **되돌릴 수 없다** — 인연이 끝나고 자녀 화면에서도 사라진다.
   * 그래서 누르는 즉시 지우지 않고 한 번 여쭙는다. 앱도 같은 규칙이다.
   */
  @Get(':token/c/:connectionId/decline')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async declineConfirm(
    @Param('token') token: string,
    @Param('connectionId') connectionId: string
  ): Promise<string> {
    const claim = this.connections.verifyParentViewToken(token);
    if (!claim) return expiredNotice();

    const profile = await this.parent.webShareViewByConnection(
      claim.connectionId,
      claim.userId,
      connectionId
    );
    if (!profile) return notice('지금은 처리할 수 없습니다', '자녀분께 확인해 보세요.', token);

    return shell(
      '부팅 · 확인',
      `<div class="lead">
         <h1>${esc(profile.nickname)} 님을<br>목록에서 지울까요?</h1>
         <p class="sub">한 번 지우시면 되돌릴 수 없습니다. 이 프로필은 자녀분 화면에서도 사라지고, 다시 보실 수 없습니다.</p>
       </div>
       <div class="actions">
         <form method="post" action="/p/${esc(token)}/c/${esc(connectionId)}/decline">
           <button class="button danger" type="submit">네, 지우겠습니다</button>
         </form>
         <a class="button ghost" href="/p/${esc(token)}/c/${esc(connectionId)}">아니요, 그대로 둘게요</a>
       </div>`
    );
  }

  @Post(':token/c/:connectionId/decline')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async decline(
    @Param('token') token: string,
    @Param('connectionId') connectionId: string
  ): Promise<string> {
    const claim = this.connections.verifyParentViewToken(token);
    if (!claim) return expiredNotice();

    const ok = await this.parent.webDecline(claim.connectionId, claim.userId, connectionId);
    return ok
      ? notice('알겠습니다', '이 프로필은 더 보여드리지 않겠습니다.', token)
      : notice('지금은 처리할 수 없습니다', '자녀분께 확인해 보세요.', token);
  }

  private async detail(token: string, connectionId: string | null): Promise<string> {
    const claim = this.connections.verifyParentViewToken(token);
    if (!claim) return expiredNotice();

    const target = connectionId ?? claim.connectionId;
    const profile = await this.parent.webShareViewByConnection(
      claim.connectionId,
      claim.userId,
      target
    );
    if (!profile) {
      return notice(
        '지금은 볼 수 없는 프로필입니다',
        '상대분이 프로필 공개를 멈추셨거나 인연이 정리되었습니다. 자녀분께 확인해 보세요.',
        token
      );
    }

    const shared = await this.parent.webInbox(claim.connectionId, claim.userId);
    const state = shared.find((item) => item.connectionId === target) ?? null;
    return profilePage(profile, token, target, shared.length, state);
  }
}

// --- 표기 --------------------------------------------------------------------
// 앱과 같은 말을 쓴다. 부모님과 자녀가 서로 다른 낱말로 같은 사람을 이야기하면
// 통화 한 번이 더 든다.

const MARITAL_LABEL: Record<string, string> = { bereaved: '사별', divorced: '이혼' };

const GOAL_LABEL: Record<string, string> = {
  remarriage: '재혼',
  serious: '진지한 만남',
  travel_hobby: '여행·취미 친구',
  same_sex_friend: '동성 친구',
  meal_walk: '식사·산책 친구',
  undecided: '아직 모르겠음',
};

function esc(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string
  );
}

/** 줄바꿈을 살려서 문단으로 — 자녀가 눌러 쓴 줄이 한 덩어리로 뭉치지 않게 한다 */
function paragraphs(text: string): string {
  return esc(text)
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// --- 스타일 ------------------------------------------------------------------
// 부모님이 읽으신다. 본문 19px, 제목 26px, 줄간격 1.7 — 동의 페이지와 같은 규칙이다.

const STYLE = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0 0 56px;
    font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
    background: #F0FDFA; color: #0F172A;
    font-size: 19px; line-height: 1.7;
  }
  .wrap { max-width: 480px; margin: 0 auto; }
  .lead { padding: 28px 20px 20px; text-align: center; }
  .lead .from { color: #0D9488; font-weight: 700; margin: 0 0 6px; }
  h1 { font-size: 28px; line-height: 1.4; margin: 0; }
  .sub { color: #334155; margin: 6px 0 0; }

  .photos { display: flex; gap: 8px; overflow-x: auto; padding: 4px 20px 8px; scroll-snap-type: x mandatory; }
  .photos img {
    width: 84%; flex: 0 0 auto; aspect-ratio: 1 / 1; object-fit: cover;
    border-radius: 18px; background: #E2E8F0; scroll-snap-align: center;
  }
  .photos.one img { width: 100%; }

  .chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; padding: 12px 20px 0; }
  .chip {
    background: #CCFBF1; color: #0F766E; border-radius: 999px;
    padding: 6px 14px; font-size: 17px; font-weight: 600;
  }
  .consent {
    display: block; text-align: center; color: #0D9488;
    font-size: 17px; font-weight: 600; margin-top: 12px;
  }

  section {
    background: #fff; border: 1px solid #CCFBF1; border-radius: 18px;
    padding: 20px; margin: 20px 20px 0;
  }
  h2 { font-size: 19px; margin: 0 0 10px; color: #0D9488; }
  section p { margin: 0 0 12px; }
  section p:last-child { margin-bottom: 0; }

  dl { margin: 0; display: grid; grid-template-columns: 7.5em 1fr; row-gap: 10px; column-gap: 12px; }
  dt { color: #64748B; }
  dd { margin: 0; }

  .closing {
    margin: 28px 20px 12px; padding: 0 20px;
    color: #0F766E; text-align: center; font-weight: 700; font-size: 21px;
  }
  .quiet { color: #64748B; font-size: 16px; text-align: center; margin: 20px 20px 0; }

  /* 버튼은 크게. 손이 떨리셔도 눌리는 크기가 먼저다 */
  .actions { padding: 0 20px; display: grid; gap: 10px; }
  .actions form { margin: 0; }
  .button {
    display: block; width: 100%; text-align: center; text-decoration: none;
    border: 0; border-radius: 14px; padding: 18px;
    background: #14B8A6; color: #fff; font-size: 20px; font-weight: 700;
    font-family: inherit; cursor: pointer;
  }
  .button.ghost { background: #fff; color: #0F766E; border: 1px solid #99F6E4; }
  .button.danger { background: #DC2626; }

  /* 마음이 통한 자리 — 여기서는 연락처가 주인공이다 */
  .matched-box {
    margin: 28px 20px 0; padding: 22px 20px; border-radius: 18px;
    background: #CCFBF1; color: #0F766E; text-align: center;
    display: grid; gap: 8px;
  }
  .matched-box strong { font-size: 21px; }
  .matched-box span { color: #0F766E; font-size: 17px; }
  .matched-box .phone {
    font-size: 28px; font-weight: 800; letter-spacing: 1px;
    color: #0F766E; text-decoration: none;
  }
  .matched-box.waiting { background: #F1F5F9; color: #475569; }
  .matched-box.waiting strong { color: #334155; }
  .matched-box.waiting span { color: #64748B; }

  .cards { display: grid; gap: 12px; padding: 4px 20px 0; }
  .card {
    display: flex; gap: 14px; align-items: center; text-decoration: none; color: inherit;
    background: #fff; border: 1px solid #CCFBF1; border-radius: 18px; padding: 14px;
  }
  .card img {
    width: 84px; height: 84px; flex: 0 0 auto;
    border-radius: 14px; object-fit: cover; background: #E2E8F0;
  }
  .card-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .card-body strong { font-size: 20px; }
  .card-sub { color: #64748B; font-size: 17px; }
  .state { font-size: 16px; color: #0D9488; font-weight: 600; margin-top: 2px; }
  .state.new { color: #0F766E; }
  .state.matched { color: #B45309; }
`;

function shell(title: string, body: string): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title><style>${STYLE}</style></head>
<body><div class="wrap">${body}</div></body></html>`;
}

function notice(title: string, body: string, token?: string): string {
  const back = token
    ? `<div class="actions"><a class="button ghost" href="/p/${esc(token)}/all">받으신 프로필 모두 보기</a></div>`
    : '';
  return shell(
    '부팅',
    `<div class="lead"><h1>${esc(title)}</h1><p class="sub">${esc(body).replace(/\n/g, '<br>')}</p></div>${back}`
  );
}

function expiredNotice(): string {
  return notice(
    '링크가 만료되었습니다',
    '보안을 위해 링크는 일정 기간이 지나면 닫힙니다. 자녀분께 다시 보내 달라고 말씀해 주세요.'
  );
}

/**
 * 자녀분이 보내드린 프로필 목록.
 *
 * 앱의 부모님 홈과 같은 자리다. 링크 하나로 지난 프로필까지 닿게 하려고 둔다 —
 * 없으면 부모님이 새 프로필을 받을 때마다 지난 카톡을 뒤지셔야 한다.
 */
function listPage(token: string, items: ParentInboxItemDto[]): string {
  if (!items.length) {
    return notice(
      '아직 받으신 프로필이 없습니다',
      '자녀분이 프로필을 보내드리면 여기에 쌓입니다.'
    );
  }

  const cards = items
    .map((item) => {
      const p = item.profile;
      const marital = MARITAL_LABEL[p.maritalStatus] ?? '';
      const state = item.matched
        ? '<span class="state matched">연락처가 열렸습니다</span>'
        : item.interested
          ? '<span class="state">대화해보고 싶다고 전해드렸습니다</span>'
          : item.unseen
            ? '<span class="state new">새로 받으신 프로필</span>'
            : '';
      return `<a class="card" href="/p/${esc(token)}/c/${esc(item.connectionId)}">
        <img src="${esc(p.primaryPhotoUrl ?? '')}" alt="">
        <div class="card-body">
          <strong>${esc(p.nickname)} · ${p.age}세</strong>
          <span class="card-sub">${esc([p.region, marital].filter(Boolean).join(' · '))}</span>
          ${state}
        </div>
      </a>`;
    })
    .join('');

  return shell(
    '부팅 · 받으신 프로필',
    `<div class="lead">
       <p class="from">자녀분이 보내드린 프로필</p>
       <h1>${items.length}분을 보내드렸습니다</h1>
     </div>
     <div class="cards">${cards}</div>
     <p class="quiet">실명·생년월일·연락처·정확한 주소는 공개되지 않습니다.</p>`
  );
}

/**
 * 상세 아래의 결정 자리.
 *
 * 이미 마음이 통한 분께 다시 "대화해보고 싶으신가요?" 를 묻지 않는다 — 끝난
 * 질문을 계속 내밀면 부모님은 자기가 뭘 잘못 눌렀나 하신다. 그 자리에는 결과와
 * 연락처만 둔다.
 */
function decisionBlock(
  p: PublicProfileDto,
  token: string,
  connectionId: string,
  state: ParentInboxItemDto | null
): string {
  if (state?.matched && state.partnerPhone) {
    return `<div class="matched-box">
      <strong>${esc(p.nickname)} 님과 마음이 통했습니다</strong>
      <a class="phone" href="tel:${esc(state.partnerPhone)}">${esc(state.partnerPhone)}</a>
      <span>편하실 때 연락해 보세요.</span>
    </div>`;
  }

  if (state?.interested) {
    return `<div class="matched-box waiting">
      <strong>대화해보고 싶다고 전해드렸습니다</strong>
      <span>상대분도 원하시면 그때 연락처를 알려드립니다.</span>
    </div>`;
  }

  return `<div class="closing">이 분과 대화해보고 싶으신가요?</div>
    <div class="actions">
      <form method="post" action="/p/${esc(token)}/c/${esc(connectionId)}/interest">
        <button class="button" type="submit">대화해보고 싶어요</button>
      </form>
      <a class="button ghost" href="/p/${esc(token)}/c/${esc(connectionId)}/decline">아니요, 괜찮습니다</a>
    </div>`;
}

function profilePage(
  p: PublicProfileDto,
  token: string,
  connectionId: string,
  totalShared: number,
  state: ParentInboxItemDto | null
): string {
  const marital = MARITAL_LABEL[p.maritalStatus] ?? '';
  const goals = (p.goals ?? []).map((g) => GOAL_LABEL[g]).filter(Boolean);

  const photos = p.photoUrls?.length ? p.photoUrls : [p.primaryPhotoUrl].filter(Boolean);
  const gallery = photos.length
    ? `<div class="photos${photos.length === 1 ? ' one' : ''}">${photos
        .map((url) => `<img src="${esc(url)}" alt="">`)
        .join('')}</div>`
    : '';

  /**
   * 생활 정보는 **채워진 것만** 줄로 만든다. 빈 항목까지 늘어놓으면 읽을 것이
   * 두 배가 되고, 정작 무엇을 아는지가 흐려진다.
   */
  const facts: [string, string | null][] = [
    ['사는 곳', p.region || null],
    ['혼인 상태', marital || null],
    ['키', p.heightCm ? `${p.heightCm}cm` : null],
    ['자녀', p.childrenCount],
    ['함께 사는 가족', p.livingWith],
    ['직업', p.occupation ?? p.retiredOccupation],
    [
      '경제 활동',
      p.economicallyActive === null ? null : p.economicallyActive ? '경제활동중' : '은퇴하셨음',
    ],
    ['종교', p.religion],
    ['음주', p.drinking],
    ['흡연', p.smoking],
    ['취미', p.hobbies?.length ? p.hobbies.join(', ') : null],
  ];
  const factRows = facts
    .filter(([, v]) => !!v)
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v as string)}</dd>`)
    .join('');

  const blocks = [
    gallery,
    goals.length
      ? `<div class="chips">${goals.map((g) => `<span class="chip">${esc(g)}</span>`).join('')}</div>`
      : '',
    p.badges?.consent ? '<span class="consent">✓ 부모님 동의를 받은 프로필입니다</span>' : '',
    p.introByChild
      ? `<section><h2>자녀분이 소개한 글</h2>${paragraphs(p.introByChild)}</section>`
      : '',
    p.parentMessage
      ? `<section><h2>본인이 전하는 말</h2>${paragraphs(p.parentMessage)}</section>`
      : '',
    p.desiredPartner
      ? `<section><h2>만나고 싶은 분</h2>${paragraphs(p.desiredPartner)}</section>`
      : '',
    factRows ? `<section><h2>알아두실 것</h2><dl>${factRows}</dl></section>` : '',
  ]
    .filter(Boolean)
    .join('');

  return shell(
    `부팅 · ${p.nickname} 님`,
    `<div class="lead">
       <p class="from">자녀분이 보내드린 프로필</p>
       <h1>${esc(p.nickname)} 님 · ${p.age}세</h1>
       ${marital || p.region ? `<p class="sub">${esc([p.region, marital].filter(Boolean).join(' · '))}</p>` : ''}
     </div>
     ${blocks}
     ${decisionBlock(p, token, connectionId, state)}
     <div class="actions">
       ${
         totalShared
           ? `<a class="button ghost" href="/p/${esc(token)}/all">받으신 프로필 모두 보기 (${totalShared})</a>`
           : ''
       }
     </div>
     <p class="quiet">${
       state?.matched
         ? '연락처는 두 분이 모두 원하셨기에 전해드렸습니다.'
         : '두 분이 모두 원하실 때만 연락처가 전해집니다.'
     }<br>실명·생년월일·정확한 주소는 공개되지 않습니다.</p>`
  );
}
