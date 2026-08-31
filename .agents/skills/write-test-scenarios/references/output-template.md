# Output Template: Test Scenarios Document

Write to `docs/features/{feature-name}-test-scenarios.md`:

~~~markdown
# Test Scenarios: {Feature Name}

## Overview
- Feature Specs: `docs/features/*.md`
- Page Map: `docs/features/page-map.md`
- Wireframes: `docs/features/wireframe-*.md`
- Architecture: `docs/features/architecture.md`

## Journey -> Scenario Mapping
| # | Journey Step | Scenarios | IDs | Components |
|---|--------------|-----------|-----|------------|
| 1 | {step name} | {n} | S1.1 ~ S1.{n} | {Mobile, Server, DB} |
| 2 | {step name} | {n} | S2.1 ~ S2.{n} | {components} |
| E2E | Full flow | 1 | E2E-01 | Mobile, Server, DB |
| | **Total** | {total} | | |

> The `Components` column helps prioritize verification and likely ownership when failures are found.

## Verification Checklist

### 1) Server E2E Checklist
- [ ] API contract and response coverage
- [ ] state transition and exception coverage
- [ ] DB consistency checks only where the UI cannot prove the result

### 2) Mobile ADB Checklist
- [ ] **Step 1: {Journey Step 1}**
  - [ ] S1.1: {Happy Path title}
  - [ ] S1.2: {Empty State title} (if applicable)
  - [ ] S1.3: {Error State title} (if applicable)
- [ ] **Step 2: {Journey Step 2}**
  - [ ] S2.1: {Happy Path title}
  - [ ] S2.2: ...
- [ ] **E2E: Full Journey**
  - [ ] E2E-01: {full-flow title}

### 3) Post-deploy ADB Smoke Checklist
- [ ] app launch and first render
- [ ] core flow 1
- [ ] core flow 2
- [ ] failure or empty state coverage
- [ ] settings or legal document entry when applicable

## Scenarios

### Step 1: {Journey Step 1}
> Depends: none
> Related page: {page name}
> Related wireframe: {wireframe section}

#### S1.1: Happy Path - {title}
```gherkin
{Given/When/Then}
```
**Verification:** visible mobile UI change first, then UI dump, logs, API, or DB confirmation only if needed

#### S1.2: Empty State - {title}
```gherkin
{Given/When/Then}
```

#### S1.3: Error State - {title}
```gherkin
{Given/When/Then}
```

---

### E2E: {Feature Name} Full Flow

#### E2E-01: {full-flow title}
```gherkin
{full Given/When/Then across all major steps}
```
**Verification:** ADB scenario sequence before deploy, then ADB smoke after deploy

## Command References
- Gherkin: `references/gherkin-template.md`
- ADB: `references/adb-commands.md`

## Decision Log
| Step | Question | Choice |
|------|----------|--------|
| ... | ... | ... |
~~~
