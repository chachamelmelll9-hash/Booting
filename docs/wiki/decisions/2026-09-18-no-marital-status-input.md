---
type: Decision
title: 사별/이혼 여부를 입력받지 않는다 — 시작 화면에서 자격 확인만
description: 어느 쪽인지는 부모님의 가족사라 남에게 알리고 싶지 않은 값이다. 자격(사별 또는 이혼만)은 자녀가 문장을 읽고 "네, 해당됩니다" 로 확인하고, 카드·상세·부모님 화면·필터에서 혼인 상태를 전부 뺀다.
tags: [decision, privacy, onboarding]
sources:
  - id: c264bbae
    resource: commit:264bbae
  - id: session
    resource: session:53a351c6
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-18T13:30:00+09:00
status: stable
---

# 사별/이혼 여부 입력 폐지

## 배경
1단계 화면이 사별/이혼/별거/혼인 중 가운데 하나를 고르게 했다. 소유자(09-18): "처음에 사별/이혼 등 상태 탭 없애자는 의견이 있는데" → "민감정보라 오픈하고 싶지 않은 경우는?" → "탭은 없애되 같은 시작 화면에 팝업으로 사별·이혼은 가능하나 별거·혼인 유지면 불가하다 띄우는 거 어때".

## 결정
- **어느 쪽인지 묻지 않는다.** 1단계에 안내 상자 — "등록하실 수 있는 부모님은 사별 또는 이혼하신 분입니다. 별거 중이시거나 혼인 관계가 유지되는 경우에는 등록하실 수 없습니다." + "네, 해당됩니다" 버튼. 팝업이 아니라 화면 안 단계로 둔다(팝업은 안 읽고 닫힌다).
- 서버 `CreateParentProfileDto.eligibilityConfirmed`(=true 필수), `parent_profiles.eligibility_confirmed_at` 기록. `marital_status` 는 NOT NULL 해제하고 값을 받지 않는다 (컬럼·옛 값은 남김).
- 응답·카드·상세·부모님 웹·카톡 요약·미리보기에서 `maritalStatus`/`maritalSince` 제거. 추천 필터의 혼인 조건(`maritalFilter`) 제거, 저장된 값은 null 로.
- 옛 버전은 브랜치 `이혼사별여부있음` 에 보존.

## 버린 대안
- **입력은 받되 공개 여부 스위치** — 필터에서 비공개 프로필을 제외하는 방식까지 설계했으나, 값을 아예 저장하지 않는 쪽이 단순하고 유출 걱정이 없다.
- **자리만 뒤로 옮기고 말투만 바꾸기** — 여전히 아픈 사연을 고르게 한다.

## 근거
자격을 가르는 데는 "둘 중 하나" 라는 사실만 있으면 된다. PRD 원칙 4(사별 또는 이혼만)는 그대로 지켜지고, 현재 입력도 어차피 자기 신고였다. 잃는 것: 상대 자녀가 사별인지 이혼인지 볼 수 없고, 사별만/이혼만 필터가 사라진다 — 소유자가 받아들였다.

## 이후
`prd.md` 5장·8장·`docs/features/*` 의 혼인 상태 표기·필터 서술은 옛 것이다 — [open-questions](../open-questions.md). 관련: [child-driven-matching](../concepts/child-driven-matching.md), [discovery-ranking](../concepts/discovery-ranking.md), [privacy-rules](../concepts/privacy-rules.md).
