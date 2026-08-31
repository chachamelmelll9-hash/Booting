---
name: mobile-ux-ui-design
description: "React Native + Expo 모바일 UI/UX 디자인 인텔리전스. 프리미엄 디자인 규칙, anti-AI-slop 패턴, UX 가이드라인, 타이포그래피/컬러/모션 시스템, 사전 배포 체크리스트를 모바일 앱에 최적화하여 제공. 새 화면 디자인, UI 컴포넌트 생성/리팩토링, 와이어프레임→코드 변환, 컬러/타이포/레이아웃 결정, UI 리뷰, 네비게이션/애니메이션 구현 시 반드시 사용. 모바일 UI가 '프로답지 않아 보이는' 경우, 크로스플랫폼 디자인 정렬, 디자인 시스템 구축 시에도 사용을 권장."
allowed-tools: Read, Write, Glob, Grep, Bash(python3 *)
---

# Mobile UX/UI Design Intelligence

React Native + Expo 전용. taste-skill 프리미엄 디자인 규칙, ui-ux-pro-max UX 가이드라인, frontend-design 창의적 디자인 사고를 모바일 환경에 통합.

## When to Apply

**Must Use** — 화면 디자인, UI 컴포넌트 생성/리팩토링, 컬러·타이포·레이아웃 결정, UI 리뷰, 네비게이션·애니메이션 구현, 와이어프레임→코드 전환

**Recommended** — UI가 프로답지 않은 경우, 크로스플랫폼 디자인 정렬, 디자인 시스템 구축

**Skip** — 순수 백엔드, API/DB 설계, 인프라/DevOps

**판단 기준**: 사용자가 **보고, 느끼고, 터치하고, 상호작용하는 것**을 변경하면 이 스킬을 사용한다.

---

## 1. Design Thinking (구현 전 필수)

코드 작성 전에 맥락을 파악하고 **대담한 미적 방향**을 결정한다:

- **Purpose**: 이 인터페이스가 해결하는 문제는? 누가 사용하는가?
- **Tone**: 극단을 선택 — 극도의 미니멀, 맥시멀리스트, 레트로-퓨처리스틱, 럭셔리, 장난스러운/토이, 에디토리얼, 브루탈리스트, 소프트/파스텔 등
- **Constraints**: 퍼포먼스, 접근성, 플랫폼 요구사항
- **Differentiation**: 이것을 **잊을 수 없게** 만드는 한 가지는?

명확한 컨셉 방향을 선택하고 정밀하게 실행한다. 대담한 맥시멀리즘과 세련된 미니멀리즘 모두 가능 — 핵심은 **의도성**.

---

## 2. Baseline Configuration

모든 디자인 생성의 기본 다이얼. 사용자 요청에 따라 동적 조절.

| Dial | Default | Range |
|------|---------|-------|
| DESIGN_VARIANCE | 7 | 1=완벽 대칭 … 10=예술적 혼돈 |
| MOTION_INTENSITY | 5 | 1=정적 … 10=시네마틱 물리엔진 |
| VISUAL_DENSITY | 4 | 1=갤러리/여유 … 10=조종석/데이터 밀집 |

> **모바일 오버라이드:** 레벨 4-10에서도 소형 화면(<375pt)은 반드시 단일 열 폴백.

---

## 3. Rule Categories (Priority Order)

규칙은 우선순위순으로 적용한다. 각 카테고리의 상세 규칙은 `references/` 파일에 정의되어 있으며, 해당 작업 시 읽는다.

| # | Category | Impact | Reference File | When to Read |
|---|----------|--------|----------------|--------------|
| 1 | Accessibility | CRITICAL | `references/accessibility.md` | 모든 UI 작업 시 |
| 2 | Touch & Interaction | CRITICAL | `references/touch-interaction.md` | 인터랙티브 요소 구현 시 |
| 3 | Performance | HIGH | `references/performance.md` | 리스트, 애니메이션, 이미지 작업 시 |
| 4 | Typography | HIGH | `references/typography.md` | 텍스트 스타일링, 폰트 선택 시 |
| 5 | Color System | HIGH | `references/color-system.md` | 컬러 팔레트, 테마, 다크모드 구현 시 |
| 6 | Layout & Spacing | HIGH | `references/layout-spacing.md` | 레이아웃, 스페이싱, safe area 작업 시 |
| 7 | Navigation | HIGH | `references/navigation.md` | 네비게이션 구조 설계 시 |
| 8 | Motion & Animation | MEDIUM | `references/motion-animation.md` | 애니메이션, 전환 효과 구현 시 |
| 9 | States & Feedback | MEDIUM | `references/states-feedback.md` | 폼, 로딩/에러/빈 상태, 피드백 구현 시 |
| 10 | Icons & Visuals | MEDIUM | `references/icons-visuals.md` | 아이콘, 시각 요소 선택 시 |
| 11 | Anti-Patterns | HIGH | `references/anti-patterns.md` | 모든 UI 생성 시 (AI 기본 패턴 방지) |
| 12 | Creative Patterns | LOW | `references/creative-patterns.md` | 프리미엄/고급 효과 적용 시 |

