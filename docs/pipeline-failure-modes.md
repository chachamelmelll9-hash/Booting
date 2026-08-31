# Auto Mode 파이프라인 실패 모드 카탈로그

`/setup auto:` 가 "한 줄 요구사항 → 동작하는 앱"을 끝까지 자동으로 완주하지 못했던
실제 사례들과, 각각을 막는 가드를 정리한다.

출처는 **실측**이다 — `runner-log` 프로젝트의 Claude Code 세션 기록(2026-08-19)과,
그 수정을 검증하려고 새로 만든 `pace-share` 프로젝트의 실행 로그.
추정이 아니라 로그에 남은 것만 적었다.

회귀 가드는 `bash scripts/test-pipeline.sh` 로 한 번에 돌린다.

---

## A. 파이프라인이 통째로 죽는 것

### A1. 개인 스킬이 프로젝트 스킬을 가린다

**증상** — auto mode 가 특정 phase 에서 멈추고, 사용자에게 "직접 실행해 달라"고 요청한다.

**실측**
```
Skill implement-feature cannot be used with Skill tool due to disable-model-invocation.
Ask the user to run /implement-feature themselves — it cannot be invoked via the Skill tool.
```
같은 세션의 다른 phase 로그에는 이렇게 찍혔다:
```
Base directory for this skill: /Users/…/.claude/skills/write-test-scenarios
```
프로젝트의 `.claude/skills/` 가 아니라 **개인 디렉토리**의 스킬이 실행된 것이다.

**원인** — `~/.claude/skills/` 에 예전 템플릿에서 복사해 둔 사본이 남아 있었다.
파이프라인 스킬 10개가 가려졌고, 그중 5개(`implement-feature`·`deploy`·`launch`·
`setup-icons`·`setup-landing`)에는 `disable-model-invocation: true` 가 붙어 있어
모델이 호출하는 것 자체가 차단됐다.

**가드**
- `scripts/doctor-skills.sh` — 탐지, `--fix` 로 백업 후 제거
- `/preflight` 의 `T1_SKILLS` 체크가 auto mode 진입 전에 막는다
- Stop 훅 라우터 프롬프트가 "정본은 이 저장소의 `.claude/skills/{skill}/SKILL.md`"임을 명시하고,
  `Skill()` 이 실패하거나 저장소 밖 정의를 로드하면 **파일을 직접 읽어 실행**하도록 지시한다
- 정합성 테스트가 파이프라인 스킬에 `disable-model-invocation` 이 재유입되면 잡는다

### A2. 계정이 없다는 이유로 빌드·동작확인까지 막힌다

**증상** — 구현까지 끝났는데 `deploy` 에서 `phase_blocked` 로 파이프라인이 정지.
앱이 실제로 도는지는 끝내 확인되지 않는다.

**실측** — `release_ready=false` (Oracle·Cloudflare·Play·App Store 미설정) 하나로
`deploy` 가 `phase_blocked` 를 기록했고, 라우터는 그 뒤로 아무것도 진행하지 않았다.

**원인** — 출시 전제(계정·인프라)와 개발 전제(로컬 툴체인)를 구분하지 않았다.
그리고 `phase_blocked` 는 라우터에서 **영구 종결**이었다.

**가드**
- `verify` phase 신설 — 빌드 + 에뮬레이터 기동 + ADB 스모크를 **외부 계정 없이** 수행
- `deploy`·`build`·`launch` 를 `RELEASE_GATED_PHASES` 로 분리. `release_ready` 가 아니면 라우터가 건너뛴다
- `phase_deferred` 이벤트 도입 — 외부 전제 부재는 연기이지 차단이 아니다
- `phase_blocked` 는 **로컬에서 자동 해결이 불가능한 경우에만** 쓴다

### A3. 진행 기록이 비어 라우터가 정체한다

**원인** — `pipeline.jsonl` 은 라우터의 유일한 입력인데, `implement` phase 는 시작(스킬)과
종료(오케스트레이터 에이전트)의 기록 주체가 다르다. 에이전트가 중간에 죽으면 `phase_started` 만 남는다.

