export const AUTH_ERROR_CODES = {
  TOKEN_EXPIRED: 'token_expired',
  TOKEN_INVALID: 'token_invalid',
  TOKEN_REVOKED: 'token_revoked',
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  token_expired: '토큰이 만료되었습니다',
  token_invalid: '유효하지 않은 토큰입니다',
  token_revoked: '세션이 만료되었습니다. 다시 로그인해주세요',
};
