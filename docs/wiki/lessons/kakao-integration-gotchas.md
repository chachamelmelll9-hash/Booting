---
type: Lesson
title: 카카오 연동에서 실제로 걸린 것
description: 로그인(KOE004·OIDC·키 해시·이메일 권한), 공유(도메인·버튼·콜백 3초·콜백 중복·카톡 1대 로그인), SDK(호출 시점 require, scopes 제약). 에러 문자열이 다음 조치를 말해 준다.
tags: [lesson, kakao]
sources:
  - id: cb0cac4d
    resource: commit:b0cac4d
  - id: c3a3911e
    resource: commit:3a3911e
  - id: ca7f65b8
    resource: commit:a7f65b8
  - id: cfd26cb7
    resource: commit:fd26cb7
  - id: cf4fc66e
    resource: commit:f4fc66e
  - id: cefac7c4
    resource: commit:efac7c4
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 카카오 연동

## 로그인

| 에러/증상 | 뜻 | 조치 |
|---|---|---|
| `KOE004` (서비스 설정 오류) | 콘솔 > 카카오 로그인 **활성화** 가 꺼짐 | 켜기. 앱은 이 문자열을 그대로 보여준다 (`b0cac4d` — try 하나로 다 감싸 "오류가 발생했습니다" 만 띄우던 걸 SDK 실패를 분리) |
| `login()` 이 `idToken` 을 안 줌 → Supabase "Invalid token" | **OpenID Connect** 가 꺼짐 (로그인 활성화와 별도 스위치) | 켜기. 개발 빌드는 `id_token` 의 `aud` 를 로그에 찍는다 — Supabase provider `client_id` 와 맞춰야 한다 |
| `android keyhash mismatched! caller=<해시>` | 플랫폼에 그 키 해시가 없음 | 문자열의 해시를 콘솔에 등록. 디버그·릴리스 각각 |
| `'카카오계정(이메일)' 권한 없음` | `account_email` 은 **비즈니스 앱** 전용 | 이메일로 계정 병합 불가 → `sub` 연결 ([kakao-login-account-link](../concepts/kakao-login-account-link.md)) |
| `'prompts' and 'scopes' cannot be passed if useKakaoAccountLogin is false` | `login({scopes})` 는 카톡 앱 로그인과 못 쓴다 | scopes 제거. 추가 동의는 `loginWithNewScopes` 로 — 그것도 **로그인 뒤에만** (`Access token not found. You must login first`, `efac7c4`). `isLogined()` 는 저장 토큰 유무만 봐서 믿을 수 없다 — 동의 조회를 한 번 해 보고 판단 |
| `KakaoTalk is installed but not connected to Kakao account` | 기기의 카톡이 로그아웃 상태 (새 기기·재설치·에뮬레이터) | 이 오류일 때만 카카오계정(웹) 로그인으로 재시도 (`f4fc66e`) |
| 취소했는데 오류 토스트 | 취소를 실패로 처리 | 취소는 빈 문자열 → 아무것도 안 띄움 |

## 공유

| 증상 | 뜻 | 조치 |
|---|---|---|
| 카드 링크를 눌러도 아무 일 없음, 로그 `kakao…://kakaolink → INTENT_NOT_RESOLVED`(-91) | 카드 링크는 **콘솔에 등록된 도메인**만 열린다 | 도메인 등록(배포 후). 그때까지 동의 링크는 카드 대신 **일반 메시지**로 (`dfb7e40`) |
| 카드에 '자세히 보기' 가 자꾸 붙음 / 눌러도 아무 데도 안 감 | `buttons: []` 로도 기본 버튼은 안 사라진다 (SDK 문서). `content.link` 가 비면 죽은 버튼 | 버튼과 갈 곳을 **`buttons` 목록으로 명시** |
| 아이폰에서 버튼이 아예 안 나옴 | `buttonTitle` + 앱 실행 파라미터만 있고 iOS 플랫폼도 없어 카카오가 "갈 곳 없는 버튼" 을 지움 | 웹 주소(`webUrl`)를 준다 (`fd26cb7`) |
| 카톡 미설치 기기에서 카카오 **로그인 웹페이지**로 끌려감 | `useWebBrowserIfKakaoTalkNotAvailable: true` | `false` — 실패시켜서 "카카오톡을 열지 못했습니다" 를 말한다 |
| 콜백이 안 옴 | (a) 콘솔 콜백 URL 이 죽은 터널 (b) 3초 안에 2XX 못 받으면 실패 (c) 서버가 옛 빌드 | (a) 주소 갱신 (b) 기록 전에 응답, GET 도 받음 (`a7f65b8`) (c) 재기동 |
| 시스템 메시지가 두 번 / 안 찍힘 | 카카오는 **보낸 대화방 수만큼** 콜백 / 기록이 컨트롤러에만 있었다 | `markParentShare` 한 곳, insert 23505 로 첫 번만 (`05167a1`) |
| 공유 눌렀다 나오면 '완료' | SDK 는 넘겼다까지만 안다 | 완료는 콜백만 ([결정](../decisions/2026-09-03-share-complete-only-via-kakao-callback.md)) |
| 개발 기기에서 카드를 볼 수 없음 | 카톡은 **폰 1대**만 로그인 | '나에게 보내기'(REST, `talk_message` 동의) — 카드는 본인 카톡 '나와의 채팅' 으로 |
| `talk_message` 없음 에러 | 콘솔 동의항목 미설정 | 문자열이 알려주는 항목을 켠다 |

## SDK 일반

- `@react-native-kakao/*` 는 **호출 시점에 `require`**. 최상단 import 는 네이티브가 링크되지 않은 빌드에서 번들 평가 중 터져 앱 전체가 안 뜬다 (`756be1d`).
- 네이티브 키는 `app.json` 에 직접 넣지 않는다(커밋됨). `app.config.ts` 가 빌드 시 env 로 치환.
- 공유용 키가 로그인 버튼까지 켠다 → 로그인은 `EXPO_PUBLIC_KAKAO_LOGIN` 으로 따로 (`277ced2`).
- 웹훅 등록·테스트에는 공개 주소가 필요 → `cloudflared`.

## 관련

[kakao-developers](../entities/kakao-developers.md) · [parent-share-kakao](../concepts/parent-share-kakao.md)