**가드** — `implement-feature` Step 4.5 가 종료 이벤트 존재를 확인하고, 없으면
오케스트레이터 결과에 근거해 직접 기록한다. 구현이 안 끝났는데 `phase_completed` 를 쓰는 것은 금지.

### A4. 라우터가 이미 지나간 phase 로 되감는다

**실측** — `setup` 완료 후 뒤늦게 `setup phase_started` 가 append 됐고,
그 사이 `start` 가 완료됐는데도 라우터가 `setup` 으로 되돌아갔다.
(직접 원인은 같은 저장소에서 두 세션이 동시에 파이프라인을 돌린 것이었다.)

**가드** — `interrupted_phase` 가 "더 뒤 phase 의 종료 이벤트가 그 시작 기록 이후에 있으면
버려진 기록"으로 판정한다. `phase_blocked` 도 종료 이벤트로 취급한다
(빠뜨리면 blocked 된 phase 의 앞선 `phase_started` 를 찾아내 무한 재라우팅한다).

### A5. 정상 작업 중인데 "정체"로 판정되어 중단된다

**증상** — 긴 phase 가 실제로 산출물을 만들고 있는데 라우터가 파이프라인을 중단시킨다.

**실측** — `wireframes` 가 UX 리뷰어 응답을 기다리는 동안 턴이 끝났고, 라우터가 같은 phase 를
재라우팅했다. 그 사이 와이어프레임 파일 7개를 쓰고 있었는데도 진행 지문은 그대로였다
(`stale_count` 가 1까지 올라갔고 상한은 2였다 — 한 번만 더 밀렸으면 전체 중단).

**원인** — 진행 지문이 `pipeline.jsonl` 이벤트만 봤다. 그런데 기획 phase 들
(`clarify`/`define-pages`/`wireframes`/`architecture`/`test-scenarios`)은 이벤트를
**시작·종료 때만** 쓰고 그 사이 진행은 파일로만 나타난다. `implement` 도 마찬가지로
worker 진행을 `features.jsonl` 에 남긴다.

**가드**
- 지문에 `features.jsonl`·`deploys.jsonl` 이벤트를 포함
- 지문에 `docs/features`·`docs/progress`·`test-results` 의 파일 상태(경로/크기/mtime)를 포함
- `MAX_STALE_REPEATS` 2 → 3 (폭주 백스톱은 `MAX_CONSECUTIVE_BLOCKS`=60 이 담당)
- `verify-app` 은 각 관문마다 `deploys.jsonl` 에 진행을 남긴다

### A6. 서브에이전트 응답을 무한정 기다린다

**증상** — UX 리뷰어가 응답하지 않는데 phase 가 계속 대기하며 진행하지 않는다.

**원인** — 리뷰는 품질 향상 수단인데 phase 완료의 전제처럼 다뤄졌다.

**가드** — `define-pages`/`design-wireframes` 가 대기 상한 계약을 갖는다:
독립 작업 우선 처리 → `ListAgents` 로 생존 확인 → 그래도 없으면 `mobile-ux-ui-design`
체크리스트로 셀프 리뷰를 대신하고 진행(`detail.ux_review: "self (reviewer unresponsive)"`).
리뷰어 미응답은 `phase_blocked` 사유가 아니다.

### A7. 서브에이전트 답신이 유실된다 (호출자 이름 하드코딩)

**증상** — 리뷰어/자문 에이전트가 "무응답"으로 보인다. 호출한 phase 가 응답을 기다리며 진행하지 못한다.

**실측**
```
`team-lead` is not reachable in this session (active agents: `main`, `ux-ui-designer`)
```
`ux-ui-designer` 와 `clarifying-plan-agent` 의 정의가 답신 대상을 `"team-lead"` 로 **하드코딩**하고
있었는데, 실제 호출자 이름은 `main` 이었다. 두 에이전트는 리뷰·답변을 **정상적으로 생성했지만**
아무 데도 도달하지 못했다.

