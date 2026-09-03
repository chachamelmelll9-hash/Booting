import FontAwesome from '@expo/vector-icons/FontAwesome';
import { connectionsApi } from '@shared/api/booting';
import type { Connection } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { AppButton, useToast } from '@shared/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { shareProfileToParent } from '../lib/shareToParent';

/** 카카오 콜백이 도착할 때까지 목록을 다시 물어보는 간격·횟수 */
const POLL_INTERVAL_MS = 3_000;
const POLL_ATTEMPTS = 10;

/**
 * 부모님께 공유 — 이 앱의 마지막 한 걸음.
 *
 * 카카오톡으로만 보낸다. OS 공유 시트를 열면 드라이브·클립보드까지 나열되는데
 * 이 버튼이 하려는 일은 하나뿐이라 고를 것을 늘릴 이유가 없다.
 *
 * **완료 표시는 앱이 하지 않는다.** 카카오 SDK 는 "카카오톡으로 넘겼다"까지만
 * 알려주고 실제 전송 여부는 돌려주지 않는다. 앱에서 표시하면 카카오톡을 열었다가
 * 그냥 나와도 '공유 완료'가 된다. 그래서 표시는 **카카오 서버 콜백**을 받은
 * 서버만 한다 (`POST /api/kakao/share-callback`). 앱은 공유 화면으로 넘어간 뒤
 * 잠깐 목록을 다시 물어보며 그 결과를 기다린다.
 */
export function ParentShareButton({ connection }: { connection: Connection }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  if (connection.sharedWithParent) {
    return (
      <View style={styles.done} testID={`parent-share-done-${connection.id}`}>
        <FontAwesome name="check" size={12} color={theme.colors.textTertiary} />
        <Text style={styles.doneText}>부모님께 공유 완료</Text>
      </View>
    );
  }

  /** 콜백이 도착했는지 잠깐 지켜본다 — 도착하면 카드가 스스로 바뀐다 */
  const pollForCallback = () => {
    setWaiting(true);
    for (let i = 1; i <= POLL_ATTEMPTS; i++) {
      timers.current.push(
        setTimeout(() => {
          void queryClient.invalidateQueries({ queryKey: ['connections'] });
          if (i === POLL_ATTEMPTS) setWaiting(false);
        }, POLL_INTERVAL_MS * i)
      );
    }
  };

  const handleShare = async () => {
    setBusy(true);
    try {
      // 콜백이 돌아왔을 때 누가 무엇을 보냈는지 알아보게 서명을 받아 실어 보낸다
      const { token, userId } = await connectionsApi.shareToken(connection.id);
      const outcome = await shareProfileToParent(connection.partner, {
        connectionId: connection.id,
        userId,
        t: token,
      });

      if (outcome === 'unavailable') {
        toast.show({
          message: '카카오톡을 열지 못했습니다. 설치되어 있는지 확인해 주세요.',
        });
        return;
      }
      pollForCallback();
    } catch {
      toast.show({ message: '공유 화면을 열지 못했습니다' });
    } finally {
      setBusy(false);
    }
  };

  if (waiting) {
    return (
      <View style={styles.waiting} testID={`parent-share-waiting-${connection.id}`}>
        <Text style={styles.waitingText}>카카오톡 전송을 확인하는 중입니다…</Text>
      </View>
    );
  }

  return (
    <AppButton
      label="부모님께 공유"
      variant="secondary"
      loading={busy}
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
  waiting: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderRadius: radius.lg,
    backgroundColor: theme.colors.primarySurface,
  },
  waitingText: { ...typography.caption, color: theme.colors.primaryDark },
});
