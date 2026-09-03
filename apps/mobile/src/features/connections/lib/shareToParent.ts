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
function feedTemplate(profile: DiscoveryItem) {
  const goals = (profile.goals ?? []).map(goalLabel).filter(Boolean);
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
      // 링크 도메인은 카카오 개발자 콘솔에 등록된 것만 허용된다. 등록 전이므로
      // 비워 둔다 — 카드만 보내고 이동은 하지 않는다.
      link: {},
    },
    // 버튼을 만들지 않는다. 비워 두면 카카오가 '자세히 보기' 를 자동으로 붙이는데,
    // 갈 곳이 없어 부모님이 눌러보고 아무 일도 안 일어난다 (실측).
    buttons: [],
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
  /**
   * 카카오 서버 콜백에 되돌려 받을 값.
   *
   * 메시지가 **실제로 전송되면** 카카오 서버가 이 값들을 그대로 실어 우리
   * 서버를 부른다. 공유 완료 표시는 그 콜백에서만 한다 — 앱은 "카카오톡으로
   * 넘겼다"까지만 알기 때문에, 앱에서 표시하면 버튼만 눌러도 완료가 된다.
   */
  callbackArgs?: Record<string, string>
): Promise<ShareOutcome> {
  const kakao = isKakaoConfigured ? loadKakaoShare() : null;
  if (!kakao) return 'unavailable';

  try {
    await kakao.shareFeedTemplate({
      template: feedTemplate(profile),
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
