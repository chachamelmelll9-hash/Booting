---
type: Concept
title: 신고와 차단
description: 신고는 차단을 포함한다 — 접수 즉시 인연이 종료되고 양쪽 목록과 추천에서 사라진다. 차단 목록 화면은 없다(API 만). 신고 사유는 내 정보 > 신고 내역에 남는다.
tags: [safety]
sources:
  - id: cb2067de
    resource: commit:b2067de
  - id: c1997184
    resource: commit:1997184
  - id: c3dea3e2
    resource: commit:3dea3e2
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 신고와 차단

## 진입점

- 대화방 우상단 **⋯** → 시트: `대화방 나가기`(위) / `대화 상대 신고하기`. 신고를 고르면 **같은 시트가 사유 선택으로 바뀐다** — Modal 두 개를 같은 프레임에서 교체하면 두 번째가 안 뜬다 (실측, `b2067de`).
- 프로필 상세 ⋯ → `/report/[id]` (사유 + 차단).
- 사유: `money_request` 금전 요구 / `inappropriate_behavior` 부적절한 언행 / `scam_suspicion` 사기 의심. 옛 키 `safety_concern`·`abusive_language`(+ 스펙의 false_info/photo_theft/…)는 목록에서 뺐지만 서버는 계속 받는다 — 스토어에 나간 구버전과 기존 행이 쓴다. `reportReasonLabel` 이 빠진 키까지 문구를 찾아 준다.

## 신고 = 차단 (`SafetyService.report → enforceBlock`)

1. `reports` 행
2. `blocks` 행 (신고자 → 대상)
3. 둘 사이의 `connections` 를 `ended` (reason=`blocked`)
4. `connections.list` 가 차단 쌍을 **양쪽 모두**에서 걸러낸다. 한쪽에만 남으면 상대는 왜 답이 없는지 모른 채 계속 말을 건다
5. discovery 제외 집합(blocks 양방향)에 들어가 추천에 다시 뜨지 않는다

"신고는 reports 행만 남기고 아무것도 끊지 않았다. 신고한 상대가 매칭 목록과 추천에 그대로 있으니 신고가 먹지 않은 것으로 보인다." (`1997184`) 소유자: "신고한 프로필은 대화방에서도 삭제가 되어야지!!!!! 나중에 추천프로필에도 뜨지않아야하고". 규칙 전 신고에도 소급 적용 (`20260902110000_backfill_report_blocks.sql`).

## 종료된 인연

`status='ended'`(나가기·거절·차단)는 목록 쿼리에서 제외 (`3dea3e2`). 방 안에 있는 동안 상대가 나가면 "종료된 대화입니다. 메시지를 보낼 수 없습니다" 는 그 자리에서 보여준다.

## 차단 목록

내 정보의 차단 목록 화면과 해제 경로는 **없다** (`b2067de`, 소유자 요청). `POST/GET/DELETE /blocks` 는 서버에 남아 있고 discovery 가 계속 쓴다.

## 신고 내역

내 정보 > 안전 > **신고 내역** (`(tabs)/profile/reports.tsx`, `GET /reports`) — 상대 별명·사유·`접수됨` 한 줄.

## 안전 안내

대화방 상단 배너 `SafetyNotice variant="banner"`: "금전 요구, 개인정보 요청, 외부 메신저 유도는 신고해 주세요." 문구는 `shared/config/safetyRules.ts` 단일 소스. 위험 문구 자동 감지는 P1 (미구현).

## 빨강의 뜻

이 앱에서 빨강은 **위험·되돌릴 수 없음**(신고·차단·나가기·탈퇴) 전용이다. 새 관심·새 대화 배지는 민트 — [notifications-badges](notifications-badges.md).

## 관련

[결정](../decisions/2026-09-02-report-implies-block.md) · [connection-state-machine](connection-state-machine.md) · [discovery-ranking](discovery-ranking.md)
