# Output Template: Feature Summary

Write to `docs/features/feature-summary.md`:

```markdown
# Feature Summary

## Ordered Features

구현 순서 (의존성 기준):

1. {Feature A} — {독립적 / 의존성 메모}
2. {Feature B} — {독립적 / 의존성 메모}
3. {Feature C} — {Feature A 데이터 활용 등}

## Features

### {Feature A}

- **Source Spec**: `docs/features/{feature-a}.md`
- **User Goal**: {태스크 관점의 사용자 목표}
- **Summary**: {1문단 요약}
- **Journey Steps**: {Discovery → Entry → Input → Result → Exit — 실제 포함된 단계만, 순서대로}
- **Key Screens**: {스펙에서 암시된 화면/route 목록, 없으면 TBD}
- **Core Data**: {이 기능이 다루는 핵심 엔티티/데이터 — data-model.md의 Source Features와 일치}
- **Key Decisions**: {다운스트림 스킬이 알아야 할 중요한 UX 결정}

### {Feature B}

...
```

Rules:

- `/define-pages`는 개별 스펙 파일 대신 이 문서만 읽으므로, 탭/페이지 도출에 필요한 정보(User Goal, Journey 단계 수와 순서, 핵심 화면, 핵심 데이터)를 빠짐없이 담는다.
- 출시 후 이터레이션에서는 새 기능 섹션을 추가하고 Ordered Features를 갱신한다 (파일명 계약: `docs/features/ARTIFACTS.md`).
