import { theme } from '@shared/config/colors';
import { HIT_SIZE, spacing, typography } from '@shared/config/tokens';
import { StyleSheet, Text, View } from 'react-native';

import { BootingLogo } from './BootingLogo';

interface Props {
  /** 화면 이름. 로고 아래 큰 글씨로 온다. 홈처럼 없어도 된다 */
  title?: string;
}

/**
 * 탭 화면 머리.
 *
 * **네이티브 헤더 대신 화면이 직접 그린다.** 두 가지가 걸려 있다:
 *
 *   1. 워드마크가 모든 탭에 같은 자리에 온다. 네이티브 헤더는 제목 글자만
 *      놓을 수 있어서, 홈에만 로고가 있고 나머지 탭은 글자만 있었다.
 *   2. **뒤로가기가 사라진다.** 탭의 첫 화면은 돌아갈 곳이 없는데도 네이티브
 *      스택 헤더가 'Navigate up' 버튼을 그렸다. 탭을 옮겨 다니는 것은
 *      '들어가는' 동작이 아니라서 돌아갈 곳이 없다 — 뒤로가기는 대화방처럼
 *      실제로 한 단계 들어간 화면에만 있어야 한다.
 *
 * 대화방(`connections/[id]`)은 이걸 쓰지 않는다. 거기는 진짜로 뒤로 갈 곳이 있다.
 */
export function TabHeader({ title }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.logoRow}>
        <BootingLogo />
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xxs },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: HIT_SIZE + 4,
  },
  title: { ...typography.title, color: theme.colors.text },
});
