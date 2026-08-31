# Output Template: Architecture Document

파일명은 `docs/features/ARTIFACTS.md` 계약을 따른다 — 초기 파이프라인은 고정명 `docs/features/architecture.md`, 출시 후 이터레이션은 `docs/features/{feature}-architecture.md` 스냅샷 + `docs/features/architecture.md` alias 갱신:

```markdown
# Architecture: {Feature Name}

## Overview
- Feature Specs: `docs/features/*.md`
- Page Map: `docs/features/page-map.md`
- Wireframes: `docs/features/wireframe-*.md`

## Mobile Architecture (Clean FSD)

### File Tree
```
apps/mobile/
  app/
    {complete route file tree}
  src/
    features/
      {complete feature module tree}
    shared/
      {new shared components}
```

### Feature Modules

#### {feature-name}/
- **Responsibility**: {한 줄 설명}
- **Components**: {list}
- **State**: {Zustand store or local state}
- **API Calls**: {list of endpoints used}

### New Shared Components
| Component | Props | Used By |
|-----------|-------|---------|
| {name} | {key props} | {pages} |

### Route-to-Feature Mapping
| Route File | Feature | Component |
|------------|---------|-----------|
| app/(tabs)/{path} | features/{name} | {Component} |

## Server Architecture (Clean Architecture)

### File Tree
```
apps/server/src/
  {complete module tree}
```

### Modules

#### {module-name}/
- **Responsibility**: {한 줄 설명}
- **Endpoints**: {list}
- **Dependencies**: {other modules, Supabase}

### API Contracts
| Method | Endpoint | Request | Response | Auth |
|--------|----------|---------|----------|------|
| {METHOD} | /api/{path} | {DTO} | {DTO} | {Y/N} |

### DTOs

#### {Action}Dto
```typescript
{
  field: type;  // description
}
```

## Database Schema (if applicable)

### New Tables
| Table | Columns | RLS |
|-------|---------|-----|
| {name} | {key columns} | {policy summary} |

### Migration
```sql
-- {description}
CREATE TABLE {name} (
  ...
);
```

## Implementation Order
Suggested implementation sequence:

1. [ ] Database: Create tables & RLS policies
2. [ ] Server: {module} module (controller, service, DTOs)
3. [ ] Mobile: shared components ({list})
4. [ ] Mobile: {feature} feature module
5. [ ] Mobile: route files & navigation
6. [ ] Integration testing

## Decision Log
| Area | Question | Choice |
|------|----------|--------|
| Mobile | ... | ... |
| Server | ... | ... |
```
