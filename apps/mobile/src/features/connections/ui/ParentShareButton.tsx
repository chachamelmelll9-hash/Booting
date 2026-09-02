import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { Connection } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { AppButton, useToast } from '@shared/ui';
import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { shareProfileToParent } from '../lib/shareToParent';
import { useShareWithParent } from '../model/useConnections';

/**
 * 부모님께 공유 — 이 앱의 마지막 한 걸음.
 *
 * 자녀가 상대 부모님 프로필을 보고 괜찮다 싶으면 자기 부모님께 전달한다.
 * 그 뒤의 판단은 부모님 몫이고 앱이 할 일은 여기서 끝난다.
 *
 * **공유 시트 결과만 보고 '공유 완료'로 바꾸지 않는다.** 안드로이드는 사용자가
 * 앱을 고른 시점에 성공을 돌려주고, 그 앱 안에서 실제로 보냈는지는 알려주지
 * 않는다. 그래서 카톡을 열었다가 그냥 나와도 '공유 완료'가 됐다. 보냈는지는
 * 사용자만 안다 — 돌아온 뒤에 직접 확인받는다.
 */
export function ParentShareButton({ connection }: { connection: Connection }) {
  const toast = useToast();
  const share = useShareWithParent(connection.id);
  const [opening, setOpening] = useState(false);
  const [confirming, setConfirming] = useState(false);

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
      const opened = await shareProfileToParent(connection.partner);
      // 시트를 그냥 닫았으면 물어볼 것도 없다
      if (opened) setConfirming(true);
    } catch {
      toast.show({ message: '공유 화면을 열지 못했습니다' });
    } finally {
      setOpening(false);
    }
  };

  const confirmSent = () => {
    setConfirming(false);
    share.mutate(undefined, {
      onSuccess: () => toast.show({ message: '부모님께 공유한 것으로 표시했습니다' }),
      onError: (error: Error) => toast.show({ message: error.message }),
    });
  };

  return (
    <>
      <AppButton
        label="부모님께 공유"
        variant="secondary"
        loading={opening || share.isPending}
        testID={`parent-share-${connection.id}`}
        onPress={() => void handleShare()}
      />

      <Modal
        visible={confirming}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirming(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.dialog} testID={`parent-share-confirm-${connection.id}`}>
            <Text style={styles.title}>부모님께 보내셨나요?</Text>
            <Text style={styles.body}>
              보내셨다면 이 카드는 회색으로 바뀌고 &apos;부모님께 공유 완료&apos;로 남습니다.
              대화 상대에게도 공유했다는 기록 한 줄이 보입니다.
            </Text>
            <View style={styles.actions}>
              <AppButton label="아직이요" variant="secondary" onPress={() => setConfirming(false)} />
              <AppButton
                label="보냈어요"
                testID={`parent-share-confirm-yes-${connection.id}`}
                onPress={confirmSent}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(17,24,39,0.45)',
  },
  dialog: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  title: { ...typography.heading, color: theme.colors.text },
  body: { ...typography.body, color: theme.colors.textSecondary },
  actions: { marginTop: spacing.md, gap: spacing.xs },
});
