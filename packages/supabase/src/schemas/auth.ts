import { z } from 'zod';

// 에러 메시지는 i18n 키로 정의한다. 표시 계층(폼 UI)에서 t()로 변환해야 한다.
// 키는 packages/i18n의 auth 네임스페이스(validation.*)에 정의되어 있다.
export const AUTH_VALIDATION_KEYS = {
  emailInvalid: 'auth:validation.email_invalid',
  passwordMin: 'auth:validation.password_min',
  passwordMismatch: 'auth:validation.password_mismatch',
} as const;

export const loginSchema = z.object({
  email: z.string().email(AUTH_VALIDATION_KEYS.emailInvalid),
  password: z.string().min(8, AUTH_VALIDATION_KEYS.passwordMin),
});

export const signupSchema = z
  .object({
    email: z.string().email(AUTH_VALIDATION_KEYS.emailInvalid),
    password: z.string().min(8, AUTH_VALIDATION_KEYS.passwordMin),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: AUTH_VALIDATION_KEYS.passwordMismatch,
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email(AUTH_VALIDATION_KEYS.emailInvalid),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
