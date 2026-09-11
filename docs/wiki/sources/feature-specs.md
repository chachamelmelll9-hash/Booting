---
type: Source
title: docs/features/* — 기획 산출물
description: auto 파이프라인의 clarify→define-pages→wireframes→architecture→test-scenarios 가 만든 문서 18개. 스펙 4+1 은 코드와 같이 갱신돼 왔고, 아키텍처·페이지 맵은 초기 설계 스냅샷에 가깝다.
tags: [source, spec]
resource: /docs/features
sources:
  - id: artifacts
    resource: /docs/features/ARTIFACTS.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# docs/features/

파일명 계약은 `ARTIFACTS.md` 에 있다. 파이프라인 스킬은 고정명(alias)을 읽는다.

| 파일 | 크기 | 무엇 | 최신성 |
|---|---|---|---|
| `core-idea.md` | 2KB | 한 줄 핵심 + 차별점 표 + 핵심 제약 + North Star | 08-31, 유효 |
| `feature-summary.md` | 11KB | 스펙 5개의 요약 + **전 기능 공통 제약 6항**. 다운스트림이 읽는 단일 요약 | 09-09 사주 절 일부 낡음 ([lint](../open-questions.md)) |
| `parent-profile-consent.md` | 16KB | 등록 & 동의 스펙 — 7단계 여정, 상태 매트릭스, 필수 항목 | 대면/문자 동의 서술은 링크 동의로 대체됨 (Decision Log 는 갱신) |
| `profile-discovery.md` | 14KB | 추천 & 탐색 — 동성 친구 규칙, 정렬 없음, 상세의 사주 한 줄 | 09-09 갱신. 찜 서술은 잔재 |
| `heart-conversation.md` | 17KB | 관심·대화 연결 — 인사말, 콜백, 배지, 제외 규칙 | 09-03 갱신 |
| `first-meeting-match.md` | 13KB | 부모님 의사 → 매칭. 일정 API 는 동선 밖 | 09-01 갱신. 부모님 직접 결정(09-03~) 은 미반영 |
| `saju-compatibility.md` | 13KB | 사주 — 계산·점수·노출·프라이버시·순서 | 09-10, **가장 최신** |
| `data-model.md` | 9KB | 엔티티 21 + 관계 + 노트 | 09-09 SajuInfo 갱신. `ParentIntent` 서술은 옛 흐름 |
| `page-map.md` | 28KB | 탭 4·페이지 41·엔드포인트 표·결정 로그 | `hearts/saved.tsx` 잔재, 카카오 로그인 절은 최신 |
| `architecture.md` | 37KB | 모바일 FSD·서버 모듈·DB 스키마·결정 로그 | **초기 설계 스냅샷** — 모듈 9개, `@nestjs/schedule`, `PublicProfileDto.saju` 등 실제와 다름 |
| `test-scenarios.md` | 55KB | 시나리오 71: Journey→Scenario 매핑, Verification Checklist, S1~S20, **SEC 개인정보 노출 방어**, **E2E 전체 흐름**, Command References | Step 18/19 'API 전용' |
| `wireframe-index.md` + `wireframe-{home,hearts,connections,profile,common-states,modals}.md` | 95KB | 24화면 텍스트 와이어프레임, 공유 컴포넌트 12 | 09-01 |
| `ARTIFACTS.md` | 4KB | 산출물 파일명 계약 | |

## 읽는 법

- **"지금 어떻게 동작하나"** 는 `saju-compatibility.md` → `heart-conversation.md` → `profile-discovery.md` 순으로 믿을 만하다. 이 셋은 커밋마다 같이 고쳐졌다 (`01a12f9` `c491a04` `aab1d97` 등).
- `architecture.md` 는 **왜 그렇게 나눴나**(설계 원칙 5·결정 로그)를 읽는 문서다. 파일 트리를 현재 코드로 믿지 않는다 — 현재 구조는 [entities/server.md](../entities/server.md), [entities/mobile-app.md](../entities/mobile-app.md).
- `test-scenarios.md` 의 SEC.1~4(+5) 는 "응답에 실명·생년월일·연락처·주소·증명서 경로가 **없다**" 를 검증한다 — [privacy-rules](../concepts/privacy-rules.md) 의 테스트 근거.

## 위키가 이 소스에서 가져간 것

[concepts/](../concepts/index.md) 전부의 골격. 단, 코드와 어긋나는 문장은 코드를 따랐고 어긋남은 [open-questions](../open-questions.md) 에 적었다.
