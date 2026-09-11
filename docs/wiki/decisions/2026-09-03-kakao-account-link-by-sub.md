---
type: Decision
title: 카카오 계정을 이메일 대신 회원번호(sub)로 연결한다
description: 카카오가 이메일을 주지 않아(비즈니스 앱 전용) 기존 계정과 자동 병합이 불가능하다. 로그인한 상태에서 id_token 의 sub 를 서버가 JWKS 로 검증해 계정에 붙이고, 로그인 때는 Supabase 보다 먼저 서버에 묻는다.
tags: [decision, kakao, auth]
sources:
  - id: c7f93c40
    resource: commit:7f93c40
  - id: cb0cac4d
    resource: commit:b0cac4d
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 카카오 계정 연결

## 배경
카카오 로그인을 붙이자 이메일로 가입한 사람이 카카오로 들어오면 계정이 하나 더 생겼다. Supabase 는 이메일이 같으면 붙여 주지만 카카오 콘솔의 `account_email` 이 '권한 없음'(비즈니스 앱 전용). 소유자: "카카오계정(이메일) account_email 권한 없음 이렇게떠서 선택동의 못해", "나 사업자없고 그냥 알아서 햐주면 안돼?".

## 결정
- 카카오가 **항상** 주는 값 `id_token.sub` 를 쓴다. `social_identities (provider, provider_uid) PK`.
- 연결은 **로그인한 상태에서** (내 정보 > 계정 > 카카오 계정 연결) — 지금 로그인해 있다는 것이 이 계정의 주인이라는 증거.
- 로그인 때는 Supabase 보다 **먼저** `POST /auth/kakao/resolve` — 연결이 있으면 그 계정의 세션(magiclink 발급 후 즉시 검증 — GoTrue 에 "이 유저로 로그인" 관리자 API 가 없다), 없으면 하던 대로 Supabase provider.
- 서버가 `id_token` 을 카카오 JWKS 로 검증하고 `aud === 앱 키`. 앱이 보낸 값을 믿으면 아무 sub 나 적어 남의 계정을 연다.
- 이미 다른 계정이 쓰는 카카오는 **409**. RLS 켜고 정책 없음(서버 전용).
- 이메일 없는 계정은 카카오 닉네임(`displayName`)으로 부른다.

## 버린 대안
- `login({ scopes: ['account_email'] })` — 카톡 앱 로그인과 함께 못 쓰고 웹 계정 로그인으로 바꿔야 한다. 카톡으로 바로 되던 로그인을 아이디·비밀번호 입력으로 되돌릴 수 없다.
- 비즈니스 앱 전환 — 사업자등록이 없다.

## 이후
이 유일성이 [계정 확인](2026-09-08-real-phone-verification-then-kakao-check.md) 의 근거가 됐다. 관련: [kakao-login-account-link](../concepts/kakao-login-account-link.md).
