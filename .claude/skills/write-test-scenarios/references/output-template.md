# Output Template: Test Scenarios Document

파일명은 `docs/features/ARTIFACTS.md` 계약을 따른다 — 초기 파이프라인은 고정명 `docs/features/test-scenarios.md`, 출시 후 이터레이션은 `docs/features/{feature}-test-scenarios.md` 스냅샷 + `docs/features/test-scenarios.md` alias 갱신:

~~~markdown
# Test Scenarios: {Feature Name}

## Overview
- Feature Specs: `docs/features/*.md`
- Page Map: `docs/features/page-map.md`
- Wireframes: `docs/features/wireframe-*.md`
- Architecture: `docs/features/architecture.md`

## Journey → Scenario 매핑
| # | Journey Step | Scenarios | IDs | Components |
|---|-------------|-----------|-----|------------|
| 1 | {step name} | {n} | S1.1 ~ S1.{n} | {Mobile, Server, DB 중 관여하는 것} |
| 2 | {step name} | {n} | S2.1 ~ S2.{n} | {관여 컴포넌트} |
| ... | | | | |
| E2E | 전체 관통 | 1 | E2E-01 | Mobile, Server, DB |
| | **합계** | {total} | | |

> **Components 컬럼**: 배포 단계에서 검증 우선순위를 정하는 데 사용된다.

## Verification Checklist

### 1) Server E2E Checklist
- [ ] API 계약/응답 검증 항목
- [ ] 상태 전이/예외 처리 항목
- [ ] 필요 시 DB 정합성 확인 항목

### 2) Mobile ADB Checklist
- [ ] **Step 1: {Journey Step 1 name}**
  - [ ] S1.1: {Happy Path 제목}
  - [ ] S1.2: {Empty State 제목} (해당 시)
  - [ ] S1.3: {Error State 제목} (해당 시)
- [ ] **Step 2: {Journey Step 2 name}**
  - [ ] S2.1: {Happy Path 제목}
  - [ ] S2.2: ...
- [ ] **E2E: 전체 관통 테스트**
  - [ ] E2E-01: {전체 흐름 제목}

### 3) Post-deploy ADB Smoke Checklist
- [ ] 앱 실행/초기 렌더 확인
- [ ] 핵심 기능 동선 1
- [ ] 핵심 기능 동선 2
- [ ] 실패/빈 상태 확인
- [ ] 설정/법적 문서 진입 (해당 시)

## Scenarios

### Step 1: {Journey Step 1 Name}
> Depends: none
> 관련 화면: {page name}
> 관련 와이어프레임: {wireframe section}

#### S1.1: Happy Path — {제목}
```gherkin
{Given/When/Then}
```
**검증:** 모바일 화면 변화 + 필요 시 API/DB 확인

#### S1.2: Empty State — {제목}
```gherkin
{Given/When/Then}
```

#### S1.3: Error State — {제목}
```gherkin
{Given/When/Then}
```

---

### E2E: {Feature Name} 전체 흐름

#### E2E-01: {전체 관통 제목}
```gherkin
{전체 Given/When/Then — 모든 step 연결}
```
**검증:** ADB 테스트 시퀀스 + 배포 후 ADB smoke 재확인

## Command References
- ADB: [references/adb-commands.md]

## Decision Log
| Step | Question | Choice |
|------|----------|--------|
| ... | ... | ... |
~~~
