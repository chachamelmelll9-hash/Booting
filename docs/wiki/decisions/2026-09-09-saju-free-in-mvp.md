---
type: Decision
title: 사주 궁합을 무료 MVP 기능으로, 외부 API 없이 서버에서 계산한다
description: PRD 가 P2 로 미뤄 둔 TODO-13 을 소유자 요청으로 MVP 로 끌어왔다. 외부 궁합 API 는 부모님 생년월일을 제3자에게 넘기는 일이라 쓰지 않고, 사주팔자 계산을 서버에 직접 구현했다.
tags: [decision, saju]
sources:
  - id: cb268b8b
    resource: commit:b268b8b
  - id: session-prev
    resource: session:beebb230-c0d5-44e2-8b3c-4b26fcc4e1ca
  - id: session
    resource: session:0f2f49fb-bfd9-49d9-af6f-7002f6237b37
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 사주 궁합 — 무료, 서버 계산

## 배경
PRD 5.3(당시): "MVP 에서는 사주 정보 입력까지만, 자동 궁합은 P2". 그릇(`saju_infos` 테이블·DTO)은 있는데 입력 화면도 계산도 없었다. 소유자(09-09 11:28): "사주기반 매칭기능을 넣고싶은데 할수잇겟어?" → 선택지 A(직접 규칙)/B(외부 API)/C(정보만) → "B오떄" → SAZU 등 검토하며 **개인정보 제3자 제공** 문제를 지적. 새 세션(14:20): "부팅 사주기반 매칭 기능 무료로 넣어주랑" → AskUserQuestion: 노출 범위 **상세 + 카드 배지 + 정렬**, 깊이 **정통 사주팔자**.

## 결정
- TODO-13 재확정: **자동 궁합을 무료로 제공** (P2 → P0). 전면 무료 원칙(TODO-10) 그대로 — 유료 전환·부분 공개·광고 해제 장치 없음.
- **서버가 직접 계산**한다. 외부 API 없음. 절기·60갑자는 결정론적 천문 계산이라 매번 같은 답이고, 사람의 생년월일을 외부로 내보낼 이유도 없다.
- 계산 규칙: 연주 입춘·월주 12절·일주 JDN·시주 오서둔+야자시, 음력은 `korean-lunar-calendar`(KASI), **1954-03-21~1961-08-09 UTC+8:30 30분 보정**(지금 65~72세), Meeus 저정밀(±15분 — 시각 '모름' 이 더 많다는 점이 근거).
- 점수 항목(일간·일지·연지·월지·오행·음양·시지)과 30~99 정규화 — [saju-compatibility](../concepts/saju-compatibility.md).
- 부모님 프로필에 사주 입력 UI 를 처음 넣었다.

## 버린 대안
- 외부 궁합 API(B) — 부모님 생년월일·시각을 외부 업체에 보내면 처리방침에 제공받는 자·항목·목적·기간을 명시하고 부모님의 **별도 동의**가 필요하다. 동의 페이지 하단의 "생년월일은 공개되지 않습니다" 와도 긴장. 어르신 대상이라 더 조심.
- 정보만 표시(C) — 소유자가 궁합을 원했다.
- 배포 후로 미루기 — 소유자가 지금을 택했다.

## 이후
당일 저녁까지 노출 규칙이 여섯 번 다듬어졌다: [순서](2026-09-09-saju-order-not-filter.md) → [두 값만](2026-09-09-saju-show-day-pillar-and-score-only.md) → [전원·비공개](2026-09-09-saju-everyone-has-saju-is-public-false.md) → [전 화면](2026-09-10-saju-on-all-partner-screens.md). PRD 5.3·8.4·17·20 이 갱신됐다.
