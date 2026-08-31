# Progress Tracking Event Schema

모든 스킬과 에이전트는 이 스키마에 맞춰 JSONL 이벤트를 기록한다.

## 파일 구조

```
docs/progress/
  pipeline.jsonl     # 파이프라인 phase 전환 이벤트 (모든 이터레이션)
  features.jsonl     # 구현 상세: worker 상태, static test, E2E, 에러 로그
  deploys.jsonl      # 배포/빌드/스토어 제출/OTA/릴리스
  auto-mode.json     # (JSONL 아님) auto mode 활성 상태 + preferences — /setup 생성, /launch 종료
  preflight.json     # (JSONL 아님) 1회 세팅 점검 결과 + 남은 blocker — /preflight 생성
```

### 부속 상태 파일 (JSONL 아님)

| 파일 | 생산자 | 소비자 | 핵심 필드 |
|---|---|---|---|
| `docs/progress/auto-mode.json` | `/setup` (Phase 0-2) | 모든 스킬, **Stop 훅 라우터** | `enabled`(라우터의 단일 판정 기준), `problem`, `release_ready`, `preferences.{use_supabase,kakao_login,locale,icon_source,declarations}` |
| `docs/progress/preflight.json` | `/preflight` (Phase 4) | `/setup`, `deploy-orchestrator` Step -1 | `tier1_ok`, `release_ready`, `generated[]`, `blockers[]` |
| `docs/store-declarations.yaml` | `/preflight` (Phase 3-2) — **값의 소유자는 사용자** | `launch-orchestrator`, `/setup-landing` | `submit_policy`, `business.*`, `age_rating.*`, `data_safety.*`, `pricing`, `countries`, `ads.*`, `app_access.*` |

> `store-declarations.yaml`의 값은 **AI가 생성·추론하지 않는다**. 없으면 `phase_blocked`로 멈춘다 — 자세한 이유는 `CLAUDE.md`의 "Auto Mode 실행 계약" 참조.

## 공통 필드