runner-log 의 clarify 단계에 남은
`"clarifier 에이전트 무응답으로 결정은 오케스트레이터가 직접 수행"`
이라는 기록의 정체가 바로 이것이다.

**왜 위험한가** — 실패가 조용하다. 에이전트는 성공했다고 믿고, 호출자는 영원히 기다린다.
그 대기 동안 진행 이벤트가 없으므로 라우터의 정체 감지가 파이프라인을 중단시킬 수 있다
(실측: `wireframes` 에서 `stale_count` 가 상한 직전까지 올라갔다).

**가드**
- 두 에이전트가 **"메시지를 보낸 상대"에게** 답신하도록 수정 (하드코딩 금지)
- 상대를 특정할 수 없으면 `ListAgents` 로 찾고, 그래도 안 되면 **본문을 최종 응답으로 반환**한다
- 정합성 테스트가 `SendMessage to "team-lead"` 형태의 하드코딩 재유입을 잡는다
- 호출하는 쪽(A6)도 대기 상한을 갖는다 — 두 방향에서 막는다
- A10 이후 기본 경로는 단발 spawn + 반환값이라 SendMessage 답신 자체가 필요 없다

---

### A8. 워커 하나의 컨텍스트가 부풀어 토큰의 절반을 먹는다

**증상**: implement 가 끝나기 전에 5시간 창이 소진된다. 로그를 에이전트별로 귀속하면 `mobile-implement`
하나가 cache_read 의 46% (run4: 72M/156M, 230턴, 피크 컨텍스트 624K).
**원인**: 워커는 turn 마다 자기 컨텍스트 전체를 다시 읽는다. 스펙 전부를 읽고 시작해 화면 17개를 한 컨텍스트에서
구현하면 비용이 `턴 수 × 컨텍스트` 로 제곱 성장한다. "리뷰 루프가 범인" 이라는 첫 진단은 틀렸다 — 리뷰는 6분, 10% 였다.
**대책**: `implement-orchestrator.md` 토큰 예산 규약 — spawn 당 툴 호출 60회 상한 + 체크포인트 + continuation spawn,
mobile 은 foundation + 탭 slice, slice 별로 필요한 문서만 전달. 정합성 테스트가 규약 존재를 확인한다.

### A9. 컨텍스트가 phase 를 넘어 누적되고, 디렉토리 덤프가 끝까지 재독된다

**증상 1**: planning 5 phase 가 한 턴에 체이닝되어 MAIN 컨텍스트가 49K→339K (run4). 이후 implement·verify 의 모든 MAIN 턴이 그 339K 를 다시 읽는다.
**대책**: supervisor 모드 — `docs/progress/supervisor.json` 이 있으면 스킬은 체이닝하지 않고 턴을 끝내며, Stop 훅도 주입하지 않고, `run-auto.sh` 가 라우터 프롬프트로 phase 마다 새 프로세스를 띄운다.

**증상 2**: 에이전트가 `for f in *; do cat` 로 42~51KB 를 덤프 → 출력 상한으로 파일 저장 → 그 파일을 `Read` 로 통째로 재독 (5회, ~200KB). architecture.md(41KB)·page-map(36KB)·test-scenarios(36KB) 를 통째로 읽은 횟수 250+. 턴 단위 `sleep` 폴링 31회 (매회 270~300K 재독).
**대책**: orchestrator 규칙 6·7 + 워커 공통 규약 — 필요한 파일·섹션만, 저장된 대용량 출력은 `grep`/`sed -n` 으로, 대기는 Bash 한 번 안에서.

### A10. 리뷰어가 요청 범위 밖을 탐색하고, 상주하며 누적한다

**실측(run4)** — `ux-ui-designer` spawn 2회가 tool_result 238KB(cache_read 1.9M). 레퍼런스 7개는 22KB 뿐이고,
나머지는 호출자가 요청하지 않은 탐색이었다: page-structure 모드에서 와이어프레임 6개·앱 코드·i18n, component-architecture
모드에서 architecture.md 41KB·page-map 36KB·와이어프레임 7개·shared 코드. wireframe 모드는 상주 리뷰어 하나가 탭 7개를
SendMessage 로 받아 전부 누적하는 구조였다 (A6·A7 의 무대이기도 했다).

