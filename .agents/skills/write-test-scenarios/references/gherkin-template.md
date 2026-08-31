# Gherkin Scenario Templates

## Scenario Group Structure

```gherkin
## Step {N}: {Journey Step Name}
> Depends: Step {N-1} completed
> Related page: {page name from page map}
> Related wireframe: {wireframe section reference}

### S{N}.1: Happy Path - {summary}

Scenario: {specific scenario title}
  Given {precondition - previous step complete, current screen state}
  When the user performs the following actions:
    - {tap target}
    - {text input if needed}
    - {scroll or swipe if needed}
  Then the UI should show:
    - {visible change 1}
    - {visible change 2}
  [Verification: visible UI assertion, UI dump, and logs when needed]

### S{N}.2: Empty State - {summary}

Scenario: {specific scenario title}
  Given {the relevant data is empty and the user opens the screen}
  When the user performs {the trigger action}
  Then the UI should show:
    - "{empty state copy from the approved spec}"
    - "{CTA label}" button
  [Verification: visible UI assertion or UI dump]

### S{N}.3: Error State - {summary}

Scenario: {specific scenario title}
  Given {an error-producing condition such as invalid input or offline state}
  When the user performs {the trigger action}
  Then the UI should show:
    - "{error copy from the approved spec}"
    - "Try again" action if applicable
  [Verification: visible UI assertion, UI dump, and logs]

### S{N}.4: DB Verification - only when the UI cannot prove the result

Scenario: {data persistence or side-effect confirmation}
  Given S{N}.1 has completed successfully
  When the relevant table is queried
  Then the expected data should exist:
    | Column | Expected |
    | {col1} | {value1} |
    | {col2} | {value2} |
  [Verification: Supabase query or equivalent]
```

## End-To-End Scenario Template

```gherkin
## E2E: {Feature Name} Full Journey

Scenario: {user goal completed across all major steps}
  Given {initial state}

  # Step 1: {Journey Step 1}
  When the user performs {step 1 action}
  Then the UI should show {step 1 result}

  # Step 2: {Journey Step 2}
  When the user performs {step 2 action}
  Then the UI should show {step 2 result}

  ...

  Then the overall user goal is complete:
    - {final visible state}
    - {DB or server confirmation only if the UI cannot prove it}
```