```jsonl
{"ts":"2026-04-04T14:30:00+09:00","iter":"initial","feature":null,"phase":"setup","skill":"setup","event":"phase_completed","detail":{},"output":null}
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `ts` | O | ISO 8601 타임스탬프 (KST +09:00) |
| `iter` | O | `"initial"` (초기 파이프라인) 또는 feature명 (출시 후 추가 이터레이션) |
| `feature` | △ | 특정 feature 관련 시 feature명, 아니면 `null` |
| `phase` | O | 파이프라인 단계 (아래 참조) |
| `skill` | △ | 스킬명 — `agent`와 상호배타 |
| `agent` | △ | 에이전트명 — `skill`과 상호배타 |
| `event` | O | 이벤트 타입 |
| `detail` | △ | 추가 정보 (JSON object, 생략 시 `{}`) |
| `output` | △ | 생성된 산출물 경로 |

### phase 값

`setup` · `start` · `clarify` · `define-pages` · `wireframes` · `architecture` · `test-scenarios` · `implement` · **`verify`** · `deploy` · `build` · `launch`

정본은 `.codex/hooks/lib/common.py`의 `PIPELINE_PHASES`다 (라우터가 읽는 유일한 순서).

**로컬 완주 경계** — `verify`까지는 외부 계정·인프라 없이 100% 자동으로 도달한다.
`verify`가 끝나면 "앱이 빌드되고 에뮬레이터에서 동작한다"가 증명된 상태다.

`deploy` · `build` · `launch`는 **release-gated**다 (`common.py`의 `RELEASE_GATED_PHASES`).
`auto-mode.json`의 `release_ready`가 `true`가 아니면 라우터가 이 셋을 통째로 건너뛰고 파이프라인을 정상 종료한다.

> `build` phase는 release prep 하위 작업을 포함한다. 현재 subphase skill은 `setup-icons`, `setup-landing`, `make-aso-images`이며, 각 이벤트는 `phase="build"`와 실제 `skill` 값으로 구분한다.

### iter 규칙

- 초기 파이프라인 (setup→launch): `"initial"`
- 출시 후 추가 Feature: feature명 (예: `"search-feature"`)
- 출시 후 이터레이션은 `setup`/`start` 건너뛰고 `clarify`부터 시작

### 활성 iter 결정 (공용 규칙)

각 스킬 문서의 JSONL 예시 bash 블록은 초기 파이프라인 기준으로 `"iter":"initial"`을 사용한다.
출시 후 이터레이션에서는 이벤트 기록 전에 활성 iter를 결정하여 `"initial"`을 치환한다:

1. `pipeline.jsonl`을 역순 스캔한다
2. 최신 `iteration_completed` 이후에 `iteration_started`가 있으면 → 그 이벤트의 `iter` 값이 활성 iter
3. 없으면 (또는 파일이 없으면) → `"initial"`

셸에서 계산이 필요한 경우 공용 스니펫:

```bash
ITER=$(awk '/"event":"iteration_started"/{if (match($0,/"iter":"[^"]*"/)) last=substr($0,RSTART+8,RLENGTH-9)} /"event":"iteration_completed"/{last=""} END{if (last=="") print "initial"; else print last}' docs/progress/pipeline.jsonl 2>/dev/null)
ITER=${ITER:-initial}
```

### artifacts 경로 규칙

`detail.artifacts`와 `output`의 파일 경로는 산출물 파일명 계약 `docs/features/ARTIFACTS.md`를 따른다.

---

## pipeline.jsonl 이벤트

| event | 의미 | detail |
|-------|------|--------|
| `phase_started` | 스킬 실행 시작 | `{}` |
| `phase_completed` | 스킬 완료 | `{"artifacts":["path1","path2"]}` |
| `phase_skipped` | 건너뜀 | `{"reason":"설명"}` |
| `phase_blocked` | **로컬**에서 자동 해결 불가능한 문제로 중단 — 파이프라인 전체가 정지한다 | `{"reason":"실제 에러 원문","manual_action":"필요 작업"}` |
| `phase_deferred` | 외부 계정·인프라 부재로 이 phase만 연기 — 파이프라인은 계속 진행한다 | `{"reason":"release_ready=false ...","missing":"...","resume":"..."}` |

> **`phase_blocked`와 `phase_deferred`를 혼동하지 않는다.**
> `phase_blocked`는 라우터를 정지시키는 비상 브레이크다. 계정·크레덴셜·클라우드 인프라가 없다는 이유로
> 이걸 쓰면 안 된다 — 그건 `phase_deferred`다. 과거 `deploy`가 `release_ready=false`에 대해
> `phase_blocked`를 기록해, 계정이 없다는 이유만으로 앱 빌드·동작확인까지 못 하고 파이프라인이 죽었다.
> 라우터는 `phase_completed`와 `phase_deferred`를 모두 "이 phase는 더 볼 일 없음"으로 취급한다.
| `feature_completed` | clarify 내 개별 feature 완료 | `{"name":"feed","index":1,"total":3}` |
| `iteration_started` | 새 이터레이션 시작 | `{"from_version":"1.0.0"}` |
| `iteration_completed` | 이터레이션 완료 | `{"version":"1.1.0"}` |

---

## features.jsonl 이벤트

| event | 의미 | detail |
|-------|------|--------|
| `worker_started` | worker 생성 | `{"worker":"db-implement"}` |
| `worker_completed` | worker 완료 | `{"worker":"server-implement","files_created":12}` |
| `worker_failed` | worker 실패 | `{"worker":"mobile-implement","error":"tsc error","attempt":2}` |
| `worker_retried` | worker 재시도 | `{"worker":"mobile-implement","attempt":3}` |
| `worker_checkpoint` | worker 가 spawn 예산 소진으로 `PARTIAL` 반환 → 체크포인트로 이어서 spawn (실패 아님) | `{"worker":"mobile-implement","slice":"home","continuation":2,"checkpoint":"docs/progress/checkpoints/mobile-implement-home.md"}` |
| `impl_status` | 구현 전체 상태 스냅샷 (`/continue`가 재개 지점 판정에 쓴다) | `{"status":"IN_PROGRESS｜COMPLETED｜FAILED"}` |
| `static_test` | lint/build/tsc 결과 | `{"tool":"pnpm lint","result":"PASS"}` 또는 `{"tool":"mobile tsc","result":"FAIL","errors":3}` |
| `e2e_result` | E2E 결과 | `{"suite":"server-e2e","pass":12,"fail":2}` |
| `adb_result` | ADB smoke 결과 | `{"build":"dev","pass":8,"fail":1}` |
| `review_applied` | 리뷰 개선 적용 | `{"type":"architecture","item":"Extract shared hook"}` |
| `error_logged` | 에러 기록 | `{"worker":"server-implement","phase":"Phase2","error":"...","resolution":"..."}` |
| `impl_status` | 구현 상태 변경 | `{"status":"IN_PROGRESS"}` / `{"status":"COMPLETED"}` / `{"status":"FAILED"}` |

---

## deploys.jsonl 이벤트

| event | 의미 | detail |
|-------|------|--------|
| `deploy_started` | 배포 시작 | `{"mode":"initial"}` 또는 `{"mode":"incremental"}` |
| `component_deployed` | 컴포넌트 배포 완료 | `{"component":"server","url":"https://..."}` |
| `component_deploy_failed` | 배포 실패 | `{"component":"webview","error":"..."}` |
| `migration_applied` | DB 마이그레이션 | `{"files":["20260404_add_search.sql"],"count":1}` |
| `build_completed` | 프로덕션 빌드 | `{"platform":"android","output":"path.aab","type":"store"}` |
| `ota_deployed` | OTA 배포 | `{"channel":"production","runtime_version":"1.0.0"}` |
| `version_tagged` | 릴리스 버전 태깅 | `{"version":"1.0.0","build":"1"}` |
| `smoke_result` | ADB smoke in deploy | `{"phase":"dev","pass":10,"fail":0}` |
| `store_submitted` | 스토어 제출 | `{"store":"play-store","version":"1.0.0"}` |
| `review_status` | 심사 상태 | `{"store":"app-store","status":"in-review"}` |
| `store_released` | 출시 | `{"store":"play-store","rollout":100,"version":"1.0.0"}` |
| `version_tagged` | Git 태그 | `{"tag":"v1.0.0","features":["feed","walk"]}` |

---

## JSONL Append 패턴

모든 스킬/에이전트는 다음 패턴으로 이벤트를 기록한다:

```bash
echo '{"ts":"'"$(date -u +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"setup","skill":"setup","event":"phase_started","detail":{}}' >> docs/progress/pipeline.jsonl
```

> **주의**: `skill`과 `agent` 중 하나만 포함. 스킬은 `"skill":"스킬명"`, 에이전트는 `"agent":"에이전트명"`.

---

## /continue 스킬의 읽기 로직

1. `pipeline.jsonl` 역순 스캔 → 최신 `iteration_completed` / `iteration_started` 확인
2. 활성 `iter`의 이벤트만 필터 → 마지막 `phase_completed` 확인 → 다음 phase 결정
3. implement 단계면 `features.jsonl` 스캔 → worker 상태 복원
4. 실제 파일 존재 여부와 교차 검증
5. 다음 스킬 계산
6. hook-driven auto mode에서는 `Stop` hook가 다음 스킬 실행을 라우팅