**가드** — 에이전트 정의에서 Glob/Grep 제거, 모드별 레퍼런스 표(3~4개만), 호출자가 지정한 파일만 읽기, 리뷰 1건 툴 호출 ≤12.
세 스킬은 리뷰를 **단발 spawn(`run_in_background: true`)** 으로 바꾸고 결과를 반환값으로 받는다 — 준비 알림·shutdown·답신 대상이 사라져
A6/A7 의 유실 경로도 함께 닫힌다. 정합성 테스트가 재유입을 잡는다.

**검증(2026-08-27, pace-share 실데이터)** — page-structure: Read 2회(레퍼런스 2개), cache_read 31K, 피크 19K, 30초. wireframe(feed 탭): Read 5회(레퍼런스 4 + 탭 파일 1), tool_result 20KB, cache_read 15K, 피크 30K, 48초. run4 의 spawn 당 ~120KB·~1M 대비 입력 1/6, cache_read 1/30. 리뷰 품질은 유지(B/A- 등급, 규칙 근거 인용).

## B. 통과했는데 실제로는 검증되지 않은 것

### B1. 서버 헬스체크가 정상일 때도 404

**실측**
```
http://localhost:3000        -> HTTP 404
http://localhost:3000/api    -> HTTP 200
http://localhost:3000/api/health -> HTTP 200
```
`apps/server/src/main.ts` 가 `setGlobalPrefix('api')` 를 하므로 루트는 매핑되지 않는다.
`setup` Phase 4-2 가 루트로 `curl -sf` 를 걸고 있어 **서버가 멀쩡해도 항상 SERVER_FAIL** 이었고,
재시도 2회 후 `phase_blocked` — 첫 phase 에서 파이프라인이 죽는다.

**가드** — 게이트는 외부 의존이 없는 `/api`(liveness). `/api/health` 는 Supabase 연결까지
보므로 정보용으로만 쓴다. 정합성 테스트가 루트를 치는 헬스체크를 잡는다.

### B2. 스크린샷이 전부 검은 이미지

**실측** — 서로 다른 화면을 찍어도 **바이트 수가 같은 10,195B PNG** 가 반복 생성됐고,
`uiautomator` 덤프는 비어 있었다. 원인은 두 가지가 겹친 것:
`mWakefulness=Asleep`(화면 잠듦)과 Apple Silicon 기본 host-GPU 렌더링.

수정 후 실측: **1,391,081B** 실제 렌더 홈 화면, uiautomator 덤프 7,198B.

**왜 치명적인가** — 스모크는 "앱이 아무것도 안 그린다"고 오판하고, **같은 경로를 쓰는
스토어 제출 스크린샷이 통째로 검게 나간다.**

**가드** — `scripts/ensure-emulator.sh` 로 단일화(소프트웨어 렌더링 + 화면 깨우기).
`verify-app`/`adb-smoke` 는 UI 노드 수를 1차 신호로 빈 화면을 걸러낸다.
정합성 테스트가 직접 `emulator -avd` 를 띄우는 코드를 잡는다.

### B3. 브랜딩되지 않은 앱을 검증한다

**실측** — `app.json` 은 `Stride`/`com.app.stride` 인데 에뮬레이터에 설치된 앱은
템플릿 기본값 `com.myorg.myapp` 이었다.

**원인** — `setup` 의 `pnpm dev` 가 옛 패키지명으로 `apps/mobile/android/` 를 이미 생성했고
`expo run:android` 는 그걸 재사용한다. 재생성(`prebuild --clean`)은 **카카오 설정 절 안에만**
있어서 `preferences.kakao_login=false` 면 통째로 건너뛰어졌다.
`apps/mobile/android/` 는 gitignore 라 이 불일치가 diff 에도 안 보인다.

