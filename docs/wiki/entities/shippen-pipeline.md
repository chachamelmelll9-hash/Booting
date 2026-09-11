---
type: Entity
title: shippen 파이프라인 (auto mode)
description: 이 저장소의 뼈대인 shippen 템플릿의 "한 줄 요구사항 → 스토어 제출" 자율 파이프라인. 부팅에서는 implement 까지 돌았고, Windows 에서 훅이 죽어 있어 그 뒤는 수동이다.
tags: [entity, pipeline, template]
sources:
  - id: claude-md
    resource: /CLAUDE.md
  - id: readme
    resource: /README.md
  - id: failure-modes
    resource: /docs/pipeline-failure-modes.md
  - id: pipeline
    resource: /docs/progress/pipeline.jsonl
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# shippen 파이프라인

템플릿 `product-engineer-community/shippen` (라이선스: 재배포·재판매 금지, `LICENSE`·`shippen-license.json`). 부팅은 그 `e4a2cb3` 스냅샷에서 분리됐다 — [결정](../decisions/2026-08-31-split-repo-from-shippen.md). `upstream` 원격으로 템플릿 개선을 당겨올 수 있다.

## 구조

```
/setup(auto:) → /preflight → /start → /clarify-core-feature → /define-pages
→ /design-wireframes → /design-architecture → /write-test-scenarios
→ /implement-feature → /verify-app → [/deploy → /make-aso-images → /launch]   ← release-gated
```
- 스킬 19개 `.claude/skills/*` (정본), 에이전트 13개 `.claude/agents/*` (orchestrator·implement 워커·verify·리뷰어), 훅 2개 `.claude/hooks/*.py`, Codex 미러 `.agents/`·`.codex/`, `AGENTS.md`.
- 진행 기록 `docs/progress/{pipeline,features,deploys}.jsonl` + `auto-mode.json` + `preflight.json` (스키마 `SCHEMA.md`). **Stop 훅 라우터**가 `pipeline.jsonl` 에서 `phase_completed` 없는 첫 phase 를 골라 재개한다. supervisor 모드(`run-auto.sh`)는 phase 마다 새 프로세스.
- 규약(CLAUDE.md "Auto Mode 실행 계약"): `phase_completed/deferred/blocked` 중 하나를 반드시 기록, 외부 계정 부재는 `deferred`(차단 아님), AskUserQuestion 금지, 선언값(연령·가격·사업자)은 `store-declarations.yaml` 에서만, `verify` 까지는 계정 없이 완주.
- 실패 카탈로그 `docs/pipeline-failure-modes.md` (A1~A10 파이프라인 사망, B1~B4 거짓 통과, C1~C4 외부 사정, + Windows prefab B3). 회귀 테스트 `scripts/test-pipeline.sh`.

## 부팅에서 실제로 돈 것

| phase | 결과 | 비고 |
|---|---|---|
| preflight | 08-31, TODO 확정, Supabase 생성, blockers 6 | |
| setup | `phase_blocked`(한글 경로) → 이동 후 `phase_completed` 08-31 18:08 | |
| start · clarify · define-pages | 08-31 18:13~18:25 | UX 리뷰어 에이전트 대신 **셀프 리뷰** (세션 정책이 Agent 호출을 막았다) |
| wireframes · architecture · test-scenarios | 09-01 05:50~06:07 | 같음 |
| implement | 09-01 09:22 → 14:26 `phase_completed`, 스모크 71/71 | 오케스트레이터·워커 없이 **직접 구현** |
| verify · deploy · build · launch | **기록 없음** | 그 뒤 12일은 소유자 요청 주도 개발 |

## 이 머신에서 죽어 있는 것

- Stop 훅 라우터·PreToolUse 게이트: `/usr/bin/env python3` 없음
- auto-commit: bash 문법 훅 → 커밋 수동
- `bd`(beads): 미설치. `bd prime` 훅이 `CommandNotFoundException`. `.beads/issues.jsonl` 0건. CLAUDE.md 의 "bd 로 이슈 관리·`bd remember`" 지시는 이 머신에서 이행 불가
- `test-pipeline.sh` 의 python 테스트 2개

## 남아 있는 유용한 계약

- **에뮬레이터는 `scripts/ensure-emulator.sh` 로만** (검은 스크린샷 방지)
- 서버 게이트는 `/api`(liveness), `/api/health` 는 정보용
- 마이그레이션 단일 정책: 적용 + `supabase/migrations/` 파일 기록
- 산출물 파일명 계약 `docs/features/ARTIFACTS.md`
- 워커 토큰 예산(spawn 당 툴 60회, 체크포인트) — 다시 auto 로 돌릴 때

## 관련

[progress-files](../sources/progress-files.md) · [windows-dev-environment](windows-dev-environment.md) · `README.md` Pipeline 절
