---
type: Decision
title: 모든 프로필에 사주가 있다, 공개 여부는 묻지 않고 is_public 은 항상 false
description: 생년월일이 필수라 사주는 언제나 세울 수 있다 — saju_infos 는 보정값일 뿐. 입력은 생년월일 바로 아래로 옮겼고, '공개 여부' 토글이 실제로 열던 문(RLS)을 확인해 항상 닫았다.
tags: [decision, saju, privacy]
sources:
  - id: c0bf9813
    resource: commit:0bf9813
  - id: cfa732ae
    resource: commit:fa732ae
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 전원 사주, is_public 항상 false

## 배경
받은 관심 카드에 '사주 없음' 이 있었다. 소유자: "사주없음이 왜잇어? 무조건생년월일을 받는데???" → "공개여부 선택없이 무조건 공개해야하는거 아니야? 핵심기능인데.. 그리고 사주정보로 따로뺴는게 아니라 생년월일 받을떄 양력/음력 물어보고 그 아래 태어난시간까지 받아야지(모름필요)" → "생년 월일 받을떄 밑에 사주 기반으로 프로필추천 및 궁합점수가 표시됩니다. 요거 안내해야할것같아!!!!!".

## 결정
1. **`saju_infos` 행이 없어도 팔자를 세운다** — `SajuService.pillarsFor` 가 `parent_profiles.birth_date` 를 양력·시각 모름으로 읽어 폴백. 마이그레이션·백필 불필요. '사주 없음' 은 데이터가 없어서가 아니라 내가 만든 스위치 때문이었다. 입력의 '입력 안 함' 칩 제거, 기본 양력.
2. 사주 입력을 소개글 뒤 별도 섹션에서 **기본정보 생년월일 바로 아래**로. 안내 문구 "이 날짜로 사주를 세웁니다. 사주를 기반으로 프로필을 추천해드리고 상대 부모님과의 궁합 점수를 보여드립니다."
3. **공개 여부 선택 삭제.** 궁합은 핵심 기능이라 켜고 끄는 값이 아니다. 그런데 그 토글이 실제로 켜고 끈 것은 궁합이 아니라 **상세 하단에 원본 생년월일·출생시각을 찍을지**였다. 무조건 공개면 전원의 정확한 생년월일이 공개된다 — PRD 7 이 비공개로 못박은 값. 그래서 **반대로 닫았다**: `PublicProfileDto.saju` 제거, 상세 '사주 정보' 섹션 제거, `SajuInput.isPublic` 제거, 서버가 **`is_public: false` 를 항상** 쓰고 시드도 전부 내림.
4. 왜 컬럼 값이 중요한가: 이 컬럼이 실제로 여는 문은 RLS 정책 `saju_public_read` — true 면 우리 API 가 원본을 안 내보내도 인증된 아무나 PostgREST 로 그 행을 직접 읽는다.

## 근거
"팔자를 세우는 데 더 필요한 것은 양·음력과 출생시각뿐이고 둘 다 기본값이 있다. 그러니 `saju_infos` 는 없어도 되는 보정값이지 사주의 유무를 가르는 값이 아니다." 상대에게 나가는 사주 값은 일주와 점수뿐이라 켜고 끌 것이 남지 않는다.

## 실측
시드 27개 공개 프로필: 사주 없는 프로필 5 → 0. PRD 7 표에 '생년월일·출생시각 비공개(사주도 예외 아님)' 명시. 관련: [privacy-rules](../concepts/privacy-rules.md), [supabase-and-migrations](../lessons/supabase-and-migrations.md).
