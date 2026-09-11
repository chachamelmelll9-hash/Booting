---
type: Decision
title: 신고는 차단을 포함한다
description: 신고 접수 즉시 차단 행을 만들고 인연을 종료해 양쪽 목록과 추천에서 지운다. 차단 목록 화면은 없앤다. 신고 사유는 세 가지로 좁힌다.
tags: [decision, safety]
sources:
  - id: cb2067de
    resource: commit:b2067de
  - id: c1997184
    resource: commit:1997184
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 신고 = 차단

## 배경
소유자(09-02): "대화 창 들어가면 오른쪽 위에 점 3개 잇잖아 거기에 대화방 나가기 외에도 대화상대 신고하기 하고 금전요구/부적절한 언행/사기의심 중에서 선택항 수 있도록 해줘(여기서 신고한 프로필은 신고내역에 어떠내용으로 신고했는지 뜨게끔) 그리고 내 정보에 차단목록은 없애줘" → 구현 후 "신고한 프로필은 대화방에서도 삭제가 되어야지!!!!! 나중에 추천프로필에도 뜨지않아야하고", "점 세개누르면 대화방 나가기가 신고하기보다 위에잇게해줘".

## 결정
- 대화방 ⋯ → 한 시트 안에서 단계 전환 (`대화방 나가기` 위, `대화 상대 신고하기` → 사유 3개). Modal 두 개를 교체하면 두 번째가 안 뜬다.
- `report()` 가 `enforceBlock()` 을 탄다 — `block()` 과 **같은 경로** (두 곳에 따로 두면 한쪽만 인연을 끊는 상태가 생긴다). 인연 `ended(reason=blocked)`.
- `connections.list` 가 차단 쌍을 **양쪽**에서 제외. 상태만 `ended` 로 바꾸면 '대화 종료' 카드로 남아 신고가 먹지 않은 것처럼 보인다.
- 사유 키 `money_request / inappropriate_behavior / scam_suspicion` 신설, 옛 키는 서버가 계속 받는다.
- 차단 목록 화면·해제 경로 삭제. API 는 유지.
- 소급 마이그레이션 `20260902110000_backfill_report_blocks.sql`.

## 근거
"신고는 reports 행만 남기고 아무것도 끊지 않았다. 신고한 상대가 매칭 목록과 추천에 그대로 있으니 신고가 먹지 않은 것으로 보인다." 관련: [safety-report-block](../concepts/safety-report-block.md).
