---
type: Decision
title: 사주 한 줄은 상대가 보이는 모든 화면에
description: "이미 이어진 뒤에는 점수가 판단을 바꾸지 않는다"며 인연·부모님 화면에서 뺐던 것을 뒤집었다. 매칭 목록·매칭 성공·대화방 헤더·부모님 웹 목록과 상세가 모두 같은 글자를 쓴다.
tags: [decision, saju, ui]
sources:
  - id: caf83491
    resource: commit:af83491
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 전 화면에 사주

## 배경
`b268b8b` 의 경계: "인연 관리 탭에는 넣지 않는다 — 이미 이어진 뒤에는 점수가 판단을 바꾸지 않는다". 소유자(09-10): "매칭된 프로필에서는 사주정보가 하나도 안뜨잖아~~~~~~~~~~~~~~~~~ 자녀화면의 매칭프로필, 부모님한테 공유하는 프로필, 부모화면에서의 프로필도 수정해줘야지".

## 결정
- 매칭(인연) 목록 `ParentProfileCard`, 매칭 성공 화면, 대화방 헤더(상대 이름 아래), **부모님 웹 목록·상세** — 전부 `을사일주 · 궁합 72점`.
- `connections.service.toDto` / `parent.service.webInbox` 가 `toItems` 에 `myProfileId` 를 넘긴다 — 그게 궁합이 계산되는 경계다.
- 부모님 웹은 서버 렌더라 천간·지지 표가 `parent-view.controller.ts` 에도 한 벌. 모바일 `shared/config/saju.ts` 와 **글자가 같아야 한다.** 글자 크기는 앱보다 한 단계 크게(19px).
- 부모님 화면의 궁합은 '부모님 본인과 상대' 의 값 = 자녀가 보는 숫자와 같다.

## 왜 뒤집었나
"틀린 판단이었다. 부모님께 소개하고 만남을 잡는 내내 같은 카드를 보는데 거기서만 사주가 사라지면 기능이 반쯤 빠진 것처럼 보인다." 상대가 보이는 모든 화면이 같은 글자를 써야 같은 사람으로 읽힌다.

## 관련
[saju-compatibility](../concepts/saju-compatibility.md) · [product-principles](../concepts/product-principles.md) "상대가 보이는 모든 화면은 같은 글자"
