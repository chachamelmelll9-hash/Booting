import type * as KakaoAuth from '@features/auth/lib/kakaoAuth';
import type * as KakaoShare from '@react-native-kakao/share';
import type { DiscoveryItem } from '@shared/api/booting.types';
import { goalLabel } from '@shared/config/relationshipGoals';

const MARITAL_LABEL: Record<string, string> = { bereaved: '사별', divorced: '이혼' };

/** 카카오 네이티브 키가 없으면 SDK 초기화 자체가 안 된다 (`app/_layout.tsx`) */
const isKakaoConfigured = !!process.env.EXPO_PUBLIC_KAKAO_NATIVE_KEY;

/**
 * 카카오 공유 모듈을 **호출 시점에** 불러온다.
 *
 * 최상단에서 import 하면 네이티브 모듈이 링크되지 않은 빌드에서 번들 평가 중에
 * 터진다 (`TurboModuleRegistry.getEnforcing`). 그러면 공유 기능 하나 때문에 앱
 * 전체가 뜨지 않는다. 여기서 감싸 두면 네이티브가 없는 빌드에서는 조용히
 * 공유 시트로 내려가고, 네이티브 빌드가 되는 순간 별도 수정 없이 살아난다.
 */
type KakaoShareModule = typeof KakaoShare;
let kakaoShare: KakaoShareModule | null | undefined;

function loadKakaoShare(): KakaoShareModule | null {
  if (kakaoShare !== undefined) return kakaoShare;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    kakaoShare = require('@react-native-kakao/share') as KakaoShareModule;
  } catch {
    kakaoShare = null;
  }
  return kakaoShare;
}

function subtitle(profile: DiscoveryItem): string {
  const marital = MARITAL_LABEL[profile.maritalStatus] ?? '';
  return marital ? `${profile.region} · ${marital}` : profile.region;
}

/**
 * 부모님께 보낼 한 통 (공유 시트 폴백용 텍스트).
 *
 * 부모님이 읽는 글이다. 앱 용어(별명·관계 목적·인증 배지)를 그대로 옮기지 않고
 * 사람이 사람을 소개하는 순서로 쓴다 — 누구인지, 어디 사는지, 어떤 분인지.
 */
export function parentShareMessage(profile: DiscoveryItem): string {
  const lines = [`[부팅] ${profile.nickname} 님 (${profile.age}세)`, subtitle(profile)];
  if (profile.introExcerpt) lines.push('', profile.introExcerpt);
  // 코드값(`undecided`)이 아니라 부모님이 읽을 말로 바꿔 넣는다
  const goals = (profile.goals ?? []).map(goalLabel).filter(Boolean);
  if (goals.length) lines.push('', `찾으시는 인연: ${goals.join(', ')}`);
  lines.push('', '자녀가 부팅에서 보고 전해드립니다.');
  return lines.join('\n');
}

/**
 * 카카오톡 피드 템플릿 — 사진 + 이름 + 소개가 한 장 카드로 간다.
 *
 * 버튼(`buttonTitle`)을 달지 않는 이유: 눌러서 갈 곳이 없다. 부모님은 이 앱을
 * 쓰지 않고, 공개 프로필 웹페이지도 아직 없다. 죽은 버튼을 달면 부모님이
 * 눌러보고 아무 일도 안 일어나는 경험만 남는다.
 *
 * 템플릿 ID 를 쓰지 않는다 — `shareFeedTemplate` 은 카카오 개발자 콘솔에
 * 템플릿을 만들지 않아도 앱에서 만든 카드를 그대로 보낸다.
 */
