import type { DiscoveryItem } from '@shared/api/booting.types';
import { goalLabel } from '@shared/config/relationshipGoals';
import { Share } from 'react-native';

const MARITAL_LABEL: Record<string, string> = { bereaved: '사별', divorced: '이혼' };

/**
 * 부모님께 보낼 한 통.
 *
 * 부모님이 읽는 글이다. 앱 용어(별명·관계 목적·인증 배지)를 그대로 옮기지 않고
 * 사람이 사람을 소개하는 순서로 쓴다 — 누구인지, 어디 사는지, 어떤 분인지.
 */
export function parentShareMessage(profile: DiscoveryItem): string {
  const lines = [
    `[부팅] ${profile.nickname} 님 (${profile.age}세)`,
    `${profile.region}${profile.maritalStatus ? ` · ${MARITAL_LABEL[profile.maritalStatus] ?? ''}` : ''}`,
  ];
  if (profile.introExcerpt) lines.push('', profile.introExcerpt);
  // 코드값(`undecided`)이 아니라 부모님이 읽을 말로 바꿔 넣는다
  const goals = (profile.goals ?? []).map(goalLabel).filter(Boolean);
  if (goals.length) lines.push('', `찾으시는 인연: ${goals.join(', ')}`);
  lines.push('', '자녀가 부팅에서 보고 전해드립니다.');
  return lines.join('\n');
}

/**
 * 부모님께 프로필 공유.
 *
 * 지금은 OS 공유 시트를 연다 — 카카오톡을 고르면 부모님 대화방으로 보낼 수 있고,
 * 추가 설치나 네이티브 재빌드 없이 오늘 바로 동작한다.
 *
 * 카카오톡 공유 SDK(프로필 카드 형태로 예쁘게 전송)로 바꾸려면 이 함수 하나만
 * 갈아끼우면 된다. 선행 조건:
 *   1. `pnpm install` (현재 node_modules 가 옛 경로를 가리켜 새 패키지 설치가 막힌다)
 *   2. `npx expo install @react-native-kakao/share`
 *   3. `.env.development` 의 `EXPO_PUBLIC_KAKAO_NATIVE_KEY` 채우기
 *   4. `pnpm android` (네이티브 모듈이라 재빌드 필요)
 * 그 뒤 `shareText({ text, link })` 또는 카카오 개발자 콘솔의 피드 템플릿 ID로
 * `shareCustom` 을 호출한다.
 *
 * @returns 사용자가 실제로 공유했으면 true, 시트를 닫았으면 false
 */
export async function shareProfileToParent(profile: DiscoveryItem): Promise<boolean> {
  const result = await Share.share({
    message: parentShareMessage(profile),
  });
  // dismissedAction 은 사용자가 아무 앱도 고르지 않고 닫은 경우다.
  // 그때까지 '공유 완료'로 표시하면 보내지 않은 걸 보냈다고 기록하게 된다.
  return result.action === Share.sharedAction;
}
