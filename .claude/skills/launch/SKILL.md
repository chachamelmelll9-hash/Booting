---
name: launch
description: Submit the app to App Store and Play Store. Generates legal documents, store listings, landing page, then submits to stores and manages review process. Requires /deploy to be completed first (AAB/IPA + screenshots ready).
argument-hint: "[initial | update]"
allowed-tools: Read, Write, Edit, Glob, Grep, Agent, Bash(pnpm *), Bash(cd apps/*), Bash(bash .claude/skills/launch/references/*), Bash(python3 .claude/skills/launch/references/*), Bash(adb *), Bash(curl *), Bash(npx *), Bash(node *), Bash(mkdir *), Bash(agent-browser *), Bash(wrangler *), Bash(git *), Bash(test *), Bash(sleep *), Bash(which *), Bash(xcrun *), Bash(cp *), Bash(grep *), Bash(ls *), Bash(cat *), Bash(echo *)
---

## Auto Mode

`docs/progress/auto-mode.json` 파일이 존재하고 `enabled=true`이면:
- 모드 선택 프롬프트 스킵, `initial` 자동 선택
- Orchestrator 완료 후 `auto-mode.json`의 `enabled`를 `false`로 변경
- 스토어 인증 실패 시 블로킹하지 않고 "수동 인증 필요" 보고 후 종료

---

## Usage

If the user provided an argument, use it as the launch mode: $ARGUMENTS

- `initial` → 최초 출시 (법적 문서 + 스토어 리스팅 + 랜딩페이지 + 제출 + 심사)
- `update` → 메이저 업데이트 (리스팅 갱신 + 재제출)

If $ARGUMENTS is empty:
- **Auto mode**: `initial` 자동 선택. 프롬프트 스킵.
- **Interactive mode**: ask the user:
```
출시 모드를 선택해주세요:

1. initial — 최초 앱 출시 (전체 준비 + 스토어 제출)
2. update — 메이저 업데이트 출시 (리스팅 갱신 + 재제출)
```

## Instructions

### Step 1: Verify Deploy Completed

/deploy가 완료된 상태인지 확인:
```bash
# Production AAB / IPA 존재
ls -t apps/mobile/build-*.aab | head -1 || echo "MISSING: AAB — /deploy"
ls -t apps/mobile/build/ipa/*.ipa | head -1 || echo "MISSING: IPA — /deploy"

# 스토어 원본 스크린샷 — 플랫폼별 생산지점이 다르다 (둘 다 /deploy Phase 4)
#   Android: Phase 4 Step 2 (production ADB smoke, 스토어 캡처 모드)
#   iOS:     Phase 4 Step 3.5 (Release 시뮬레이터 캡처)  ← Android 캡처 재사용 금지
ls assets/screenshots/android/ko/*.png 2>/dev/null | head -1 || echo "MISSING: Android 원본 — /deploy Phase 4 Step 2"
ls assets/screenshots/ios/ko/*.png 2>/dev/null | head -1 || echo "MISSING: iOS 원본 — /deploy Phase 4 Step 3.5"

# ASO 프레임 이미지 (선택 — 있으면 원본 대신 업로드)
ls assets/aso-images/android/ko/*.png 2>/dev/null | head -1 || echo "OPTIONAL: Android ASO 프레임 없음 — 원본을 업로드한다"
ls assets/aso-images/ios/ko/*.png 2>/dev/null | head -1 || echo "OPTIONAL: iOS ASO 프레임 없음 — 원본을 업로드한다"

# Server 배포 확인 — SERVER_URL은 .deploy-state가 단일 소스 (deploy-orchestrator Step 0과 동일 규칙)
SERVER_DOMAIN=$(sed -n 's/^SERVER_DOMAIN=//p' infra/oracle/.deploy-state 2>/dev/null | head -1)
SERVER_DOMAIN="${SERVER_DOMAIN:-$(head -1 infra/oracle/Caddyfile 2>/dev/null | awk '{print $1}')}"
curl -sf "https://${SERVER_DOMAIN}/api" >/dev/null || echo "NOT_DEPLOYED: https://${SERVER_DOMAIN}/api"
```

AAB·IPA·양 플랫폼 원본 스크린샷 중 하나라도 MISSING이면 → "/deploy 를 먼저 실행해주세요."
ASO 프레임은 없어도 진행한다 (원본을 그대로 업로드).

### Step 2: Spawn Launch Orchestrator

Launch orchestrator agent를 **Agent 도구로 명시 spawn**한다:

```
Agent(
  subagent_type: "launch-orchestrator",
  name: "launch-orchestrator",
  run_in_background: false,
  description: "Launch {mode}",
  prompt: "mode: {initial|update}. Follow .claude/agents/launch-orchestrator.md Phase 0~5 in order. 제출 승인 정책은 docs/store-declarations.yaml의 submit_policy를 따른다."
)
```

- 에이전트 정의: `.claude/agents/launch-orchestrator.md` (frontmatter `name: launch-orchestrator`으로 등록됨)
- `run_in_background: false` — Step 3 보고와 Step 3.5 auto mode 정리가 결과에 의존하므로 동기 실행
- 전달 입력: mode (initial / update)

Orchestrator가 자율적으로 관리:
1. Phase 0: Prerequisites (스토어 계정/credential + deploy 산출물 확인)
2. Phase 1: 리스팅 준비 (앱 설명 + 릴리즈노트 + 스크린샷)
3. Phase 2: 법적문서 + 랜딩페이지 (생성 + WebView 배포)
4. Phase 3: 스토어 제출 (App Store + Play Store)
5. Phase 4: 심사 & 릴리즈
6. Phase 5: Completion Report

### Step 3: Report Results

Orchestrator 완료 후 결과를 사용자에게 보고:
- 스토어 제출 상태 (iOS/Android)
- 심사 상태
- 법적문서 URL
- 랜딩페이지 URL
- 해결되지 않은 문제

### Step 3.5: Auto Mode Cleanup

`docs/progress/auto-mode.json`을 읽는다. `enabled=true`이면:

1. `auto-mode.json`의 `enabled`를 `false`로 변경하고 `completed_at` 타임스탬프 추가
2. `docs/progress/pipeline.jsonl`에 `iteration_completed` 이벤트 append
3. 최종 요약 출력:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Auto Mode 파이프라인 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  기획 → 구현 → 배포 → 빌드 → 스토어 제출
  모든 단계가 자동으로 완료되었습니다.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
