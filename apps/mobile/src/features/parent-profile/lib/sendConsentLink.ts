import type * as KakaoShare from '@react-native-kakao/share';

const isKakaoConfigured = !!process.env.EXPO_PUBLIC_KAKAO_NATIVE_KEY;

/**
 * 카카오 공유 모듈을 호출 시점에 불러온다 — 네이티브가 링크되지 않은 빌드에서
 * 번들 평가 중에 터지는 것을 막는다 (`shareToParent.ts` 와 같은 이유).
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

export type ConsentSendOutcome = 'kakao' | 'unavailable';

/**
 * 부모님께 동의 링크를 카카오톡으로 보낸다.
 *
 * 문자(SMS)가 아니라 카카오톡인 이유: 이 앱에서 부모님께 무언가를 보내는
 * 통로는 이미 카카오톡 하나로 정해져 있고(부모님께 프로필 공유), 문자는
 * 발송 비용과 사업자 등록이 따로 든다.
 *
 * 카드에 버튼을 단다. '부모님께 공유'와 다른 점이다 — 저쪽은 눌러서 갈 곳이
 * 없어 버튼을 뺐지만, 여기서는 **누르는 것이 목적**이다.
 */
export async function sendConsentLink(
  parentName: string,
  url: string
): Promise<ConsentSendOutcome> {
  const kakao = isKakaoConfigured ? loadKakaoShare() : null;
  if (!kakao) return 'unavailable';

  try {
    await kakao.shareFeedTemplate({
      template: {
        content: {
          title: `${parentName} 님, 확인 부탁드립니다`,
          description:
            '자녀분이 부팅에 프로필을 등록하려 합니다.\n아래를 눌러 내용을 확인하고 동의해 주세요.',
          imageUrl: '',
          link: { webUrl: url, mobileWebUrl: url },
        },
        buttons: [
          { title: '동의 내용 확인하기', link: { webUrl: url, mobileWebUrl: url } },
        ],
      },
      useWebBrowserIfKakaoTalkNotAvailable: false,
    });
    return 'kakao';
  } catch (error) {
    if (__DEV__) console.log('[consent link share failed]', error);
    return 'unavailable';
  }
}
