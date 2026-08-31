# WebView Authentication Bridge

## Overview

Mobile 앱에서 로그인한 사용자의 세션(accessToken)을 WebView에 전달하여, 인증되지 않은
사용자는 WebView 콘텐츠에 접근할 수 없도록 한다. 토큰 갱신/로그아웃 처리는 Mobile이
담당하고, WebView는 401 발생 시 Mobile에 위임한다.

### 요구사항

- Mobile 로그인 성공 시 WebView도 인증된 상태로 동작
- 비로그인 사용자는 WebView 콘텐츠 접근 불가
- 세션 만료 시 Mobile이 토큰 갱신 또는 로그아웃을 결정하고 WebView에 통지
- 보안: 토큰이 URL에 노출되지 않아야 함 (postMessage 사용)

---

## 아키텍처

```
┌────────────────────────── MOBILE APP ──────────────────────────┐
│  useAuthStore ──▶ WebViewEntryScreen ──▶ react-native-webview  │
│  (tokenStorage)   (onMessage/postMessage)                      │
└──────────────────────────────┬─────────────────────────────────┘
                               │  packages/webview-bridge 타입
┌──────────────────────────────┴─────────────────────────────────┐
│                        WEBVIEW APP (apps/webview)              │
│  features/session/lib/bridge.ts      (useBridgeStore, 리스너)  │
│  features/session/model/useSessionStore.ts (accessToken 보관)  │
│  features/session/ui/SessionGuard.tsx      (라우트 가드)       │
│  shared/api/server.ts                (serverFetch, 401 재시도) │
└─────────────────────────────────────────────────────────────────┘
```

## 메시지 프로토콜

타입 정의의 단일 소스는 `packages/webview-bridge/src/lib/types.ts`이다.
프로토콜 버전·호환성(additive-only) 규칙은 `packages/webview-bridge/README.md` 참조.

```typescript
export const BRIDGE_PROTOCOL_VERSION = 1;

// Mobile → WebView
export type MobileToWebViewMessage =
  | { type: 'SESSION'; accessToken: string | null; language?: 'ko' | 'en' }
  | { type: 'TOKEN_UPDATE'; accessToken: string }
  | { type: 'LANGUAGE_UPDATE'; language: 'ko' | 'en' }
  | { type: 'LOGOUT' };

// WebView → Mobile
export type WebViewToMobileMessage =
  | { type: 'WEBVIEW_READY'; protocolVersion: number }
  | { type: '401'; code: AuthErrorCode; message: string }
  | { type: 'SIGN_OUT_REQUEST' };

export type AuthErrorCode = 'token_expired' | 'token_invalid' | 'token_revoked';
```

## 흐름

### 1. 핸드셰이크 & 세션 전달

1. WebView 로드 → `useBridgeStore.initializeListener()`가 message 리스너 등록 후
   `{ type: 'WEBVIEW_READY', protocolVersion }` 전송.
2. `SESSION` 수신 전까지 3초 간격으로 `WEBVIEW_READY` 재전송
   (Mobile 리스너가 늦게 붙는 레이스 대비). 그동안 `SessionGuard`는 로딩 유지.
3. Mobile은 `WEBVIEW_READY` 수신 시 `SESSION`(accessToken + language) 전송.
4. WebView는 accessToken을 `useSessionStore`(메모리)에 저장하고, language를
   i18n에 반영. localStorage에는 저장하지 않는다.

### 2. 라우트 가드 (SessionGuard)

- 초기화 전(`isInitialized === false`): 로딩 오버레이 표시.
- WebView 환경 + 미인증: "로그인 필요" 안내 표시.
- 브라우저 직접 접근(비 WebView): dev에서는 통과, prod에서는 `/unauthorized`로
  리다이렉트. (비 WebView 환경은 3초 타임아웃 후 초기화 완료 처리)

### 3. 401 처리 (serverFetch)

`apps/webview/src/shared/api/server.ts`:

1. API 응답이 401이면 Mobile에 `{ type: '401', code, message }` 전송.
2. 단일 in-flight refresh Promise로 Mobile의 응답을 대기
   (동시 다발 401이어도 '401' 신호는 1회만 전송).
   - `TOKEN_UPDATE` 수신(스토어의 accessToken 변경) → 원 요청 1회 자동 재시도.
   - `LOGOUT` 수신(세션 클리어) 또는 10초 타임아웃 → reject.
3. Mobile 측(`WebViewEntryScreen`)은 `code === 'token_expired'`면 refresh API로
   토큰 갱신 후 `TOKEN_UPDATE`, 그 외(`token_invalid`/`token_revoked`) 또는 갱신
   실패 시 로그아웃 처리 후 `LOGOUT`을 보낸다.

### 4. 로그아웃

- Mobile에서 로그아웃 → `LOGOUT` 전송 → WebView 세션 클리어.
- WebView에서 로그아웃 요청 → `SIGN_OUT_REQUEST` 전송 → Mobile이 로그아웃 처리.

## 보안

- 토큰은 postMessage로만 전달하고 URL·localStorage에 노출하지 않는다.
- WebView 측 message 리스너는 origin이 빈 값(RN WebView 주입) 또는 자체 오리진인
  이벤트만 처리하고, `isMobileToWebViewMessage` 타입가드를 통과한 메시지만 처리한다.
- `apps/webview/public/_headers`로 `Content-Security-Policy: frame-ancestors 'none'`
  및 `X-Frame-Options: DENY`를 배포해 서드파티 iframe 임베드를 차단한다.
- 모르는 메시지 타입은 무시하되 경고 로그를 남긴다 (프로토콜 스큐 감지).

## 관련 파일

| 역할 | 파일 |
| --- | --- |
| 프로토콜 타입 | `packages/webview-bridge/src/lib/types.ts` |
| WebView 브리지 스토어 | `apps/webview/src/features/session/lib/bridge.ts` |
| WebView 세션 스토어 | `apps/webview/src/features/session/model/useSessionStore.ts` |
| 라우트 가드 | `apps/webview/src/features/session/ui/SessionGuard.tsx` |
| API 클라이언트 (401 재시도) | `apps/webview/src/shared/api/server.ts` |
| Mobile WebView 스크린 | `apps/mobile/src/features/webview-entry/ui/WebViewEntryScreen.tsx` |
| 응답 헤더 (임베드 차단) | `apps/webview/public/_headers` |
