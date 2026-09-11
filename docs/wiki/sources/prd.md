---
type: Source
title: PRD (prd.md)
description: 부팅의 단일 기준 문서. 2026-08-31 소유자가 원문을 붙여 넣어 만들었고, TODO 14개 중 12개가 확정됐다.
tags: [source, spec]
resource: /prd.md
sources:
  - id: prd
    resource: /prd.md
  - id: session-shippen
    resource: session:8d60ecde-de2a-41d3-b5e4-9d90df7164e4
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# PRD (`prd.md`)

## 어떻게 생겼나

2026-08-31 10:07 (KST) 소유자가 shippen 저장소 세션에서 **21장짜리 원문을 그대로 붙여 넣으며** "핵심 기능을 임의로 삭제·변경하지 말고, 미결정은 '추후 결정사항'으로" 라고 지시했다.
가칭은 "우리 부모님을 소개합니다". 원문을 보존하고 미결 14항목에 `TODO-01~14` 를 붙여 20장 표에 모았다 — [세션](session-2026-08-31-prd-and-repo-split.md).

문서 지위 문장: *"본 문서는 향후 서비스 개발의 단일 기준 문서(Single Source of Truth)다."* 모든 기능 스펙은 "충돌 시 PRD 가 우선한다" 고 적는다.

## 무엇을 말하나

- **1장** 서비스명 부팅(Booting), 번들 `com.booting.app`, slug/scheme `booting-mobile`
- **1.4 핵심 원칙 7** — [product-principles](../concepts/product-principles.md)
- **4장** 가입·인증 — 자녀 본인인증 + 가족관계증명서 (후자는 코드에서 폐지됨, [open-questions](../open-questions.md))
- **5장** 프로필 항목, **5.3 사주** (09-09 재작성: 생년월일 아래에서 이어 받고 공개 여부를 묻지 않는다)
- **6장** 관계 목적 7종·최대 2개·'아직 잘 모르겠어요' 단독 ('가벼운 만남/부담 없는 데이트' 는 `9a43dac` 에서 제거됐으나 PRD 6장에 남아 있다)
- **7장** 개인정보 공개 범위 표 — [privacy-rules](../concepts/privacy-rules.md)
- **8장** 추천·필터·**8.4 사주 궁합** (09-09 추가) — [saju-compatibility](../concepts/saju-compatibility.md)
- **10장** 하트·매칭 용어 정의, 상태 문구 9개 — [two-person-rule](../concepts/two-person-rule.md)
- **12장** 첫 만남·양측 확인 (코드는 부모님 의사 단계에서 매칭 — [결정](../decisions/2026-09-01-matching-at-parent-intent.md))
- **17장** MVP P0/P1/P2 (사주 궁합이 P2 → P0 으로 이동)
- **19장** North Star = 양측 부모님이 실제 만남을 완료한 건수
- **20장** TODO 표

## TODO 확정값 (2026-08-31 preflight, 09-09 TODO-13)

| ID | 확정 |
|---|---|
| 01 | 부팅(Booting) |
| 02 | 만 50세 이상 |
| 03 | 자녀 동행 강력 권장 + 미동행 시 확인 |
| 04 | 자녀 단말 대면 동의 (→ 이후 카톡 링크 동의로 대체, [결정](../decisions/2026-09-03-parent-consent-by-link.md)) |
| 05 | MVP 는 플로우만, 심사 자동 승인 (→ 증명서 자체 폐지) |
| 06 | 반경 10/30/50km/전국, 기본 30km |
| 07 | 부모님 1명 |
| 08·09 | P2, 미확정 |
| 10 | 전면 무료, 광고 없음 |
| 11 | 미활동 60일 자동 비공개 |
| 12 | 매칭 후 채팅방 90일 |
| 13 | 사주 궁합 무료 제공, 공개 여부 묻지 않음 |
| 14 | 미동행 사유 + 안전수칙 재확인 |

## 코드와 어긋난 곳

[open-questions.md — 문서 간 모순](../open-questions.md#문서-간-모순-lint-2026-09-11) 1·4항.