**가드** — `start` Step 3.5 가 카카오 분기 밖에서 패키지명을 대조해 필요하면 재생성하고,
`verify-app` 도 `build.gradle` 의 `applicationId` 와 `app.json` 을 다시 대조한다.

### B4. dev 빌드가 Metro 를 못 찾아 빈 화면

**실측** — `Cannot connect to Metro. URL: 10.0.2.2:8081`. 증상이 "앱이 안 뜬다"라서
앱 버그로 오인되고 디버깅이 헛돈다.

**가드** — `ensure-emulator.sh` 가 부팅 후 8081/3000/4200/54321 을 `adb reverse` 로 매핑한다.

---

## C. 자동화가 외부 사정으로 끊기는 것

### C1. 클라우드 Supabase 프로젝트 생성 실패

**실측** — 무료 플랜 프로젝트 개수 한도에 걸려 생성이 실패했다.

**가드** — `setup` Phase 3-2 가 로컬 스택(`supabase start`)으로 내려가고
`preferences.supabase_mode=local` 을 기록한다. `db-implement` 는 그 모드에서 MCP 대신
로컬 CLI 로 마이그레이션을 적용한다. Docker 조차 없을 때만 `phase_blocked`.

### C2. Supabase MCP 가 세션 중에 로드되지 않는다

**원인** — `provision-supabase.sh` 는 세션 도중 `.mcp.json` 을 쓰는데, MCP 서버는
세션 시작 시점에만 로드된다. 즉 auto mode 첫 회차에는 MCP 가 **반드시** 없다.
과거에는 여기서 하드 중단하고 사용자에게 세션 재시작을 요구했다.

**가드** — `db-implement` 가 `supabase db push` CLI 폴백을 쓴다(이력을 남기므로 멱등).
`/preflight` 의 재시작 게이트는 안내 문구로 바뀌었다.

### C3. 템플릿 자체가 품질 게이트를 통과 못 한다

**실측** — 갓 만든 프로젝트가 `pnpm lint` 에서 에러 3건(import 정렬)으로 실패했다.
husky pre-commit 이 `typecheck && lint && test && build` 를 돌리므로,
**auto mode 의 Stop 훅 auto-commit 이 매 턴 조용히 실패**해 아무것도 커밋되지 않는다.

**가드** — 템플릿 소스를 고쳤고, `setup` Phase 4-3.5 가 기능 구현 **전에** 기준선을 확인한다.

---

### C4. 5시간 rate limit 창이 파이프라인 중간에 끝난다

**증상**: `You've hit your session limit · resets 11pm` 으로 모든 에이전트가 동시에 죽는다 (run4: 21:28, 이용률 14%→100%).
Claude Code 는 이걸 감지해 기다리지 않고, Stop 훅 라우터도 rate limit 을 모른다. 마지막 turn 의 미기록 작업(리뷰어 3개 + 워커 4개, 6분)이 유실됐다.
**대책**: `scripts/run-auto.sh` supervisor. stream-json 의 `rate_limit_event` 를 읽어 85% 에서 `docs/progress/rate-limit.json` 에 pause 를 걸면
Stop 훅은 다음 phase 를 주입하지 않고 PreToolUse 훅은 새 Agent spawn 을 거부한다. 97%/rejected 에서 종료, `resetsAt` 후 `/continue` 로 재기동.
동시 서브에이전트 상한 4 는 게이트가 반응할 시간을 벌기 위한 것이다 (7개 동시 실행 시 89%→100% 가 4분).

## 원칙

이 카탈로그에서 반복되는 규칙 세 가지:

1. **로컬에서 자동화 가능한 것은 외부 사정으로 막지 않는다.**
   계정·인프라 부재는 `phase_deferred` 이지 `phase_blocked` 가 아니다.
2. **증거 없는 통과를 만들지 않는다.**
   검은 스크린샷, 브랜딩 안 된 앱, 비어 있는 UI 덤프는 "통과"가 아니다.
3. **경로·형식·도구 존재를 단정하지 않는다.**
   URL 스킴, SDK 경로, 서버 라우트 prefix는 실제로 확인하고 쓴다.
