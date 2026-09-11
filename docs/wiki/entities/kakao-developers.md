---
type: Entity
title: 카카오 개발자 콘솔 설정
description: 앱 키 하나로 공유·로그인·계정 확인 셋을 한다. 콘솔 스위치가 각각 따로 있고, 비즈니스 앱(사업자등록) 이 아니라 이메일·전화번호 동의항목은 열리지 않는다.
tags: [entity, kakao, external]
sources:
  - id: c756be1d
    resource: commit:756be1d
  - id: cb0cac4d
    resource: commit:b0cac4d
  - id: c7f93c40
    resource: commit:7f93c40
  - id: c46a5735
    resource: commit:46a5735
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 카카오 개발자 콘솔

앱: 카카오 개발자 콘솔의 부팅 앱. 소유자는 **개인 개발자(사업자등록 없음)** — 이것이 아래 한계의 뿌리다.

## 키

- **네이티브 앱 키** 하나. 앱은 `EXPO_PUBLIC_KAKAO_NATIVE_KEY`(빌드 시 `app.config.ts withKakaoKey` 가 `app.json` 의 `__KAKAO_NATIVE_APP_KEY__` 치환), 서버는 `KAKAO_NATIVE_APP_KEY`(id_token `aud` 검증). **같은 값**이어야 한다.
- 키는 위키에 적지 않는다.

## 콘솔 스위치와 의존 기능

| 콘솔 항목 | 상태 | 없으면 |
|---|---|---|
| 앱 설정 > 플랫폼 > Android `com.booting.app` + **디버그 키 해시** | 등록됨 | SDK 가 `android keyhash mismatched! caller=…` 로 거부 — 이 문자열에 등록할 해시가 그대로 나온다 |
| 플랫폼 > **릴리스 키스토어 키 해시** | **미등록** | 스토어 빌드에서 공유·로그인 전부 실패 |
| 플랫폼 > iOS | 없음 (이 머신에서 iOS 빌드 불가) | 아이폰에서 카드 버튼 렌더에 영향 (실측: 앱 실행 링크만 있으면 버튼이 안 나옴) |
| 플랫폼 > **Web 도메인** | **미등록** (도메인 없음) | 카드의 웹 링크가 카톡에서 안 열림 (`INTENT_NOT_RESOLVED`). 동의 링크를 카드가 아니라 메시지로 보내는 이유 |
| 제품 설정 > **카카오 로그인 활성화** | 켜짐 (09-03) | `KOE004` |
| 카카오 로그인 > **OpenID Connect** | 켜짐 | `login()` 이 `idToken` 을 안 줌 → Supabase 세션 불가 |
| 카카오 로그인 > 동의항목: 닉네임(필수), 프로필 사진(선택) | | |
| 동의항목 **이메일 `account_email`** | **'권한 없음'** — 비즈니스 앱 전용 | 이메일로 계정 병합 불가 → `sub` 연결 ([결정](../decisions/2026-09-03-kakao-account-link-by-sub.md)) |
| 동의항목 **전화번호** | 비즈니스 앱 전용 | 본인확인에 전화번호 못 씀 → '계정 확인' 으로 문구 축소 |
| 동의항목 `talk_message` (카카오톡 메시지 전송) | 켜짐 (09-04) | 개발 빌드 '나에게 보내기' 불가 |
| 제품 설정 > **카카오톡 공유 > 서버 콜백** | 등록됨 — 개발 터널 주소 | 공유 완료가 영영 안 찍힘. **터널 재시작마다 주소가 바뀌어 콘솔을 손으로 고쳐야 한다** → 배포 도메인으로 교체 예정 |

## SDK

`@react-native-kakao/core|share|social|user` 2.4.x. 플러그인 `withKakaoMaven`. `kakao{앱키}://kakaolink` 인텐트 필터(`withKakaoLinkScheme`)는 앱 부모님 화면 삭제 후 미사용. 모듈은 **호출 시점에 `require`** — 최상단 import 는 네이티브가 없는 빌드에서 번들 평가 중 터진다.

## Supabase 쪽

개발 프로젝트 Auth > Providers > Kakao: `external_kakao_enabled=true`, `client_id`=네이티브 앱 키, `email_optional=true`(카카오가 이메일을 안 주므로). 운영 프로젝트에도 필요 ([supabase-projects](supabase-projects.md)).

## 관련

[parent-share-kakao](../concepts/parent-share-kakao.md) · [kakao-login-account-link](../concepts/kakao-login-account-link.md) · [kakao-integration-gotchas](../lessons/kakao-integration-gotchas.md)
