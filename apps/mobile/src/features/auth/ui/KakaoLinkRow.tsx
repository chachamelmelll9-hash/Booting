import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { kakaoLinkApi } from '../api/kakaoLinkApi';
import { getKakaoIdToken, isKakaoCancel } from '../lib/kakaoAuth';

const isKakaoConfigured = !!process.env.EXPO_PUBLIC_KAKAO_NATIVE_KEY;

/**
 * 카카오 계정 연결 한 줄.
 *
 * 왜 이 화면에 있나: 카카오는 이메일을 주지 않아(동의항목이 비즈니스 앱 전용)
 * 서버가 "이 카카오와 이 계정이 같은 사람" 임을 알 방법이 없다. 그래서 이미
 * 로그인해 있는 여기서 한 번 붙여 둔다 — 지금 로그인해 있다는 것 자체가
 * 이 계정의 주인이라는 증거다.
 *
 * 붙여 두면 다음부터 로그인 화면에서 카카오만 눌러도 이 계정으로 들어온다.
 */
export function KakaoLinkRow() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['kakao-link'],
    queryFn: () => kakaoLinkApi.status(),
    enabled: isKakaoConfigured,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['kakao-link'] });

  const linkMutation = useMutation({
    mutationFn: async () => kakaoLinkApi.link(await getKakaoIdToken()),
    onSuccess: () => {
      void invalidate();
      Alert.alert('연결 완료', '이제 카카오로도 이 계정에 로그인할 수 있습니다.');
    },
    onError: (error: unknown) => {
      if (isKakaoCancel(error)) return;
      const message = error instanceof Error ? error.message : '연결하지 못했습니다';
      Alert.alert('연결 실패', message);
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: () => kakaoLinkApi.unlink(),
    onSuccess: invalidate,
  });

  if (!isKakaoConfigured) return null;

  const linked = data?.linked ?? false;
  const busy = linkMutation.isPending || unlinkMutation.isPending;

  const confirmUnlink = () =>
    Alert.alert(
      '카카오 연결 해제',
      // 해제하면 카카오로 들어왔을 때 이 계정을 못 찾아 새 계정이 열린다.
      // 눌러 보고 알게 되면 늦다.
      '해제하면 카카오로 로그인해도 이 계정으로 들어오지 않습니다. 이메일과 비밀번호로는 그대로 로그인할 수 있습니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '해제', style: 'destructive', onPress: () => unlinkMutation.mutate() },
      ]
    );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={linked ? '카카오 연결 해제' : '카카오 계정 연결'}
      style={styles.row}
      testID="profile-kakao-link"
      disabled={busy}
      onPress={() => (linked ? confirmUnlink() : linkMutation.mutate())}
    >
      <Text style={styles.label}>카카오 계정 연결</Text>
      <Text style={[styles.status, linked && styles.statusLinked]}>
        {busy ? '처리 중…' : linked ? '연결됨' : '연결하기'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: { fontSize: 15, color: '#0F172A' },
  status: { fontSize: 14, color: '#64748B' },
  statusLinked: { color: '#10B981', fontWeight: '600' },
});
