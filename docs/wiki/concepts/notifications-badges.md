---
type: Concept
title: 알림과 배지
description: 알림 탭과 홈의 종 아이콘은 없다. 새 관심·새 대화는 관심·매칭 탭의 민트 배지와 카드 테두리가 알린다. '새 대화방' 은 안 읽은 메시지가 아니라 conversation_reads 로 잡는다.
tags: [notifications, ui]
sources:
  - id: c2ced22e
    resource: commit:2ced22e
  - id: ccc70db2
    resource: commit:cc70db2
  - id: cb4fa7ff
    resource: commit:b4fa7ff
  - id: c9bc0510
    resource: commit:9bc0510
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 알림과 배지

## 어디서 알리나

| 신호 | 표시 | 근거 |
|---|---|---|
| 새 관심 | **관심 탭** 배지 = 받은 관심 수 (인연 된 사람·차단 제외 — 목록과 같은 기준) | `c659a05` |
| 새 대화방 / 안 읽은 메시지 | **매칭 탭** 배지 = `GET /connections/unread-count` (30초 폴링, 개수만 세는 가벼운 쿼리) + 목록 카드 **민트 테두리** | `2ced22e` |
| 대화 연결·공유 등 이력 | `(tabs)/notifications` — 탭바에서 `href: null`, **앱 안에 입구 없음**. 푸시 딥링크가 붙으면 그때 목적지 | `cc70db2` |

홈 헤더의 종 아이콘은 뺐다. 알림으로 오는 일은 이미 탭 배지가 같은 자리에서 알린다 — 같은 사실을 두 곳에서 빨갛게 알리면 어느 쪽을 눌러야 하는지가 매번 질문이 된다. 지금 모든 탭 첫 화면의 헤더는 `TabHeader`(워드마크 + 제목)뿐이다 (`9bc0510`).

## `unseen` — 왜 안 읽은 메시지 수로만 세지 않나

인사말 없이 관심만 보내고 상호 하트가 되면 **메시지가 0건인 대화방**이 생긴다. `messages.read_at` 만 보면 이 방이 아무 표시 없이 지나간다. 그래서 `conversation_reads (conversation_id, user_id, read_at)` — 방을 연 사람·시각. `Connection.unseen = 안 읽은 메시지 있음 OR 한 번도 열지 않음`.
방을 열면 서버가 기록하고, **나올 때** 목록·배지를 함께 무효화해 둘 다 꺼진다 (5초 폴링마다 무효화하면 대화 중에 목록을 계속 다시 부른다).

## 색

- 배지·테두리는 **민트 `primaryDark`**(`#0D9488`). 빨강은 위험 전용. 새 관심·새 대화는 반가운 일인데 같은 색으로 알리면 경고처럼 읽힌다 (`b4fa7ff`, 소유자 "알림 표시를 근데 민트색으로 하는거어떄").
- `primary`(teal-500) 가 아닌 이유: 배지 숫자는 10sp 남짓이라 그 위의 흰 글자 대비가 모자란다.
- 배지에 **흰 테두리** — 활성 탭 아이콘 색과 배지 색이 같아 테두리가 없으면 숫자만 떠 있는 것처럼 보였다 (실측).
- 카드 테두리는 평소에도 **투명하게 깔아 둔다** — 꺼질 때 두께가 바뀌면 목록이 한 칸 밀린다.

## 알림 문구

상대가 있는 알림은 전부 `{별명} 님과 …` — "대화가 연결되었습니다" 만으로는 누구인지 몰라 열어봐야 안다. 별명은 조회 시점에 푼다. 상호 하트 단계 알림에 '매칭 성공' 을 쓰지 않는다 (PRD 16).
알림 화면은 **보고 나갈 때** 읽음 처리 — 들어가자마자 처리하면 강조가 눈앞에서 사라져 뭐가 새로 왔는지 확인할 수 없다. 그래서 '모두 읽음' 버튼도 없다.

## 없어진 것

보관함 배지(`useSavedSeenStore`, "보고 나서 새로 담긴 개수") — 보관함과 함께 제거 (`52a1f90`).

## 관련

[connection-state-machine](connection-state-machine.md) · [design-system](../entities/design-system.md) · [결정](../decisions/2026-09-02-no-notification-tab-mint-badges.md)
