# Planning Artifacts Contract

파이프라인 스킬과 에이전트가 생성·소비하는 산출물 파일명의 단일 계약이다.
모든 스킬 문서(`.claude/skills/*`)와 에이전트 문서(`.claude/agents/*`)는 이 계약의 파일명을 그대로 사용한다.
JSONL 이벤트의 `detail.artifacts` / `output` 경로도 동일하다 (스키마: `docs/progress/SCHEMA.md`).

## 초기 파이프라인 (iter = "initial")

접두사 없는 고정명을 사용한다.

| 산출물 | 파일 | 생성 스킬 | 주요 소비자 |
|--------|------|-----------|-------------|
| 핵심 아이디어 | `docs/features/core-idea.md` | `/start` | `/clarify-core-feature` |
| 개별 기능 스펙 | `docs/features/{feature}.md` (kebab-case) | `/clarify-core-feature` | `/design-wireframes`, `/design-architecture`, implement 에이전트 |
| 기능 요약 | `docs/features/feature-summary.md` | `/clarify-core-feature` | `/define-pages`, `/design-wireframes` (Phase 3.5), `/continue` |
| 데이터 모델 | `docs/features/data-model.md` | `/clarify-core-feature` | `/define-pages`, `db-implement` |
| 페이지 맵 | `docs/features/page-map.md` | `/define-pages` | `/design-wireframes`, `/design-architecture` |
| 와이어프레임 인덱스 | `docs/features/wireframe-index.md` | `/design-wireframes` | `/design-architecture`, `/continue` |
| 와이어프레임 (탭별/공통) | `docs/features/wireframe-{tab}.md`, `wireframe-common-states.md`, `wireframe-modals.md` | `/design-wireframes` | `/design-architecture`, implement 에이전트 |
| 아키텍처 | `docs/features/architecture.md` | `/design-architecture` | `/write-test-scenarios`, `/implement-feature`, implement 에이전트 |
| 테스트 시나리오 | `docs/features/test-scenarios.md` | `/write-test-scenarios` | `/implement-feature`, e2e/adb verify 에이전트, `/verify-app`, `/deploy` |
| 로컬 동작 증거 | `test-results/verify/` (기동 스크린샷 `01-launch.png`, `adb-smoke/`) | `/verify-app` | finalize 보고, `/deploy` |

## 출시 후 이터레이션 (iter = {feature})

- **누적 문서** — 고정명 파일을 갱신한다: `feature-summary.md`, `data-model.md`, `page-map.md`, `wireframe-*.md`
- **신규 기능 스펙** — `docs/features/{feature}.md` 추가
- **이터레이션 스냅샷 + 최신 alias** — architecture와 test-scenarios는 두 파일을 쓴다:
  1. `docs/features/{feature}-architecture.md` / `docs/features/{feature}-test-scenarios.md` (이터레이션 canonical)
  2. `docs/features/architecture.md` / `docs/features/test-scenarios.md` — 동일 내용으로 갱신 (최신 alias)

## 소비자 규칙

1. 기본적으로 고정명(alias)을 읽는다 — 항상 최신 이터레이션 내용이다.
2. 특정 이터레이션 문서가 필요한 소비자(예: 배포 스모크 범위 산출)는 `{feature}-` 접두사 파일을 우선 참조하고, 없으면 고정명으로 fallback한다.
3. `docs/features/*.md`를 glob으로 읽어 "개별 기능 스펙"을 수집할 때는 다음 파일을 제외한다:
   - `ARTIFACTS.md`, `core-idea.md`, `feature-summary.md`, `data-model.md`, `page-map.md`
   - `wireframe-*.md`, `architecture.md`, `*-architecture.md`, `test-scenarios.md`, `*-test-scenarios.md`
4. 이 계약에 없는 파일명(예: `*-spec.md`)을 참조하지 않는다. 신규 산출물이 생기면 이 문서에 먼저 추가한다.

## JSONL artifacts 규칙

- `phase_completed`의 `detail.artifacts`에는 실제로 생성/갱신한 파일을 모두 나열한다.
- 출시 후 이터레이션에서는 스냅샷과 alias를 둘 다 나열한다
  (예: `["docs/features/search-architecture.md","docs/features/architecture.md"]`).
