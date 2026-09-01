import { useTranslation } from '@chachamelmelll9-hash-service/i18n';
import {
  type ForgotPasswordFormData,
  forgotPasswordSchema,
} from '@chachamelmelll9-hash-service/supabase';
import { AuthStyles } from '@features/auth';
import { resetPasswordApi } from '@features/auth/api';
import { parseAuthError } from '@features/auth/lib/auth-errors';
import { zodResolver } from '@hookform/resolvers/zod';
import { EMAIL_KEYBOARD_TYPE } from '@shared/lib';
import { ControlledInput, FormButton } from '@shared/ui';
import { useMutation } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import { useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation('auth');
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (email: string) =>
      // Deep link back into this app's reset-password screen.
      resetPasswordApi(email, Linking.createURL('reset-password')),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    const result = await resetPasswordMutation.mutateAsync(data.email);
    if (!result.success) {
      return;
    }
  };

  const isSuccess = resetPasswordMutation.data?.success === true;
  const errorMessage =
    resetPasswordMutation.data && !resetPasswordMutation.data.success
      ? parseAuthError(resetPasswordMutation.data.error)
      : resetPasswordMutation.error
        ? parseAuthError(resetPasswordMutation.error)
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
          <Text style={AuthStyles.title}>{t('reset_password')}</Text>
          <Text style={AuthStyles.subtitle}>
            {t(
              'forgot_password_subtitle',
              '가입한 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다'
            )}
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
                'reset_email_sent',
                '비밀번호 재설정 이메일을 발송했습니다. 이메일을 확인해주세요.'
              )}
            </Text>
          </View>
        )}

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

        {/* Form */}
        {!isSuccess && (
          <View style={AuthStyles.form}>
            <ControlledInput
              control={control}
              name="email"
              label={t('email')}
              placeholder={t('email_placeholder')}
              keyboardType={EMAIL_KEYBOARD_TYPE}
          autoCapitalize="none"
              autoComplete="email"
            />

            <FormButton
              title={t('send_reset_link', '재설정 링크 보내기')}
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting || resetPasswordMutation.isPending}
            />
          </View>
        )}

        {/* Links */}
        <View style={AuthStyles.linkContainer}>
          <Link href="/(auth)/login" asChild>
            <Pressable accessibilityRole="button">
              <Text style={AuthStyles.link}>
                {t('back_to_login', '로그인으로 돌아가기')}
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
