---
type: Decision
title: 알림은 화면이 아니라 탭 배지로, 색은 민트로
description: 알림에 상대 이름을 넣고, 새 대화방은 매칭 탭 배지 + 카드 테두리로 알리고, 홈의 종 아이콘은 걷어냈다. 배지는 빨강이 아니라 민트 — 빨강은 위험 전용.
tags: [decision, notifications, design]
sources:
  - id: c2ced22e
    resource: commit:2ced22e
  - id: ccc70db2
    resource: commit:cc70db2
  - id: cb4fa7ff
    resource: commit:b4fa7ff
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 알림과 배지

## 배경
소유자(09-02): "알림은 닉네임과 대화가 연결되었습니다. 이렇게 띄워주고 확인하면 빨간표시 없애줘", "새 대화 생기면 하단의 메세지 아이콘에 빨갛게 알림 표시해주고 새 대화방 테두리에 하이라이트 … 확인하면 없애줘", "메인화면 알람은 그냥 없애줘(종모양)", "좋아 확인햇어 알림 표시를 근데 민트색으로 하는거어떄".

## 결정
- 알림 문구 `{별명} 님과 대화가 연결되었습니다` — 이름은 알림이 답해야 할 첫 질문. 별명은 조회 시점에 푼다.
- `conversation_reads` 신설 — 메시지 0건인 새 대화방도 '안 봄' 으로 잡는다. `Connection.unseen`, `GET /connections/unread-count`(탭 배지, 30초), 카드 민트 테두리(평소에도 투명하게 깔아 레이아웃 안 밀림). 방을 열면 기록, 나갈 때 둘 다 무효화.
- 알림 화면은 **보고 나갈 때** 읽음 처리, '모두 읽음' 버튼 없음.
- **홈 헤더 종 아이콘 제거.** `(tabs)/notifications` 는 `href:null` 로 남기되 앱 안 입구 없음 (푸시 딥링크용).
- 배지·안 읽음 카운트를 **`primaryDark` 민트**로, 흰 테두리 2px.

## 버린 대안
알림 탭(5번째 탭) — 주 동선(추천 → 관심 → 인연)을 흐린다. 헤더 종 + 탭 배지 병행 — 같은 사실을 두 곳에서 빨갛게 알리면 어느 쪽을 눌러야 하는지가 매번 질문이 된다.

## 근거
빨강은 이 앱에서 위험·되돌릴 수 없음(신고·차단·나가기·탈퇴) 전용. 새 관심·새 대화는 반가운 일이다. 관련: [notifications-badges](../concepts/notifications-badges.md).
