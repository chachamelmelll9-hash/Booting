import {
  CONNECTION_STATUS,
  type ConnectionStatus,
} from '@shared/config/connectionStatus';
import { radius, spacing, statusTone, typography } from '@shared/config/tokens';
import { StyleSheet, Text, View } from 'react-native';

/**
 * 인연 상태 배지.
 *
 * 문구는 반드시 `CONNECTION_STATUS` 에서만 온다. 이 컴포넌트는 문자열을
 * prop 으로 받지 않는다 — 받는 순간 화면에서 '매칭 성공'을 직접 넘길 수 있게 된다.
 */
export function ConnectionStatusBadge({ status }: { status: ConnectionStatus }) {
  const presentation = CONNECTION_STATUS[status];
  if (!presentation) return null;

  const tone = statusTone[presentation.tone];

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text style={[styles.text, { color: tone.fg }]}>{presentation.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  text: { ...typography.micro },
});
