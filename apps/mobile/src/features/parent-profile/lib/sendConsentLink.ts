import { Share } from 'react-native';

export type ConsentSendOutcome = 'sent' | 'dismissed';

/**
 * 부모님께 동의 링크를 보낸다.
 *
 * 카카오 SDK 의 카드(`shareFeedTemplate`)를 쓰지 않는다. 카드에 넣은 링크는
 * **카카오 콘솔에 등록된 도메인**이라야 열린다 — 등록되지 않으면 카카오톡이
 * 링크를 무시하고 앱을 열려 하다 아무 일도 일어나지 않는다
 * (실측: `kakao…://kakaolink` → `INTENT_NOT_RESOLVED`).
 *
 * 공유 시트로 보내면 링크가 **일반 대화 메시지**로 들어가고, 카카오톡이 알아서
 * 눌리는 링크로 만든다. 도메인 등록이 필요 없다.
 *
 * '부모님께 프로필 공유'는 반대로 카카오톡만 열도록 좁혔는데, 여기는 그렇게
 * 하지 않는 이유가 있다. 저쪽은 **카드 그림 자체가 목적**이라 카카오톡이 아니면
 * 의미가 없다. 여기는 **링크가 부모님께 닿는 것**이 목적이고, 카카오톡을 쓰지
 * 않으시는 부모님께는 문자로 보내드리는 편이 낫다 — 50~70대 부모님이 대상이라
 * 그런 분이 드물지 않다.
 */
export async function sendConsentLink(
  parentName: string,
  url: string
): Promise<ConsentSendOutcome> {
  const message = [
    `${parentName} 님, 확인 부탁드립니다.`,
    '',
    '자녀분이 부팅(Booting)에 부모님 프로필을 등록하려 합니다.',
    '아래 링크에서 내용을 확인하고 동의해 주세요.',
    '',
    url,
  ].join('\n');

  const result = await Share.share({ message });
  return result.action === Share.sharedAction ? 'sent' : 'dismissed';
}
