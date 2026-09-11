---
type: Concept
title: 관심(하트)과 인사말, 대화 연결
description: 관심 보내기는 곧 인사말 작성이다. 상호 하트가 되면 대화방이 열리고 양쪽 인사말이 첫 메시지로 복사된다. 받은 관심은 2주 뒤 사라진다.
tags: [hearts, chat]
sources:
  - id: c2fe3f17
    resource: commit:2fe3f17
  - id: cc659a05
    resource: commit:c659a05
  - id: c52a1f90
    resource: commit:52a1f90
  - id: c880121d
    resource: commit:880121d
  - id: spec
    resource: /docs/features/heart-conversation.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 관심과 인사말

## 관심 보내기 = 인사말 작성

카드(홈 오늘의 추천 / 받은 관심)의 하트를 누르면 바로 보내지 않고 **`HeartMessageSheet`** 가 열린다. 버튼은 `인사말과 함께 보내기` / `관심만 보내기` — 확인 다이얼로그가 아니라 **작성 단계**다. 비워 두고 보내면 인사말 없는 관심이 된다. 별도 '인사말' 버튼으로 나누면 아무도 쓰지 않는다 (소유자: "인사말 탭 따로 만들지말고 관심보내기 누르면 메세지랑함꼐 보낼수잇게 해야지").

- `POST /hearts { targetProfileId, message? }` → `{ mutual, connectionId? }`
- `hearts.message` 1~200자 CHECK — 인사말이지 편지가 아니고, 매칭 전 낯선 사람에게 가는 글이라 짧을수록 안전하다
- `unique(sender_user_id, target_parent_profile_id)` — 중복 하트는 거부만
- 되돌리기 없음. 넘기기(`POST /passes`)도 없음 — 재추천 제외

## 상호 하트 = 대화 연결

`HeartsService` 가 역방향 하트를 확인하면 `connections`(`mutual_heart`) + `conversations` 를 만들고 양쪽에 알림. 응답의 `mutual: true` 면 앱은 `/matched/:id` 시트("서로 관심이 있어요")를 열고 `대화 시작하기` 로 대화방에 간다.

- **인사말 이관** (`carryOverHeartMessages`): 양쪽 인사말을 **보낸 시각 순서대로** `messages` 에 복사한다. 빈 채팅방에서 먼저 말을 트는 부담이 대화 이탈의 가장 큰 이유다. 실패해도 인연은 살린다 (경고 로그) — 인사말 때문에 매칭을 되돌리면 손해가 더 크다.
- 양쪽 인사말이 모두 옮겨졌으면 상태를 곧바로 `chatting` 으로 (`70cd0ae`) — 서로 인사를 주고받았는데 '대화 연결'이면 자기 말이 반영되지 않았다고 느낀다.
- 대화방으로 바로 들어와도 아래에 매칭 목록이 깔린다 (`withAnchor`, `initialRouteName`). 뒤로가기는 항상 매칭 목록으로 — 하드웨어 뒤로가기도 가로챈다 (`ec28e88`).

## 받은 관심 탭

- 홈과 **같은 원석 카드 그리드**를 쓴다 (`52a1f90`). 한쪽만 다르면 같은 프로필을 두 방식으로 익혀야 한다. 다른 점은 펼친 카드 안에만 — 인사말이 맨 위, 버튼이 '관심 답하기', 넘기기가 붙는다.
- 상단: "N명이 관심을 보냈습니다" + **"모든 카드는 2주 뒤에 자동 삭제됩니다."** 삭제는 `run_maintenance()` 규칙 4 (`20260906120000`) — 연결로 이어진 하트는 지우지 않는다(상호 판정의 근거). 미리 알려 두는 이유: 말없이 사라지면 사용자는 자기가 실수로 지운 줄 알고 서둘러 결정한다.
- **목록에 남지 않는 것**: 이미 인연이 된 상대, 차단한 상대 (`hiddenSenderIds`, `c659a05`). 안 읽음 배지도 같은 기준 — 기준이 갈리면 "관심 3" 을 보고 들어갔는데 목록이 빈, 지울 방법이 없는 배지가 남는다.
- **열 때마다 다시 묻는다** (`880121d`) — 남이 보낸 것이라 내 조작으로 갱신될 수 없어 무효화 시점을 잡을 수 없다. 1분 캐시에 빈 목록이 남아 "배지엔 숫자, 목록은 빈" 상태가 하루에 두 번 났다.
- 찜(보관함)은 없앴다 — 2주 뒤 사라지므로 두는 것이 곧 보류다 ([결정](../decisions/2026-09-06-daily-6-gem-cards-remove-saved.md)).

## 화면에 쓰는 문구

`서로 관심이 있어요` / `대화 연결` / `대화 중` — '매칭' 은 이 단계에 없다 ([two-person-rule](two-person-rule.md)). 관심 탭 배지 라벨 "읽지 않은 관심 3개".

## 관련

[connection-state-machine](connection-state-machine.md) · [daily-picks](daily-picks.md) · [결정 인사말](../decisions/2026-09-01-heart-with-greeting.md)
