---
type: Source
title: docs/progress/* — 파이프라인 진행 기록
description: auto mode 파이프라인이 남긴 이벤트·설정·환경 메모. 파이프라인이 어디까지 돌았고 이 머신에서 무엇이 꺼져 있는지의 정본.
tags: [source, pipeline]
resource: /docs/progress
sources:
  - id: pipeline
    resource: /docs/progress/pipeline.jsonl
  - id: auto-mode
    resource: /docs/progress/auto-mode.json
  - id: preflight
    resource: /docs/progress/preflight.json
  - id: win
    resource: /docs/progress/windows-setup-notes.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# docs/progress/

| 파일 | 무엇 | 마지막 상태 |
|---|---|---|
| `pipeline.jsonl` | phase 전환 이벤트 (스키마 `SCHEMA.md`) | `implement` `phase_completed` 2026-09-01 14:26 — **`verify` 이후 phase 는 기록 없음**. 그 뒤 작업은 파이프라인 밖에서 진행됐다 |
| `auto-mode.json` | `enabled: true`, `release_ready: false`, `kakao_login: false`(당시), `supabase_project_id: ifkazhqwjbtxkmppsedi`, `platform_notes.*` (Windows 경로·Stop 훅 disabled·iOS 불가) | 08-31 이후 갱신 없음 — `kakao_login` 은 이제 실제로 켜져 있어 낡았다 |
| `preflight.json` | Tier1 OK, Tier2 blockers 6개 (Oracle, Pages, Play SA, ASC, Xcode, 사업자 정보), TODO 확정값 | 08-31 |
| `features.jsonl`, `deploys.jsonl` | 비어 있음 | 배포 한 번도 없음 |
| `windows-setup-notes.md` | 환경 변수, 경로 이동, MAX_PATH, Metro 정션, 포트 4200, Stop 훅 | 08-31 (09-07 Gradle 홈 이슈는 커밋 본문에만) |
| `SCHEMA.md` | 이벤트 스키마 | |

## 이 소스가 말하는 것

- 파이프라인은 **`implement` 까지 auto 로 돌고 멈췄다.** `verify`/`deploy`/`build`/`launch` 는 실행되지 않았다 (`release_ready: false` 라 뒤 셋은 어차피 연기). 이후 12일은 소유자 요청 주도의 수동 개발이다.
- Stop 훅 라우터·auto-commit·`bd` 가 Windows 에서 죽어 있다 — 커밋은 전부 수동. `pipeline.jsonl` 도 그래서 09-01 에서 멈췄다.
- `phase_blocked` 1건 (08-31 15:55, 비ASCII 경로)은 저장소 이동으로 해소됐다.

자세한 것은 [shippen-pipeline](../entities/shippen-pipeline.md), [windows-dev-environment](../entities/windows-dev-environment.md).
