---
type: Concept
title: 개인정보 공개 범위와 지키는 방법
description: PRD 7장이 정한 비공개 표와, 그것을 서버 DTO·RLS·테스트로 실제로 막는 지점. 부모님께 한 약속 "실명·생년월일·연락처·정확한 주소는 공개되지 않습니다" 가 기준이다.
tags: [privacy, security]
sources:
  - id: prd7
    resource: /prd.md
  - id: privacy-ts
    resource: /apps/server/src/common/privacy.ts
  - id: sec-tests
    resource: /docs/features/test-scenarios.md
  - id: cfa732ae
    resource: commit:fa732ae
  - id: c7f93c40
    resource: commit:7f93c40
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 개인정보 공개 범위

## 무엇이 누구에게 나가나

| 정보 | 다른 자녀(추천·상세·대화) | 상대 부모님(웹) | 본인(`GET /parent-profile`) |
|---|---|---|---|
| 실명 `display_name` | ✗ | ✗ | ✓ |
| 별명 | ✓ | ✓ | ✓ |
| 생년월일·출생시각 | ✗ (**나이만**) | ✗ | ✓ |
| 사주 | 일주 + 궁합 점수만 | 같음 | 양음력·시각 |
| 네 기둥 | ✗ | ✗ | (계산만) |
| 거주지 | 시·군·구 + 거리 km | 시·군·구 | 전체 |
| 정확한 주소·실시간 위치 | ✗ (수집 자체를 안 한다 — 지역 코드만) | ✗ | — |
| 휴대폰 번호 | ✗ | **매칭된 뒤에만, 양쪽에 전체 번호** | ✓ |
| 자녀 수·동거 가족 | 상세에서만 (카드·필터 ✗) | 상세 | ✓ |
| 키 | 상세에서만 | 상세 | ✓ |
| 사진 | 서명 URL | 서명 URL | ✓ |
| 검수 상태 `badges.review` | 화면에 안 그림 | — | '다시 공개하기' 조건으로만 |
| 가족관계증명서 | (폐지) | | |
| 이메일·카카오 회원번호 | ✗ | ✗ | 이메일/표시명 |

동의 페이지와 부모님 웹 하단 문구: **"실명·생년월일·연락처·정확한 주소는 공개되지 않습니다."**

## 어디서 막나 — 층별

1. **서버 DTO 정제가 1차**. `DiscoveryService.toItems` 하나가 카드·받은 관심·인연·부모님 웹에 다 쓰인다. 실명·생년월일·연락처는 DTO 타입에 **필드 자체가 없다**. 클라이언트 가공은 API 를 직접 부르면 우회된다 (`architecture.md` 결정 로그).
2. **`userId` 스코프**. 모든 서비스 조회가 where 에 사용자를 넣는다 (IDOR). RLS 는 2차 방어선이지 유일한 방어선이 아니다.
3. **RLS 가 2차**. 공개 프로필은 `status='published'` 행만 select. `saju_infos.is_public` 은 **항상 false** — true 면 우리 API 가 안 내보내도 PostgREST 로 원본 날짜가 읽힌다 (`fa732ae` 에서 발견·차단). `social_identities` 는 RLS 만 켜고 **정책을 두지 않는다** — service key 외에는 닿지 못한다 (`7f93c40`).
4. **Storage** 는 비공개 버킷 + 서명 URL.
5. **테스트** — `test-scenarios.md` SEC.1~4(+SEC.5 사주 비공개): 응답 본문에 실명·생년월일·연락처·주소·증명서 경로가 **없음**을 grep. `scripts/smoke-api.mjs` 가 같은 검사를 API 로 돈다.

## 매칭 후 연락처

양쪽 부모님이 모두 눌렀을 때만 `partnerPhone` 이 응답에 실리고, 부모님 웹에 전체 번호로 뜬다. 안심번호(가상번호)는 유료 서비스라 소유자가 보류했다 (09-10) — 그대로 실제 번호를 보여준다. 09-11 재확인: "전화번호 웹에서 전체 다 보여야하고".

## 관련 법 항목 (동의 문안이 다루는 것)

개인정보보호법 제15조 2항(목적·항목·기간), 제17조 2항(제3자 제공), 제22조, 제35~37조·제39조의7(권리) — [parent-consent](parent-consent.md).

## 이 위키의 규칙

세션 기록에 찍힌 비밀값·개인정보는 위키에 옮기지 않는다 ([schema](../schema.md)). 노출 사실은 [open-questions](../open-questions.md) 에 적는다.

## 관련

[nickname-privacy](nickname-privacy.md) · [saju-compatibility](saju-compatibility.md) · [parent-web-view](parent-web-view.md) · [kakao-login-account-link](kakao-login-account-link.md)
