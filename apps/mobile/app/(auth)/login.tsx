import { useTranslation } from '@chachamelmelll9-hash-service/i18n';
import { type LoginFormData,loginSchema } from '@chachamelmelll9-hash-service/supabase';
import { AuthStyles,useAuthStore } from '@features/auth';
import { devLoginApi,loginApi } from '@features/auth/api';
import { signInWithApple } from '@features/auth/lib/appleAuth';
import { parseAuthError } from '@features/auth/lib/auth-errors';
import { signInWithKakao } from '@features/auth/lib/kakaoAuth';
import { saveLastLoginMethod } from '@features/auth/lib/lastLoginMethod';
import { saveTokens, saveUser, type StoredUser } from '@features/auth/lib/tokenStorage';
import { setPendingSharedProfile, useParentSession } from '@features/parent-view';
import { zodResolver } from '@hookform/resolvers/zod';
import { EMAIL_KEYBOARD_TYPE } from '@shared/lib';
import {
  ControlledInput,
  ControlledPasswordInput,
  FormButton,
} from '@shared/ui';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import KakaoIcon from '../../assets/icons/kakao.svg';

/**
 * 카카오 **로그인** 은 별도 스위치로 켠다.
 *
 * 네이티브 키(`EXPO_PUBLIC_KAKAO_NATIVE_KEY`)로 판단하면 안 된다 — 그 키는
 * '부모님께 공유'(카카오톡 공유)에도 쓰이고, 공유만 하려고 키를 넣는 순간
 * 로그인 버튼이 딸려 나온다. 콘솔에서 카카오 로그인을 안 켰으면 그 버튼은
 * `KOE004`(서비스 설정 오류)로 끝난다 — 실제로 그렇게 났다.
 *
 * 부팅의 로그인은 이메일과 부모님 코드 둘뿐이다. 카카오 로그인을 쓰려면
 * 콘솔의 [카카오 로그인] > [활성화 설정] 을 켜고 이 값을 `true` 로 준다.
 */
const isKakaoLoginEnabled =
  !!process.env.EXPO_PUBLIC_KAKAO_NATIVE_KEY &&
  process.env.EXPO_PUBLIC_KAKAO_LOGIN === 'true';