function feedTemplate(profile: DiscoveryItem, connectionId: string, openUrl?: string) {
  const goals = (profile.goals ?? []).map(goalLabel).filter(Boolean);
  /**
   * 웹 주소와 앱 실행을 **둘 다** 넣는다.
   *
   * 앱 실행 파라미터만 두면 카카오톡이 버튼을 통째로 지운다 — 부모님 폰에 앱이
   * 없고, 아이폰이면 iOS 플랫폼도 콘솔에 없어서 갈 곳이 없다고 보기 때문이다.
   * 실제로 카드는 왔는데 '자세히 보기' 가 없었다 (실측).
   *
   * 안드로이드에 앱이 있으면 실행 파라미터가 먼저 먹어 앱이 열리고, 없으면 웹
   * 주소로 간다. 그 페이지가 앱 열기와 부모님 코드 안내를 보여 드린다.
   * (`openUrl` 도메인은 카카오 콘솔 [플랫폼 > Web] 에 등록돼 있어야 한다.)
   */
  const link = {
    ...(openUrl ? { webUrl: openUrl, mobileWebUrl: openUrl } : {}),
    androidExecutionParams: { connectionId },
    iosExecutionParams: { connectionId },
  };
  const description = [
    subtitle(profile),
    profile.introExcerpt,
    goals.length ? `찾으시는 인연: ${goals.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    content: {
      title: `${profile.nickname} 님 · ${profile.age}세`,
      description,
      imageUrl: profile.primaryPhotoUrl ?? '',
      link,
    },
    /**
     * 버튼을 `buttonTitle` 로 두지 않고 **목록으로** 명시한다.
     *
     * `buttonTitle` 은 카드의 `content.link` 를 그대로 쓰는 줄임 표기인데, 그렇게
     * 보낸 카드에는 버튼이 아예 나오지 않았다 (아이폰에서 실측). 버튼과 그 버튼이
     * 갈 곳을 한 자리에 적어 두면 해석의 여지가 없다.
     */
    buttons: [{ title: '부팅에서 열기', link }],
  };
}

export type ShareOutcome =
  /** 카카오톡 공유 화면까지 넘어갔다 */
  | 'kakao'
  /** 카카오톡이 없거나 카카오 설정이 안 돼 있다 */
  | 'unavailable';

/**
 * 부모님께 프로필 공유 — 카카오톡으로만 보낸다.
 *
 * OS 공유 시트를 쓰지 않는다. 시트를 열면 드라이브·클립보드·메모까지 나열되는데,
 * 이 버튼이 하려는 일은 하나뿐이라 고를 것을 늘릴 이유가 없다. 부모님께 닿는
 * 통로도 사실상 카카오톡 하나다.
 *
 * @returns 'kakao' 면 카카오톡 공유 화면까지 갔다. **보냈다는 증명은 아니다** —
 *          카카오 SDK 는 카카오톡으로 넘긴 시점에 성공을 돌려주고, 그 안에서
 *          실제로 전송했는지는 알려주지 않는다. 확실한 발송 확인은 카카오
 *          **서버 콜백**(`serverCallbackArgs` + 콘솔에 콜백 URL 등록)뿐인데,
 *          공개 도메인에 서버가 올라간 뒤에야 붙일 수 있다.
 */
export async function shareProfileToParent(
  profile: DiscoveryItem,
  /** 카드를 눌러 앱이 열렸을 때 이 프로필로 보내기 위한 값 */
  connectionId: string,
  /**
   * 카카오 서버 콜백에 되돌려 받을 값.
   *
   * 메시지가 **실제로 전송되면** 카카오 서버가 이 값들을 그대로 실어 우리
   * 서버를 부른다. 공유 완료 표시는 그 콜백에서만 한다 — 앱은 "카카오톡으로
   * 넘겼다"까지만 알기 때문에, 앱에서 표시하면 버튼만 눌러도 완료가 된다.
   */
  callbackArgs?: Record<string, string>,
  /** 카드 버튼이 갈 웹 주소 — 서버가 준다 (`share-token` 응답) */
  openUrl?: string
): Promise<ShareOutcome> {
  const kakao = isKakaoConfigured ? loadKakaoShare() : null;
  if (!kakao) return 'unavailable';

  try {
    await kakao.shareFeedTemplate({
      template: feedTemplate(profile, connectionId, openUrl),
      // 카카오톡이 없으면 웹으로 우회하지 않는다 — 아무 화면도 없이 성공이
      // 돌아와 보내지도 않은 걸 보냈다고 표시하게 된다 (에뮬레이터에서 실측)
      useWebBrowserIfKakaoTalkNotAvailable: false,
      ...(callbackArgs ? { serverCallbackArgs: callbackArgs } : {}),
    });
    return 'kakao';
  } catch (error) {
    if (__DEV__) console.log('[kakao share unavailable]', error);
    return 'unavailable';
  }
}

/**
 * 개발 확인용 — 같은 카드를 **내 카카오톡('나와의 채팅')** 으로 보낸다.
 *
 * 왜 필요한가: 카카오톡 공유는 보내는 기기의 카카오톡에 계정이 들어가 있어야
 * 한다. 그런데 카카오톡은 휴대폰 한 대만 허용해서, 개발 기기에 로그인하면
 * 정작 본인 폰의 카카오톡이 로그아웃된다. 그래서 카드가 실제로 어떻게 보이는지
 * 확인할 방법이 사실상 없었다.
 *
 * '나에게 보내기' 는 카카오 **서버**가 REST 로 보낸다 — 보내는 기기에 카카오톡이
 * 없어도 되고, 카드는 로그인한 계정의 '나와의 채팅' 으로 간다. 본인 폰(아이폰이든
 * 안드로이드든)에서 그대로 열어 볼 수 있고, 폰의 카톡 로그인은 건드리지 않는다.
 *
 * **부모님께 가는 길이 아니다.** 받는 사람이 보내는 사람 자신이라 운영에서는
 * 의미가 없다. 개발 빌드에서 생김새를 확인하는 용도로만 둔다.
 */
export async function sendProfileCardToMyKakao(
  profile: DiscoveryItem,
  connectionId: string,
  openUrl?: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const kakao = isKakaoConfigured ? loadKakaoShare() : null;
  if (!kakao) return { ok: false, reason: '카카오 설정이 없습니다' };

  try {
    // 카카오 **로그인** 모듈도 같은 이유로 호출 시점에 부른다 — 최상단에서
    // import 하면 네이티브가 없는 빌드에서 이 파일을 읽는 것만으로 터진다
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const auth = require('@features/auth/lib/kakaoAuth') as typeof KakaoAuth;
    await auth.ensureKakaoMessageScope();
    const template = feedTemplate(profile, connectionId, openUrl);
    // 카드에 버튼이 안 나올 때 무엇이 실려 나갔는지 봐야 한다. 사진 주소는
    // 서명이 붙어 길기만 하므로 버튼과 링크만 찍는다.
    if (__DEV__) console.log('[kakao card]', JSON.stringify(template.buttons));
    await kakao.sendFeedTemplateToMe({ template });
    return { ok: true };
  } catch (error) {
    if (__DEV__) console.log('[kakao send-to-me failed]', error);
    // 동의항목이 없으면 여기 문구에 그대로 들어온다 — 콘솔에서 무엇을 켜야
    // 하는지 이 문자열이 알려준다
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
