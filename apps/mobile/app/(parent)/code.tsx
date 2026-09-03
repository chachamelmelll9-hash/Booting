import { useParentSession } from '@features/parent-view';
import { parentApi } from '@shared/api/parent';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { AppButton, Screen } from '@shared/ui';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

/**
 * 부모님 로그인 — 코드 6자리.
 *
 * 회원가입도 비밀번호도 없다. 자녀가 알려준 코드 하나면 들어온다.
 * 이 화면의 모든 치수(글자 32sp, 자간, 입력칸 높이)는 60~70대가 돋보기 없이
 * 읽고 누를 수 있는 크기를 먼저 잡고 정했다.
 */
export default function ParentCodeScreen() {
  const router = useRouter();
  const signIn = useParentSession((s) => s.signIn);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const login = useMutation({
    mutationFn: () => parentApi.login(code),
    onSuccess: (result) => {
      signIn(result.token, result.nickname);
      router.replace('/(parent)/home');
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>부모님, 안녕하세요</Text>
        <Text style={styles.body}>
          자녀분께 받으신 <Text style={styles.bodyStrong}>여섯 자리 코드</Text>를 넣어 주세요.
          {'\n'}가입이나 비밀번호는 없습니다.
        </Text>
      </View>

      <TextInput
        testID="parent-code-input"
        value={code}
        onChangeText={(text) => {
          setCode(text.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 6));
          setError(null);
        }}
        placeholder="ABC123"
        placeholderTextColor={theme.colors.disabled}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        style={styles.input}
        accessibilityLabel="접속 코드 여섯 자리"
      />

      {error ? (
        <Text style={styles.error} testID="parent-code-error">
          {error}
        </Text>
      ) : null}

      <AppButton
        label="시작하기"
        disabled={code.length !== 6}
        loading={login.isPending}
        testID="parent-code-submit"
        onPress={() => login.mutate()}
      />

      <Text style={styles.help}>
        코드를 모르시면 자녀분께 &apos;부팅 앱 부모님 코드&apos;를 여쭤봐 주세요.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xl, marginBottom: spacing.lg, gap: spacing.sm },
  title: { ...typography.display, color: theme.colors.text },
  body: { ...typography.subheading, color: theme.colors.textSecondary, lineHeight: 30 },
  bodyStrong: { color: theme.colors.primaryDark, fontWeight: '700' },
  input: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: radius.lg,
    backgroundColor: theme.colors.surface,
    paddingVertical: spacing.md,
    textAlign: 'center',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 10,
    color: theme.colors.text,
    marginBottom: spacing.md,
  },
  error: {
    ...typography.body,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  help: {
    ...typography.body,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 26,
  },
});
