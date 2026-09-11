---
type: Concept
title: 카카오 로그인과 계정 연결
description: 카카오는 이메일을 주지 않아(비즈니스 앱 전용) 기존 이메일 계정과 자동으로 이어지지 않는다. 그래서 id_token 의 sub(회원번호)를 서버가 직접 검증해 계정에 연결하고, 로그인 때는 Supabase 보다 먼저 서버에 묻는다.
tags: [kakao, auth]
sources:
  - id: c277ced2
    resource: commit:277ced2
  - id: cb0cac4d
    resource: commit:b0cac4d
  - id: c7f93c40
    resource: commit:7f93c40
  - id: cf4fc66e
    resource: commit:f4fc66e
  - id: page-map
    resource: /docs/features/page-map.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 카카오 로그인과 계정 연결

## 스위치

- 로그인 버튼은 `EXPO_PUBLIC_KAKAO_LOGIN=true` 일 때만 뜬다. 네이티브 키로 판단하지 않는다 — 그 키는 '부모님께 공유' 에도 쓰여서, 공유만 하려고 키를 넣으면 로그인 버튼이 딸려 나와 KOE004 로 끝났다 (`277ced2`).
- 콘솔 전제 둘: **카카오 로그인 활성화**(없으면 KOE004), **OpenID Connect 활성화**(없으면 `login()` 이 `idToken` 을 안 준다). 별도 스위치다.

## 로그인 흐름 (`features/auth/lib/kakaoAuth.ts`)

```
SDK login()  ── 카톡 앱이 있으면 카톡으로. "installed but not connected" 면 카카오계정(웹) 로그인으로 1회 재시도 (f4fc66e)
  → idToken
  → POST /auth/kakao/resolve (throttled)     ← Supabase 보다 먼저
      연결된 계정이 있으면 → 그 계정의 세션 (issueSessionForUser: generate_link magiclink → /verify — GoTrue 에 "이 유저로 로그인시켜라" 관리자 API 가 없어서)
      없으면 → Supabase signInWithIdToken({ provider: 'kakao' })  → /auth/oauth-callback
  → 이 기기의 부모님 세션 정리(옛 코드, 지금은 없음) → 세션 저장 → (parent-setup)/welcome
```
취소는 실패가 아니다(빈 문자열). SDK 실패는 카카오 메시지를 그대로 보여준다 — KOE 코드가 그 문자열에 있다.

## 계정 연결 (`auth/kakao-link.service.ts`, `social_identities`)

- 왜 필요한가: 이메일로 가입한 사람이 카카오로 들어오면 계정이 하나 더 생겨 "내 데이터가 사라졌다" 가 된다. Supabase 는 이메일이 같으면 자동으로 붙이지만 **카카오가 이메일을 주지 않는다** — `account_email` 동의항목이 비즈니스 앱 전용이라 콘솔에 '권한 없음'. 앱에서 `login({scopes})` 로 요청하는 길도 카톡 앱 로그인과 함께 못 쓴다(라이브러리가 거부).
- **연결은 로그인한 상태에서** 한다: 내 정보 > 계정 > 카카오 계정 연결 (`KakaoLinkRow`). 지금 로그인해 있다는 것 자체가 이 계정의 주인이라는 증거다.
- 서버는 `id_token` 을 카카오 JWKS(`https://kauth.kakao.com/.well-known/jwks.json`)로 검증하고 `aud === KAKAO_NATIVE_APP_KEY` 를 본다. 앱이 보낸 값을 믿으면 아무 `sub` 나 적어 남의 계정을 여는 통로가 된다.
- 이미 다른 계정이 쓰는 카카오면 **409**. 말없이 옮기면 저쪽 사람이 어느 날 카카오로 로그인했다가 남의 계정을 본다.
- 테이블 PK `(provider, provider_uid)`, `unique (user_id, provider)`, RLS 켜고 **정책 없음** — 직접 쓸 수 있으면 남의 계정에 자기 카카오를 붙일 수 있다.
- 이 유일성이 [계정 확인](verification-account-check.md) 의 근거가 됐다 (`46a5735`).

## 이메일 없는 계정

카카오만으로 들어온 사람은 이메일이 빈 문자열이다. 서버가 카카오 닉네임(`displayName`)을 함께 내려 내 정보에서 대신 부르고, 둘 다 없으면 칸을 그리지 않는다.

## 운영 프로젝트에서 확인할 것

09-09 세션은 "카카오 로그인은 Supabase 카카오 provider 를 쓰지 않는다 — 서버가 직접 검증" 이라고 결론냈지만, 위 흐름의 **폴백**(연결 안 된 사람의 첫 로그인)은 `signInWithIdToken` 이라 provider 설정(`external_kakao_enabled`, `client_id`, `email_optional`)이 필요하다. `booting-prod` 에 이 설정이 있는지 확인 필요 — [open-questions](../open-questions.md).

## 관련

[결정](../decisions/2026-09-03-kakao-account-link-by-sub.md) · [kakao-developers](../entities/kakao-developers.md) · [kakao-integration-gotchas](../lessons/kakao-integration-gotchas.md) · `docs/auth-architecture.md`(템플릿 인증 구조)
