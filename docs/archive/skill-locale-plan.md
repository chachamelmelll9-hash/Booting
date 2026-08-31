# Skill & Agent Locale Plan

GitHub repo template 판매를 위해 스킬/에이전트를 영어 기반 + locale 설정으로 전환하는 계획.

## 배경

- 현재 모든 스킬(SKILL.md), 에이전트(.claude/agents/*.md), CLAUDE.md가 한국어
- GitHub repo template으로 영어/한국어 2개 시장에 판매 예정
- 두 개 repo 유지는 비현실적 → 단일 repo, locale 설정으로 해결

## 설계 원칙

1. **스킬 본문은 영어** — 코드처럼 취급, 글로벌 개발자가 읽고 커스터마이징 가능
2. **사용자 대화는 locale로 제어** — Claude가 해당 언어로 응답
3. **사용자 노출 텍스트만 locale 파일로 분리** — 질문, 보고서 템플릿, 에러 메시지

## 목표 구조

```
CLAUDE.md                              # LOCALE 설정 포함
scripts/initial-setup.sh               # --locale ko|en 플래그

.claude/
  locale/
    en.yml                             # 영어 사용자 메시지
    ko.yml                             # 한국어 사용자 메시지
  skills/
    {skill-name}/
      SKILL.md                         # 영어 (로직/지시문)
      references/                      # 영어 (기술 참조)
  agents/
    {agent-name}.md                    # 영어 (로직/지시문)
```

## CLAUDE.md locale 설정

```markdown
## Locale

LOCALE=ko

All user-facing messages, questions, and reports must be in the locale language above.
Skill instructions (SKILL.md, agent .md) are written in English for maintainability.
When presenting options or asking questions to the user, use strings from `.claude/locale/{LOCALE}.yml`.
```

`initial-setup.sh --locale en` 실행 시 `LOCALE=en`으로 세팅.

## locale 파일 포맷

`.claude/locale/ko.yml`:

```yaml
# 공통
common:
  missing_prerequisite: "먼저 {skill}을 실행해주세요."
  select_mode: "모드를 선택해주세요:"
  confirm: "확인해주세요"
  done: "완료"

# 스킬별
init:
  ask_feature: |
    만들고 싶은 앱의 핵심 기능을 간단하게 설명해주세요.

    예시:
    - "반려동물 건강관리 — 사료/산책/병원 기록을 관리하고 알림을 보내주는 앱"
    - "기프티콘 관리 — 이미지에서 만료일을 자동으로 찾아 저장하고 알림을 주는 앱"
  select_name: "앱 이름을 선택해주세요"

launch:
  select_mode: |
    출시 모드를 선택해주세요:

    1. initial — 최초 앱 출시 (전체 준비 + 스토어 제출)
    2. update — 메이저 업데이트 출시 (리스팅 갱신 + 재제출)
  missing_deploy: "/deploy를 먼저 실행해주세요."
  missing_aso: "/make-aso-images를 먼저 실행해주세요."

deploy:
  select_mode: |
    배포 모드를 선택해주세요:

    1. initial — 최초 전체 배포
    2. {feature-name} — 특정 기능 추가 배포

make-aso-images:
  missing_screenshots: "/deploy를 먼저 실행해서 스크린샷을 캡처해주세요."
  confirm_headlines: "헤드라인을 확인해주세요"
  confirm_features: "선정된 기능을 확인해주세요"

clarify-core-feature:
  intro: "핵심 기능을 구체화하겠습니다."
```

`.claude/locale/en.yml`:

```yaml
common:
  missing_prerequisite: "Please run {skill} first."
  select_mode: "Select a mode:"
  confirm: "Please confirm"
  done: "Done"

init:
  ask_feature: |
    Describe the core feature of the app you want to build.

    Examples:
    - "Pet health tracker — manage feeding, walks, vet visits with reminders"
    - "Gift card manager — auto-detect expiry from images and send alerts"
  select_name: "Choose an app name"

launch:
  select_mode: |
    Select launch mode:

    1. initial — First app release (full preparation + store submission)
    2. update — Major update release (listing refresh + resubmission)
  missing_deploy: "Please run /deploy first."
  missing_aso: "Please run /make-aso-images first."

deploy:
  select_mode: |
    Select deploy mode:

    1. initial — Full initial deployment
    2. {feature-name} — Deploy specific feature

make-aso-images:
  missing_screenshots: "Run /deploy first to capture screenshots."
  confirm_headlines: "Please confirm the headlines"
  confirm_features: "Please confirm the selected features"

clarify-core-feature:
  intro: "Let's clarify the core feature."
```

## SKILL.md 참조 방식

스킬 내에서 locale 메시지 참조:

```markdown
### Step 1: Verify Prerequisites

If screenshots are missing, show the user: `locale.make-aso-images.missing_screenshots`
```

Claude가 `.claude/locale/{LOCALE}.yml`을 읽어서 해당 키의 메시지를 사용자에게 출력.

## 전환 대상 파일

### 스킬 (SKILL.md) — 영어로 전환

| 스킬 | 현재 언어 | 사용자 메시지 수 |
|------|----------|----------------|
| init | 혼합 | ~5 |
| clarify-core-feature | 한국어 | ~10 |
| define-pages | 한국어 | ~3 |
| design-wireframes | 한국어 | ~3 |
| design-architecture | 한국어 | ~3 |
| write-test-scenarios | 한국어 | ~5 |
| deploy | 한국어 | ~5 |
| make-aso-images | 한국어 | ~5 |
| launch | 한국어 | ~5 |
| setup-icons | 영어 | 0 |
| setup-landing | 확인 필요 | 확인 필요 |

### 에이전트 (.claude/agents/) — 영어로 전환

| 에이전트 | 현재 언어 |
|----------|----------|
| deploy-orchestrator.md | 한국어 |
| 기타 (있으면) | 확인 필요 |

### CLAUDE.md — 영어로 전환 + LOCALE 설정 추가

현재 한국어 섹션을 영어로 전환하되, LOCALE 설정에 따라 Claude 응답 언어를 제어.

## 전환 순서

### Phase 1: 인프라 준비
1. `.claude/locale/ko.yml` 생성 — 현재 한국어 메시지 추출
2. `.claude/locale/en.yml` 생성 — 영어 번역
3. `CLAUDE.md`에 LOCALE 섹션 추가
4. `initial-setup.sh`에 `--locale` 플래그 추가

### Phase 2: 스킬 전환 (의존성 역순)
1. `setup-icons` — 이미 영어, locale 참조만 추가
2. `init` — 영어 전환 + locale 참조
3. `clarify-core-feature` — 영어 전환 + locale 참조
4. `define-pages` → `design-wireframes` → `design-architecture`
5. `write-test-scenarios`
6. `deploy` + `deploy-orchestrator.md`
7. `make-aso-images`
8. `launch`

### Phase 3: CLAUDE.md 전환
1. 프로젝트 설명 영어 전환
2. 빌드 명령어 섹션 정리 (이미 영어)
3. 한국어 주석/설명 영어로 교체

### Phase 4: 검증
1. `LOCALE=en`으로 전체 파이프라인 테스트
2. `LOCALE=ko`로 전체 파이프라인 테스트
3. 새 locale 추가 테스트 (예: `ja.yml`)

## 새 locale 추가 방법

구매자가 새 언어를 추가할 때:

1. `.claude/locale/ja.yml` 생성 (ko.yml 복사 후 번역)
2. `CLAUDE.md`에서 `LOCALE=ja` 변경
3. 끝 — 스킬 로직 수정 불필요

## 판매 관점 정리

- **GitHub repo template 1개**만 관리
- 구매자: `./scripts/initial-setup.sh --name MyApp --locale en` 실행하면 즉시 영어 환경
- README.md는 영어 기본 (글로벌 시장 타깃)
- 한국어 구매자는 `--locale ko`로 설정
- 스킬 커스터마이징은 영어로 되어 있어 글로벌 개발자도 가능
