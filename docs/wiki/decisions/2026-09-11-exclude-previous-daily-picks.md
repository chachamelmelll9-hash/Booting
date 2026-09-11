---
type: Decision
title: 직전에 뽑힌 여섯 명을 오늘 추천에서 뺀다
description: 후보 풀은 날이 바뀌어도 그대로라 어제와 같은 여섯 명이 다시 올라왔다. 직전 몫의 profileId 를 기억해 뺀다. 모자라면 직전 카드로 뒤를 채우고, 피드 다음 쪽을 먼저 당겨온다.
tags: [decision, home, discovery]
sources:
  - id: c4e13b26
    resource: commit:4e13b26
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 직전 6명 제외

## 배경
소유자(09-11): "이거 추천카드는 매일 리프레쉬되는거야? 몇시기준? 로직좀설명해줘" → 설명 중 "매일 6장을 새로 뽑지만 후보 풀은 안 바뀐다 — 하트도 패스도 안 한 사람은 같은 순위에 남아 같은 6명이 또 나온다" 를 짚음 → "어제 뽑힌 6명은 오늘 후보에서 빼줘".

## 결정
- `useDailyPicksStore.previous: string[]` — 날이 바뀌는 순간 들고 있던 카드의 profileId. 같은 날 보충일 때는 기록해 둔 값을 그대로(오늘 카드가 스스로를 제외하면 안 된다). `previousIdsFor(state, date)` 한 곳에서 판정 — refill 과 훅이 같은 답을 내야 한다.
- 날짜가 아니라 **'직전에 뽑힌 것'** — 사흘 만에 열면 그 사흘 전 카드가 기준. 마지막에 본 여섯 명과 겹치지 않는 게 요점.
- **모자라면 직전 카드로 채운다** — 빼기만 하면 회원이 적은 초반에 "조건에 맞는 분이 더 없습니다" 가 뜬다(후보가 있는데 없다고 알리는 꼴). 새 얼굴 먼저, 모자란 만큼만.
- **다음 쪽 당기기** — 피드 한 쪽이 10명이라 직전 6을 빼면 새 얼굴 4명. `useDailyPicks(candidates, hasMore, isLoadingMore, loadMore)` 가 새 얼굴이 모자라고 더 받을 게 있으면 먼저 요청.
- 테스트 `useDailyPicks.spec.ts` 7건 — 이 앱의 첫 모바일 단위 테스트 (jest-expo 설정은 있었다).

## 남긴 한계
저장이 여전히 기기 로컬 — 앱 재설치·기기 시간 변경·기기 2대. 서버 발급은 테이블이 필요해 지금 단계에선 과하다고 보고 보류 ([open-questions](../open-questions.md)). 관련: [daily-picks](../concepts/daily-picks.md).
