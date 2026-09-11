---
type: Concept
title: 인연(connection) 상태 기계
description: connections.status 7개 값 중 실제로 쓰이는 전이, 각 전이를 일으키는 코드, 목록에서 빠지는 조건, 문구 단일 소스.
tags: [matching, state]
sources:
  - id: data-model
    resource: /docs/features/data-model.md
  - id: c70cd0ae
    resource: commit:70cd0ae
  - id: c1997184
    resource: commit:1997184
  - id: c3dea3e2
    resource: commit:3dea3e2
  - id: c05167a1
    resource: commit:05167a1
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 인연 상태 기계

용어: 도메인은 **인연**(`connections`), 탭 이름은 **매칭** (`dffea8c`). 두 자녀 + 두 부모님 프로필을 함께 든 교차 엔티티다.

## 상태 (enum `connection_status`)

| 값 | 화면 문구 (`connectionStatus.ts`) | 쓰이나 |
|---|---|---|
| `mutual_heart` | 대화 연결 | ✅ 상호 하트 직후 |
| `chatting` | 대화 중 | ✅ |
| `parent_intent` | 부모님 확인 중 | ✅ 부모님께 공유한 뒤 |
| `meeting_scheduled` | 만남 예정 | API 만 — 앱 동선 없음 |
| `meeting_confirm_pending` | 만남 확인 대기 | API 만 |
| `matched` | 매칭 성공 | ✅ 종착 |
| `ended` | (방 안에서만) 종료된 대화입니다 | ✅ 목록에서 빠짐 |

## 실제 전이

```
[상호 하트]  hearts.service: 역방향 하트 있음 → connection 생성 (mutual_heart) + conversation
    │  양쪽 인사말이 모두 옮겨졌으면 곧바로 chatting (70cd0ae — 인사말은 메시지 전송 경로를 안 타서 따로 올린다)
    ▼
 mutual_heart ──메시지 전송──▶ chatting
    │                           │
    └──[부모님께 공유 — 카카오 콜백 markParentShare]──▶ parent_intent   (05167a1: mutual_heart/chatting 일 때만)
                                                            │
                        parent_interests 에 양쪽 'interested' ──▶ matched  (ParentService.recordInterest — 종착)
                        부모님 [아니요] ──────────────────────▶ ended
 어느 상태든:  대화방 나가기 → ended / 신고 → 차단 + ended(reason=blocked)
```

- `setStatus` 는 `matched` 에서 다른 상태로의 전이를 거부하고 로그를 남긴다 (예전엔 실패를 조용히 삼켰다).
- 일정 API(`POST /connections/:id/meeting*`)는 살아 있지만 앱이 부르지 않는다. 사후 응답(feedback)이 완료된 만남을 전제해서 남겨 뒀다 (`first-meeting-match.md`).

## 목록(`GET /connections`)에서 빠지는 것

- `status = 'ended'` — 되돌릴 수 없고 방에서 할 일이 없는 관계. 두면 목록이 무덤이 된다 (`3dea3e2`)
- **차단 쌍** — 신고/차단 당사자 양쪽 모두에서 (`1997184`). 한쪽에만 남으면 상대는 왜 답이 없는지 모른 채 계속 말을 건다
- 방 안에 있는 동안 상대가 나가면 그 자리에서 `ended` 문구는 보여준다 — 문구 자체는 지우지 않았다

## 목록의 부가 상태 (status 와 별개)

| 필드 | 뜻 | 근거 |
|---|---|---|
| `unseen` | 안 읽은 메시지가 있거나 **한 번도 열지 않음** (`conversation_reads`) — 민트 테두리·탭 배지 | `2ced22e` |
| `sharedWithParent` | `parent_shares` 행 존재 — 카드 회색 + "✓ 부모님께 공유 완료" | `20a1ee7` |
| `myParentIntent` | `parent_interests` 에서 파생 | `7f03bb1` |
| `partner.dayPillar`, `partner.compatibility` | 사주 한 줄 | `af83491` |

## 필터 칩

**전체 / 매칭** 둘뿐 (`70cd0ae`). 진행 중은 어차피 전체에 다 있고, 따로 찾고 싶은 건 만나기로 된 분뿐이다. 어떤 상태도 칩에서 누락되지 않게 `statuses` 로 매핑한다 (`shared/config/connectionStatus.ts` `CONNECTION_FILTERS`).

## 관련

[two-person-rule](two-person-rule.md) · [parent-share-kakao](parent-share-kakao.md) · [safety-report-block](safety-report-block.md) · [notifications-badges](notifications-badges.md)
