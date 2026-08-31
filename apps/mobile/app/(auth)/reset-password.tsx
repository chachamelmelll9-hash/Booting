import { AuthStyles } from '@features/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@chachamelmelll9-hash-service/i18n';
import { supabase } from '@shared/lib/supabase';
import { ControlledPasswordInput, FormButton } from '@shared/ui';
import { useMutation } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Link, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { z } from 'zod';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface RecoveryParams {
  accessToken: string | null;
  refreshToken: string | null;
  errorDescription: string | null;
}

/**
 * Supabase recovery links deliver tokens in the URL fragment
 * (booting-mobile://reset-password#access_token=...&refresh_token=...&type=recovery),
 * which expo-router does not expose as route params — parse them manually.
 */
function parseRecoveryParams(url: string | null): RecoveryParams {
  const empty: RecoveryParams = {
    accessToken: null,
    refreshToken: null,
    errorDescription: null,
  };

  if (!url) {
    return empty;
  }

  const params = new Map<string, string>();
  for (const part of url.split(/[#?]/).slice(1)) {
    for (const pair of part.split('&')) {
      const [rawKey, rawValue = ''] = pair.split('=');
      if (!rawKey) continue;
      try {
        params.set(
          decodeURIComponent(rawKey),
          decodeURIComponent(rawValue.replace(/\+/g, ' '))
        );
      } catch {
        params.set(rawKey, rawValue);
      }
    }
  }

  return {
    accessToken: params.get('access_token') ?? null,
    refreshToken: params.get('refresh_token') ?? null,
    errorDescription:
      params.get('error_description') ?? params.get('error') ?? null,
  };
}

export default function ResetPasswordScreen() {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const url = Linking.useURL();
  const recovery = useMemo(() => parseRecoveryParams(url), [url]);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      if (!recovery.accessToken || !recovery.refreshToken) {
        throw new Error(
          t('invalid_reset_link', '유효하지 않은 재설정 링크입니다')
        );
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: recovery.accessToken,
        refresh_token: recovery.refreshToken,
      });
      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        throw new Error(updateError.message);
      }

      await supabase.auth.signOut();
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      await updatePasswordMutation.mutateAsync(data.password);
    } catch {
      // error is captured in updatePasswordMutation.error
    }
  };

  const hasValidLink = !!recovery.accessToken && !!recovery.refreshToken;
  const isSuccess = updatePasswordMutation.isSuccess;
  const errorMessage = updatePasswordMutation.error
    ? updatePasswordMutation.error.message
    : recovery.errorDescription;

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
          <Text style={AuthStyles.title}>{t('reset_password')}</Text>
          <Text style={AuthStyles.subtitle}>
            {t('reset_password_subtitle', '새로운 비밀번호를 입력해주세요')}
          </Text>
        </View>

        {/* Success Message */}
        {isSuccess && (
          <View
            style={[AuthStyles.messageContainer, AuthStyles.successContainer]}
          >
            <Text
              style={[AuthStyles.messageText, AuthStyles.successMessageText]}
            >
              {t(
                'reset_password_success',
                '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.'
              )}
            </Text>
          </View>
        )}

        {/* Global Error */}
        {!isSuccess && errorMessage && (
          <View
            style={[AuthStyles.messageContainer, AuthStyles.errorContainer]}
          >
            <Text style={[AuthStyles.messageText, AuthStyles.errorMessageText]}>
              {errorMessage}
            </Text>
          </View>
        )}

        {/* Invalid / expired link */}
        {!isSuccess && !hasValidLink && (
          <View style={AuthStyles.form}>
            <Text style={AuthStyles.subtitle}>
              {t(
                'invalid_reset_link_description',
                '재설정 링크가 만료되었거나 유효하지 않습니다. 이메일을 다시 요청해주세요.'
              )}
            </Text>
            <FormButton
              title={t('send_reset_link', '재설정 링크 보내기')}
              onPress={() => router.replace('/(auth)/forgot-password')}
            />
          </View>
        )}

        {/* Form */}
        {!isSuccess && hasValidLink && (
          <View style={AuthStyles.form}>
            <ControlledPasswordInput
              control={control}
              name="password"
              label={t('new_password', '새 비밀번호')}
              placeholder={t('password_placeholder')}
              testID="reset-password-input"
            />

            <ControlledPasswordInput
              control={control}
              name="confirmPassword"
              label={t('password_confirm')}
              placeholder={t('password_confirm_placeholder', '비밀번호를 다시 입력')}
              testID="reset-password-confirm-input"
            />

            <FormButton
              testID="reset-password-submit-button"
              title={t('reset_password')}
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting || updatePasswordMutation.isPending}
            />
          </View>
        )}

        {/* Links */}
        {isSuccess ? (
          <View style={AuthStyles.form}>
            <FormButton
              title={t('login')}
              onPress={() => router.replace('/(auth)/login')}
            />
          </View>
        ) : (
          <View style={AuthStyles.linkContainer}>
            <Link href="/(auth)/login" asChild>
              <Pressable accessibilityRole="button">
                <Text style={AuthStyles.link}>
                  {t('back_to_login', '로그인으로 돌아가기')}
                </Text>
              </Pressable>
            </Link>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