export default function LoginScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);

  /**
   * 자녀가 로그인하면 이 기기의 부모님 세션은 끝난다.
   *
   * 한 기기에 두 역할이 함께 있으면 안 된다. 루트 라우팅은 부모님 세션을 자녀
   * 로그인보다 먼저 판정하므로(그게 맞다 — 부모님이 자녀 화면을 보시면 안 된다),
   * 부모님 세션이 남아 있는 기기에서는 자녀가 로그인해도 부모님 화면으로
   * 끌려갔다. 실제로 부모님으로 한 번 들어가 본 기기에서 자녀 로그인이
   * 삭제된 프로필 화면으로 떨어졌다 (실측).
   *
   * 지우는 자리는 로그인 성공 **직전**이다. `setAuth` 뒤에 지우면 그 사이에
   * 라우팅 effect 가 먼저 돌아 이미 부모님 화면으로 가 있다.
   */
  const startChildSession = (user: StoredUser) => {
    useParentSession.getState().signOut();
    setPendingSharedProfile(null);
    setAuth(user);
  };

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginApi(email, password),
    onSuccess: async (result) => {
      if (result.success) {
        await saveTokens({
          accessToken: result.data.accessToken,
          refreshToken: result.data.refreshToken,
          expiresAt: result.data.expiresAt,
        });
        await saveUser(result.data.user);
        await saveLastLoginMethod('email');
        startChildSession(result.data.user);
        router.replace('/(parent-setup)/welcome');
      }
    },
  });

  /**
   * 개발용 즉시 로그인 (__DEV__ 빌드에서만 버튼이 보인다).
   * 서버가 계정을 만들고 자녀 인증까지 끝난 세션을 준다.
   *
   * `fresh` 는 매번 **새 계정**이다. 고정 계정에는 부모님 프로필이 이미 등록·
   * 공개돼 있어 등록 흐름을 지날 수 없다 — 인사 화면이 "다 끝난 사람" 으로 보고
   * 추천 화면으로 건너뛴다. 실제로 등록부터 보려다 매번 추천 화면이 떴다.
   */
  const devLoginMutation = useMutation({
    mutationFn: (fresh: boolean) => devLoginApi(fresh),
    onSuccess: async (result) => {
      if (result.success) {
        await saveTokens({
          accessToken: result.data.accessToken,
          refreshToken: result.data.refreshToken,
          expiresAt: result.data.expiresAt,
        });
        await saveUser(result.data.user);
        await saveLastLoginMethod('email');
        startChildSession(result.data.user);
        router.replace('/(parent-setup)/welcome');
      } else {
        setSocialError(result.error.message);
      }
    },
  });

  const handleKakaoLogin = async () => {
    setSocialError(null);
    setKakaoLoading(true);
    try {
      const result = await signInWithKakao();
      if (result.success) {
        await saveLastLoginMethod('kakao');
        startChildSession(result.user);
        router.replace('/(parent-setup)/welcome');
      } else {
        // 빈 문자열은 '사용자가 취소함' — 실패 문구를 띄우지 않는다
        setSocialError(result.error || null);
        setKakaoLoading(false);
      }
    } catch {
      setKakaoLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setSocialError(null);
    setAppleLoading(true);
    try {
      const result = await signInWithApple();
      if (result.success) {
        await saveLastLoginMethod('apple');
        startChildSession(result.user);
        router.replace('/(parent-setup)/welcome');
      } else {
        setSocialError(result.error);
        setAppleLoading(false);
      }
    } catch {
      setAppleLoading(false);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    const result = await loginMutation.mutateAsync({
      email: data.email,
      password: data.password,
    });

    if (!result.success) {
      return;
    }
  };

  const errorMessage =
    socialError ??
    (loginMutation.data && !loginMutation.data.success
      ? parseAuthError(loginMutation.data.error)
      : loginMutation.error
      ? parseAuthError(loginMutation.error)
      : null);

  return (
    <KeyboardAwareScrollView
      style={AuthStyles.container}
      contentContainerStyle={AuthStyles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={AuthStyles.header}>
        <Text style={AuthStyles.title}>{t('login')}</Text>
        <Text style={AuthStyles.subtitle}>{t('login_subtitle')}</Text>
      </View>

      {/* Global Error */}
      {errorMessage && (
        <View
          style={[AuthStyles.messageContainer, AuthStyles.errorContainer]}
        >
          <Text style={[AuthStyles.messageText, AuthStyles.errorMessageText]}>
            {errorMessage}
          </Text>
        </View>
      )}

      {/* Social Login */}
      {(isKakaoLoginEnabled || Platform.OS === 'ios') && (
        <View style={local.socialRow}>
          {isKakaoLoginEnabled && (
            <Pressable
              testID="login-kakao-button"
              accessibilityRole="button"
              style={({ pressed }) => [
                local.kakaoButton,
                pressed && local.kakaoButtonPressed,
              ]}
              onPress={handleKakaoLogin}
              disabled={kakaoLoading}
            >
              {kakaoLoading ? (
                <Text style={local.kakaoText}>{t('common:loading')}</Text>
              ) : (
                <>
                  <KakaoIcon width={18} height={18} />
                  <Text style={local.kakaoText}>
                    {t('kakao_login', '카카오 로그인')}
                  </Text>
                </>
              )}
            </Pressable>
          )}

          {Platform.OS === 'ios' && (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                local.appleButton,
                pressed && local.appleButtonPressed,
              ]}
              onPress={handleAppleLogin}
              disabled={appleLoading}
            >
              {appleLoading ? (
                <Text style={local.appleText}>{t('common:loading')}</Text>
              ) : (
                <>
                  <Text style={local.appleIcon}>{'\uF8FF'}</Text>
                  <Text style={local.appleText}>
                    {t('apple_login', 'Apple 로그인')}
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      )}

      {/* Divider */}
      {(isKakaoLoginEnabled || Platform.OS === 'ios') && (
        <View style={local.divider}>
          <View style={local.dividerLine} />
          <Text style={local.dividerText}>{t('or', '또는')}</Text>
          <View style={local.dividerLine} />
        </View>
      )}

      {/* Form */}
      <View style={AuthStyles.form}>
        <ControlledInput
          control={control}
          name="email"
          label={t('email')}
          placeholder={t('email_placeholder')}
          keyboardType={EMAIL_KEYBOARD_TYPE}
          autoCapitalize="none"
          autoComplete="email"
          testID="login-email-input"
        />

        <ControlledPasswordInput
          control={control}
          name="password"
          label={t('password')}
          placeholder={t('password_placeholder')}
          testID="login-password-input"
        />

        <FormButton
          testID="login-submit-button"
          title={t('login')}
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting || loginMutation.isPending}
        />

        {/*
          부모님 진입 — 회원가입도 비밀번호도 없이 자녀가 알려준 코드 하나로 들어간다.
          부모님은 이 화면의 다른 항목(이메일·비밀번호·카카오)을 전부 못 쓰신다.
        */}
        <FormButton
          testID="parent-code-entry"
          title="부모님이신가요? 코드로 시작"
          variant="secondary"
          onPress={() => router.push('/(parent)/code')}
        />

        {/* 개발 빌드에서만 보인다. 릴리스 번들에는 아예 포함되지 않는다. */}
        {__DEV__ ? (
          <>
            <FormButton
              testID="dev-login-button"
              title="개발용 바로 시작 (등록 끝난 계정)"
              variant="secondary"
              onPress={() => devLoginMutation.mutate(false)}
              loading={devLoginMutation.isPending}
            />
            {/* 등록 흐름을 처음부터 보려면 아무것도 없는 계정이 있어야 한다 */}
            <FormButton
              testID="dev-login-fresh-button"
              title="개발용 새 계정 (프로필 등록부터)"
              variant="secondary"
              onPress={() => devLoginMutation.mutate(true)}
              loading={devLoginMutation.isPending}
            />
          </>
        ) : null}
      </View>

      {/* Links */}
      <View style={AuthStyles.linkContainer}>
        <Link href="/(auth)/forgot-password" asChild>
          <Pressable accessibilityRole="button" hitSlop={8}>
            <Text style={AuthStyles.link}>{t('forgot_password')}</Text>
          </Pressable>
        </Link>
      </View>

      <View style={local.signupRow}>
        <Text style={AuthStyles.linkText}>{t('no_account')} </Text>
        <Link href="/(auth)/signup" asChild>
          <Pressable accessibilityRole="button" testID="login-signup-link" hitSlop={8}>
            <Text style={AuthStyles.link}>{t('signup')}</Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAwareScrollView>
  );
}

const local = StyleSheet.create({
  socialRow: {
    gap: 10,
  },
  kakaoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE500',
    borderRadius: 12,
    paddingVertical: 15,
    gap: 8,
  },
  kakaoButtonPressed: {
    opacity: 0.75,
  },
  kakaoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#191919',
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 15,
    gap: 8,
  },
  appleButtonPressed: {
    opacity: 0.75,
  },
  appleIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  appleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
});
