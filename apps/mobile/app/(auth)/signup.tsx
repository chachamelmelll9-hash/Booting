import { useTranslation } from '@chachamelmelll9-hash-service/i18n';
import { type SignupFormData,signupSchema } from '@chachamelmelll9-hash-service/supabase';
import { AuthStyles,useAuthStore } from '@features/auth';
import { signUpApi } from '@features/auth/api';
import { parseAuthError } from '@features/auth/lib/auth-errors';
import { saveTokens, saveUser } from '@features/auth/lib/tokenStorage';
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
import React from 'react';
import { useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

export default function SignupScreen() {
  const { t } = useTranslation('auth');
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const signUpMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signUpApi(email, password),
    onSuccess: async (result) => {
      if (
        result.success &&
        result.data.accessToken &&
        result.data.refreshToken &&
        result.data.expiresAt
      ) {
        await saveTokens({
          accessToken: result.data.accessToken,
          refreshToken: result.data.refreshToken,
          expiresAt: result.data.expiresAt,
        });
        await saveUser(result.data.user);
        // 로그인과 같은 순서다: 이 기기의 부모님 세션을 **먼저** 끝내고 세션을
        // 연다. 뒤집으면 그 사이에 라우팅이 돌아 부모님 화면으로 끌려간다.
        useParentSession.getState().signOut();
        setPendingSharedProfile(null);
        setAuth(result.data.user);
        router.replace('/(parent-setup)/welcome');
      }
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    try {
      await signUpMutation.mutateAsync({
        email: data.email,
        password: data.password,
      });
    } catch {
      // error is captured in signUpMutation.error
    }
  };

  const errorMessage =
    signUpMutation.data && !signUpMutation.data.success
      ? parseAuthError(signUpMutation.data.error)
      : signUpMutation.error
        ? parseAuthError(signUpMutation.error)
        : null;

  return (
    <KeyboardAvoidingView
      style={AuthStyles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={AuthStyles.container}
        contentContainerStyle={AuthStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={AuthStyles.header}>
          <Text style={AuthStyles.title}>{t('signup')}</Text>
          <Text style={AuthStyles.subtitle}>{t('signup_subtitle')}</Text>
        </View>

        {/* Global Error */}
        {errorMessage && (
          <View style={[AuthStyles.messageContainer, AuthStyles.errorContainer]}>
            <Text style={[AuthStyles.messageText, AuthStyles.errorMessageText]}>
              {errorMessage}
            </Text>
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
            testID="signup-email-input"
          />

          <ControlledPasswordInput
            control={control}
            name="password"
            label={t('password')}
            placeholder={t('password_placeholder')}
            testID="signup-password-input"
          />

          <ControlledPasswordInput
            control={control}
            name="confirmPassword"
            label={t('password_confirm')}
            placeholder={t('password_confirm_placeholder', '비밀번호를 다시 입력')}
            testID="signup-confirm-password-input"
          />

          <FormButton
            testID="signup-submit-button"
            title={t('signup')}
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting || signUpMutation.isPending}
          />
        </View>

        {/* Links */}
        <View style={AuthStyles.linkContainer}>
          <Text style={AuthStyles.linkText}>{t('have_account')} </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable accessibilityRole="button">
              <Text style={AuthStyles.link}>{t('login')}</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
