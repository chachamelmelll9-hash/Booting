---
type: Concept
title: 계정 확인 (본인인증의 현재 모습)
description: '자녀 본인인증 + 가족관계증명서' 에서 출발해, 증명서는 폐지되고 문자 인증은 사업자가 없어 막혀 있고, 지금은 카카오 계정 연결이 계정 확인의 유일한 문이다. 이름도 '계정을 한 번 확인합니다' 로 바뀌었다.
tags: [verification, auth]
sources:
  - id: c2872f05
    resource: commit:2872f05
  - id: c2a78a18
    resource: commit:2a78a18
  - id: c3995f52
    resource: commit:3995f52
  - id: ce944130
    resource: commit:e944130
  - id: c46a5735
    resource: commit:46a5735
  - id: c45900cf
    resource: commit:45900cf
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 계정 확인

## 지금 동작 (등록 2/5 단계, `(parent-setup)/verification.tsx`)

- 제목 **"계정을 한 번 확인합니다"** / 안내 "한 분이 계정을 여러 개 만들어 등록하시는 것을 막기 위한 절차입니다".
- 카드 **[카카오로 확인하기]** — 카카오 계정 연결 ([kakao-login-account-link](kakao-login-account-link.md)). "카카오 계정 하나로는 한 분만 등록하실 수 있습니다."
- 휴대폰 문자 항목은 서버가 `phoneAvailable: false`(문자 사업자 없음) 라 **감춰져 있다**. 이미 인증한 사람에게는 계속 보인다.
- 서버 게이트: `canCreateProfile = phoneVerified || kakaoLinked`. 이걸 통과해야 프로필을 만들 수 있다.

## 이 절차가 하는 일과 못 하는 일

| 한다 | 못 한다 |
|---|---|
| 한 사람이 계정을 여러 개 만드는 것을 막는다 — `social_identities` PK `(provider, provider_uid)` 로 카카오 계정 하나는 부팅 계정 하나에만 붙는다 | **실명·전화번호·CI 를 받지 못한다.** 카카오 `phone_number` 동의항목은 비즈니스 앱(사업자등록) 전환이 필요하고, 실명·CI 는 본인확인 서비스 계약이 따로 필요하다 |
| | '진짜 자녀인가' — 이건 **부모님 본인의 동의**가 맡는다 ([parent-consent](parent-consent.md)) |

그래서 문구를 바꿨다. "자녀분 본인 확인 / 실제 자녀인지 확인합니다" 는 하지 않는 일을 한다고 말하는 문장이었다 (`46a5735`, 헤더도 `703383a`).

## 변천

| 날짜 | 상태 | 커밋 |
|---|---|---|
| 08-31 PRD | 휴대폰 본인인증 + 가족관계증명서 제출(MVP 자동 승인, TODO-05) | |
| 09-01 | **개발 스텁** — 숫자면 통과 (에뮬레이터는 문자를 못 받는다). 되돌릴 정규식을 주석에 남김 | `2872f05` |
| 09-04 | **가족관계증명서 폐지.** 남의 부모님 등록을 막는 실제 장치는 부모님 동의다. 증명서는 서류 한 장을 더 얹었을 뿐인데 등록하려는 자녀 모두를 주민센터로 보냈다. 배지도 '부모님 동의' 하나로 | `2a78a18` |
| 09-08 | **문자 인증 실물화** — 6자리 `randomInt`, **서버 비밀을 섞은 해시로만 저장**(100만 가지라 소금 없는 해시는 표로 뒤집힌다), 3분 만료·5회 시도·60초 재발송, 틀린 이유를 나눠 알리지 않음, 통과 시 코드 즉시 폐기, 번호 형식 `01[016789]…`, 번호당 계정 1개(부분 유니크 인덱스). `SmsService` 는 키가 없을 때 **개발: 로그에 코드 / 운영: 던진다** — 조용히 통과시키면 아무도 확인하지 않는 채로 서비스가 열린다 | `3995f52` |
| 09-08 | 유니크 인덱스는 **배포 직전으로 미룸** — 스텁 시절 `01000000000` 에 계정 14개가 붙어 인덱스 생성이 실패했다. 그때 '스텁 인증 전부 비우기' SQL 을 마이그레이션 파일 안에 주석으로 남겼다 | `e944130` |
| 09-08 | **카카오 연결도 확인으로 인정.** 사업자 계약이 없어 문자를 못 보내는데 스텁으로 되돌리면 아무도 확인하지 않는 상태로 돌아간다 | `46a5735` |
| 09-08 | 문자 사업자 없으면 항목을 감춘다. 사업자가 붙으면 `SMS_PROVIDER` 만 채우면 화면이 저절로 살아난다 | `45900cf` |

## 배포 직전에 할 것

`supabase/migrations/20260908100000_phone_verification_codes.sql` 안의 주석 SQL — 스텁 시절 인증 전부 비우기 + `child_verifications_verified_phone_uniq` 인덱스 생성. 그 시점의 '인증됨' 은 전부 검증된 적 없는 값이라 중복만 고르는 게 아니라 통째로 비우는 것이 맞다.

## PRD 와의 차이

PRD 4.2·4.4·14장은 여전히 가족관계증명서를 말한다 — [open-questions](../open-questions.md).

## 관련

[결정 증명서 폐지](../decisions/2026-09-04-drop-family-certificate.md) · [결정 문자→카카오](../decisions/2026-09-08-real-phone-verification-then-kakao-check.md) · [kakao-developers](../entities/kakao-developers.md)
