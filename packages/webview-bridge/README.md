# webview-bridge

Mobile(React Native WebView) ↔ WebView(React) 통신 브리지의 메시지 프로토콜 정의.

## Protocol

현재 프로토콜 버전: `BRIDGE_PROTOCOL_VERSION = 1`

### 핸드셰이크

1. WebView가 로드되면 `{ type: 'WEBVIEW_READY', protocolVersion }`을 Mobile로 전송한다.
2. Mobile은 `WEBVIEW_READY` 수신 시 `SESSION` 메시지로 응답한다. `protocolVersion`이
   자신이 아는 버전보다 높으면 경고 로그를 남긴다(OTA-웹뷰 버전 스큐 감지).
3. WebView는 `SESSION`을 수신할 때까지 `WEBVIEW_READY`를 주기적으로 재전송한다
   (Mobile 리스너가 늦게 붙는 레이스 대비).

### Mobile → WebView

| type | payload | 설명 |
| --- | --- | --- |
| `SESSION` | `accessToken: string \| null`, `language?: 'ko' \| 'en'` | 세션 전달 (null이면 미인증) |
| `TOKEN_UPDATE` | `accessToken: string` | 토큰 갱신 성공 시 새 토큰 전달 |
| `LANGUAGE_UPDATE` | `language: 'ko' \| 'en'` | 언어 변경 알림 |
| `LOGOUT` | — | 로그아웃 명령 |

### WebView → Mobile

| type | payload | 설명 |
| --- | --- | --- |
| `WEBVIEW_READY` | `protocolVersion: number` | 핸드셰이크 (로드 완료) |
| `401` | `code: AuthErrorCode`, `message: string` | API 401 발생, 토큰 갱신 위임 |
| `SIGN_OUT_REQUEST` | — | 로그아웃 요청 |

## 호환성 규칙 (additive-only)

Mobile 앱은 OTA/스토어 배포, WebView는 웹 배포로 **서로 다른 시점에 배포**된다.
구버전 앱 ↔ 신버전 웹 조합이 항상 존재하므로 프로토콜 변경은 아래 규칙을 따른다.

- **허용 (additive)**: 새 메시지 타입 추가, 기존 메시지에 *optional* 필드 추가.
  이때 `BRIDGE_PROTOCOL_VERSION`을 1 올린다.
- **금지 (breaking)**: 기존 메시지 타입 삭제·이름 변경, 기존 필드 삭제·타입 변경,
  optional 필드의 required 전환.
- 수신 측(양쪽 모두)은 모르는 메시지 타입을 **무시하되 경고 로그**를 남긴다
  (switch의 default 분기). 절대 throw하지 않는다.
- 브리지 타입에 정의된 메시지는 반드시 양쪽 핸들러에 구현되어야 한다
  (데드 타입 금지).

## Building

```bash
pnpm turbo build --filter=@chachamelmelll9-hash-service/webview-bridge
```
