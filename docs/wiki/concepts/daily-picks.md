---
type: Concept
title: 오늘의 추천 — 하루 6장 원석 카드
description: 홈은 무한 덱이 아니라 하루 여섯 장이다. 기기 로컬 자정에 새로 뽑고, 직전에 뽑힌 여섯 명은 오늘 후보에서 뺀다. 전부 클라이언트(AsyncStorage) 에 있다.
tags: [home, discovery, client]
sources:
  - id: hook
    resource: /apps/mobile/src/features/daily-picks/model/useDailyPicks.ts
  - id: c52a1f90
    resource: commit:52a1f90
  - id: c4e13b26
    resource: commit:4e13b26
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 오늘의 추천

`apps/mobile/src/features/daily-picks/model/useDailyPicks.ts` (+ `useDailyPicks.spec.ts` 7건 — 이 앱의 첫 모바일 단위 테스트), `app/(tabs)/home/index.tsx`.

## 왜 6장인가

"끝없이 넘길 수 있으면 한 사람 한 사람을 보는 대신 스크롤을 하게 된다. 부모님을 소개하는 자리에서 그건 맞지 않는다." (`52a1f90`) 카드는 24시간 살고 자정에 여섯 장이 새로 뽑힌다. 상세에서 '넘기기' 를 뺀 것도 같은 이유 — 추천은 알아서 사라지는데 되돌릴 수 없는 넘기기로 지우게 하면 이득 없이 위험만 진다.

## 동작

1. **후보** = `GET /discovery` 피드 (서버가 이미 궁합 순 정렬 — 훅은 고르지 않고 **자른다**).
2. **날짜 키** = `todayKey()` — 기기 **로컬** 연-월-일. `toISOString()`(UTC) 를 쓰면 한국에서 오전 9시까지 어제라 하루가 9시간 밀린다. 앱을 켜둔 채 자정을 넘기는 경우는 `AppState` 가 `active` 로 돌아올 때 다시 계산한다.
3. **refill** (날이 바뀜 or 같은 날인데 6장 미만):
   - 날이 바뀌면 `items/revealed/hearted` 를 비우고, **지금 들고 있던 카드의 profileId 를 `previous` 로** 기억한다.
   - 후보에서 `previous` 를 뺀 것을 앞에서부터 채운다. 새 얼굴이 모자라면 **직전 카드로 뒤를 채운다** — 회원이 적은 초반에 "조건에 맞는 분이 더 없습니다" 를 띄우면 후보가 있는데 없다고 알리는 꼴이다.
   - 같은 날 보충은 기존 순서를 절대 건드리지 않는다 — 순서가 곧 보석(모양) 배정이라 섞이면 "왼쭉 위 하트" 가 다른 사람이 된다.
4. **다음 쪽 당기기**: 피드 한 쪽이 10명이라 직전 6을 빼면 새 얼굴이 4명뿐. 훅이 `hasMore/loadMore` 를 받아 새 얼굴이 모자라고 더 받을 게 있으면 **먼저 다음 쪽을 요청**한다 (`4e13b26`).
5. **스냅샷 저장**: profileId 만 두면 관심을 보낸 순간 서버가 그 사람을 추천에서 빼서 카드가 사라진다. 오늘의 6장은 하루 동안 그 자리에 있어야 하므로 카드 내용을 통째로 든다. `hearted` 로 버튼만 바꾼다.

## 카드 (`GemCard` / `ExpandedGemCard` / `GemCardGrid`)

- 뒷면은 흰 바탕 + 민트 테두리, 색은 원석 하나에만. 여섯 장을 가르는 단서는 색이 아니라 **모양**(하트·다이아·원·사각·별·물방울).
- 누르면 그 자리에서 뒤집히며 화면 최대로 펼쳐진다 — 새 화면으로 넘기면 방금 누른 카드의 감각이 끊긴다. 앞면 `rotateY` 를 360° 로 끝내야 안드로이드가 그 안의 Image 를 그린다.
- 뒤집힌 앞면: `별명 · 나이` / `을사일주`(민트 `#CCFBF1`) / `궁합 74점` 배지. 거리(km) 는 카드에서 빠지고 펼친 카드·상세에 있다.
- "6장 중 N장 확인 / 카드를 클릭하면 프로필을 확인가능합니다".
- 받은 관심 탭도 같은 그리드.

## "직전" 의 뜻

날짜가 아니라 **마지막으로 뽑힌 것**. 사흘 만에 열면 그 사흘 전 카드가 기준이다. 마지막에 본 여섯 명과 겹치지 않는 게 요점이지 달력상 어제인지가 아니다.
그 외에 다른 사람이 나오게 하는 것: 하트·패스(영구 제외), 새 프로필 가입, 필터 변경.

## 한계 (알고 두는 것)

- 상태가 **기기 로컬**이다. 앱 삭제·데이터 초기화 → 즉시 새 6장. 기기 2대 → 각각 다른 6장. **기기 시계를 바꾸면 새 날.** 서버 `discovery` 에는 일일 할당 개념이 없다 (페이지 `limit` 만).
- 계정 단위로 강제하려면 서버가 날짜별 배정을 발급해야 한다 — 미결 ([open-questions](../open-questions.md)).

## 관련

[discovery-ranking](discovery-ranking.md) · [design-system](../entities/design-system.md) · [결정 6장](../decisions/2026-09-06-daily-6-gem-cards-remove-saved.md) · [결정 직전 제외](../decisions/2026-09-11-exclude-previous-daily-picks.md)
