import { AuthStyles,useAuthStore } from '@features/auth';
import { loginApi } from '@features/auth/api';
import { signInWithApple } from '@features/auth/lib/appleAuth';
import { parseAuthError } from '@features/auth/lib/auth-errors';
import { signInWithKakao } from '@features/auth/lib/kakaoAuth';
import { saveLastLoginMethod } from '@features/auth/lib/lastLoginMethod';
import { saveTokens, saveUser } from '@features/auth/lib/tokenStorage';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@product-engineer-community-service/i18n';
import { type LoginFormData,loginSchema } from '@product-engineer-community-service/supabase';
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

const isKakaoLoginEnabled = !!process.env.EXPO_PUBLIC_KAKAO_NATIVE_KEY;

export default function LoginScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);

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
        setAuth(result.data.user);
        router.replace('/(tabs)/home');
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
        setAuth(result.user);
        router.replace('/(tabs)/home');
      } else {
        setSocialError(result.error);
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
        setAuth(result.user);
        router.replace('/(tabs)/home');
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
          keyboardType="email-address"
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
