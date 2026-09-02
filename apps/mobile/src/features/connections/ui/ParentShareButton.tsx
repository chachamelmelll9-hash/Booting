import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { Connection } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { AppButton, useToast } from '@shared/ui';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { shareProfileToParent } from '../lib/shareToParent';
import { useShareWithParent } from '../model/useConnections';

/**
 * 부모님께 공유 — 이 앱의 마지막 한 걸음.
 *
 * 자녀가 상대 부모님 프로필을 보고 괜찮다 싶으면 자기 부모님께 전달한다.
 * 그 뒤의 판단은 부모님 몫이고 앱이 할 일은 여기서 끝난다.
 *
 * 공유 시트를 닫아 버린 경우(아무 앱도 고르지 않음)에는 기록하지 않는다 —
 * 보내지 않은 걸 '공유 완료'로 표시하면 자녀가 안 보낸 걸 보냈다고 착각한다.
 */
export function ParentShareButton({ connection }: { connection: Connection }) {
  const toast = useToast();
  const share = useShareWithParent(connection.id);
  const [opening, setOpening] = useState(false);

  if (connection.sharedWithParent) {
    return (
      <View style={styles.done} testID={`parent-share-done-${connection.id}`}>
        <FontAwesome name="check" size={12} color={theme.colors.textTertiary} />
        <Text style={styles.doneText}>부모님께 공유 완료</Text>
      </View>
    );
  }

  const handleShare = async () => {
    setOpening(true);
    try {
      const shared = await shareProfileToParent(connection.partner);
      if (!shared) return;
      share.mutate(undefined, {
        onSuccess: () => toast.show({ message: '부모님께 공유했습니다' }),
        onError: (error: Error) => toast.show({ message: error.message }),
      });
    } catch {
      toast.show({ message: '공유 화면을 열지 못했습니다' });
    } finally {
      setOpening(false);
    }
  };

  return (
    <AppButton
      label="부모님께 공유"
      variant="secondary"
      loading={opening || share.isPending}
      testID={`parent-share-${connection.id}`}
      onPress={() => void handleShare()}
    />
  );
}

const styles = StyleSheet.create({
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    minHeight: 40,
    borderRadius: radius.lg,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  doneText: { ...typography.caption, color: theme.colors.textTertiary },
});