---

## 4. Workflow

### Step 1: Analyze Requirements

사용자 요청에서 추출:
- **Product type**: Entertainment, Tool, Productivity, hybrid
- **Target audience**: 연령대, 사용 맥락 (출퇴근, 여가, 업무)
- **Style keywords**: playful, vibrant, minimal, dark mode, content-first 등
- **Stack**: React Native + Expo (이 프로젝트의 유일한 모바일 스택)

### Step 2: Generate Design System

ui-ux-pro-max 검색 도구는 이 저장소가 아니라 사용자 글로벌 스킬 디렉토리(`$HOME/.claude/skills/ui-ux-pro-max/`)에 설치되어 있을 수 있다. **사용 전 존재 여부를 먼저 확인**한다:

```bash
python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py --help
```

**성공 시** (도구 존재) — 아래 명령으로 활용한다:

```bash
# 디자인 시스템 생성
python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<product> <industry> <keywords>" --design-system -p "App Name"

# 상세 검색 (필요시)
python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain style
python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain color
python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain typography
python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack react-native

# 저장
python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "App Name"
```

**실패 시** (`No such file or directory` 등 — 도구 미설치) — 재시도하지 않고 **수동 fallback**으로 진행한다: 이 스킬의 references 규칙들(`typography.md`, `color-system.md`, `layout-spacing.md`, `anti-patterns.md`)을 직접 적용하여 수동으로 디자인 시스템을 구성한다.

### Step 3: Apply Rules

해당 작업에 맞는 reference 파일을 읽고 규칙을 적용한다:
1. **항상 읽기**: `references/anti-patterns.md` (AI 기본 패턴 방지)
2. **작업별 읽기**: 위 Rule Categories 테이블의 "When to Read" 참조
3. **마무리 시**: `references/pre-delivery-checklist.md` 실행

### Step 4: Verify

배포 전 `references/pre-delivery-checklist.md`의 항목을 모두 확인한다.

---

## 5. Quick Reference (핵심 규칙 요약)

전체 규칙은 references에 있지만, 가장 빈번하게 위반되는 핵심 규칙을 요약한다:

### Accessibility (CRITICAL)
- 본문 텍스트 대비 4.5:1 이상 (WCAG AA)
- 모든 인터랙티브 요소에 `accessibilityLabel` + `accessibilityRole`
- `AccessibilityInfo.isReduceMotionEnabled` 존중
- 색상만으로 정보 전달 금지

### Touch (CRITICAL)
- 최소 44×44pt (iOS) / 48×48dp (Android). 작으면 `hitSlop` 확장
- 터치 시 80-150ms 이내 시각적 피드백
- 시스템 제스처(iOS 스와이프백 등) 차단 금지

### Typography
- 본문 `fontSize: 16`, `lineHeight: 24`. 16px 미만 본문 금지
- AI 기본 폰트(Inter, Roboto) 대신 개성 있는 Display 폰트 선택
- 일관된 타입 스케일: 12/14/16/18/24/32/48

### Color
- 최대 1 액센트 컬러. AI 퍼플/블루 그라디언트 금지
- 시맨틱 토큰 (`primary`, `error`, `surface`) 사용. 하드코딩 hex 금지
- 다크 모드는 탈채도 변형. 양쪽 테마 별도 대비 테스트

### Animation
- `transform`과 `opacity`만 애니메이션. width/height/top/left 금지
- 스프링 물리 기본: `damping: 15-20, stiffness: 100-150`
- 마이크로 인터랙션 150-300ms. 500ms 초과 금지

### States
- 모든 데이터 화면에 Loading/Empty/Error/Success 상태 구현
- 300ms 초과 로딩 시 스켈레톤/시머 표시
- 에러 메시지에 원인 + 해결 방법 + 재시도

### Anti-Patterns (항상 확인)
- 보라색 그라디언트, 균등 3열 카드, 모든 요소 중앙 정렬 → **금지**
- 이모지를 구조적 아이콘으로 → **금지** (벡터 아이콘 사용)
- 선형 이징, 동시 페이드인 → **금지** (스프링 물리 + 스태거)

---

## 6. Integration with Other Skills

| Skill | How This Skill Helps |
|-------|---------------------|
| `/design-wireframes` | 와이어프레임 설계 시 이 스킬의 규칙을 적용하여 프리미엄 UI 품질 보장 |
| `/design-architecture` | 컴포넌트 구조 설계 시 디자인 토큰/테마 시스템 반영 |
| `/implement-feature` | 구현 시 이 스킬의 체크리스트로 UI 품질 검증 |
| `/deploy` | 배포 전 pre-delivery checklist 실행 |
