// 브리지 프로토콜 버전 — WEBVIEW_READY 핸드셰이크에 실어 보낸다.
// 메시지 타입 추가/필드 추가 등 additive 변경 시에만 올린다 (README 참조).
export const BRIDGE_PROTOCOL_VERSION = 1;

// 브리지가 지원하는 언어 (packages/i18n의 SUPPORTED_LANGUAGES와 동일해야 함)
export type BridgeLanguage = 'ko' | 'en';

// 401 에러 코드
export type AuthErrorCode = 'token_expired' | 'token_invalid' | 'token_revoked';

// Mobile → WebView 메시지
export type MobileToWebViewMessage =
  | { type: 'SESSION'; accessToken: string | null; language?: BridgeLanguage }
  | { type: 'TOKEN_UPDATE'; accessToken: string }
  | { type: 'LANGUAGE_UPDATE'; language: BridgeLanguage }
  | { type: 'LOGOUT' };

// WebView → Mobile 메시지
export type WebViewToMobileMessage =
  | { type: 'WEBVIEW_READY'; protocolVersion: number }
  | { type: '401'; code: AuthErrorCode; message: string }
  | { type: 'SIGN_OUT_REQUEST' };

// Union type
export type BridgeMessage = MobileToWebViewMessage | WebViewToMobileMessage;

// Message type guards
export function isMobileToWebViewMessage(
  message: unknown
): message is MobileToWebViewMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    ['SESSION', 'TOKEN_UPDATE', 'LANGUAGE_UPDATE', 'LOGOUT'].includes(
      (message as { type: string }).type
    )
  );
}

export function isWebViewToMobileMessage(
  message: unknown
): message is WebViewToMobileMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    ['WEBVIEW_READY', '401', 'SIGN_OUT_REQUEST'].includes(
      (message as { type: string }).type
    )
  );
}
