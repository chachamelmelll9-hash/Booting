# Gherkin Scenario Templates

## Scenario Group Structure

```gherkin
## Step {N}: {Journey Step Name}
> Depends: Step {N-1} 완료
> 관련 화면: {page name from pages spec}
> 관련 와이어프레임: {wireframe section reference}

### S{N}.1: Happy Path — {정상 흐름 설명}

Scenario: {구체적 시나리오 제목}
  Given {사전 조건 — 이전 step이 완료된 상태, 화면 위치}
  When 사용자가 {화면에서 하는 구체적 행동}:
    - {탭할 버튼/영역}
    - {입력할 텍스트} (입력이 있는 경우)
    - {스와이프/스크롤 등} (필요 시)
  Then 화면에서 다음을 확인한다:
    - {변화 1 — 어떤 요소가 나타나는지/사라지는지/변경되는지}
    - {변화 2}
  [검증: 스크린샷 촬영 → 와이어프레임 {section} 대조]

### S{N}.2: Empty State — {데이터 없는 경우}

Scenario: {구체적 시나리오 제목}
  Given {데이터가 없는 상태에서 해당 화면 진입}
  When 사용자가 {화면에서 하는 행동}
  Then 화면에서 다음을 확인한다:
    - "{empty state 안내 문구 from feature spec State Matrix}" 텍스트 표시
    - "{CTA 버튼 레이블}" 버튼 표시
  [검증: 스크린샷 촬영]

### S{N}.3: Error State — {에러 발생 경우}

Scenario: {구체적 시나리오 제목}
  Given {에러를 유발하는 조건 — 네트워크 끊김, 잘못된 입력 등}
  When 사용자가 {화면에서 하는 행동}
  Then 화면에서 다음을 확인한다:
    - "{구체적 에러 메시지 from feature spec State Matrix}" 텍스트 표시
    - "다시 시도" 버튼 표시
  [검증: 스크린샷 촬영]

### S{N}.4: DB 확인 (화면에서 확인 불가한 경우만)

Scenario: {데이터 영속성 확인}
  Given S{N}.1 Happy Path가 완료된 상태이다
  When Supabase에서 {table_name} 테이블을 조회한다
  Then 다음 데이터가 존재한다:
    | Column | Expected |
    | {col1} | {value1} |
    | {col2} | {value2} |
  [검증: Supabase MCP 쿼리]
```

## E2E 관통 시나리오 Template

```gherkin
## E2E: {Feature Name} 전체 흐름

Scenario: {사용자 목표 달성 전체 과정}
  # Step 1: {Journey Step 1 name}
  Given {초기 상태}
  When 사용자가 {Step 1 행동}
  Then 화면에서 {Step 1 결과} 확인
  [스크린샷: E2E-01]

  # Step 2: {Journey Step 2 name}
  When 사용자가 {Step 2 행동}
  Then 화면에서 {Step 2 결과} 확인
  [스크린샷: E2E-02]

  ...

  # 최종 확인
  Then 사용자의 목표가 달성되었다:
    - {최종 화면 상태}
    - {Supabase 확인 — 화면에서 안 보이는 것만}
  [스크린샷: E2E-FINAL]
```
