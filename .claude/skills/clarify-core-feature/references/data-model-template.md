# Data Model (Logical)

Write to `docs/features/data-model.md`:

```markdown
# Data Model

## Entities
| Entity | Description | Key Attributes | Source Features |
|--------|-------------|----------------|-----------------|
| User | 앱 사용자 (공통) | id, created_at | (공통) |
| {Entity1} | {한 줄 설명} | id, {attr1}, {attr2}, created_at | {feature1}, {feature2} |
| {Entity2} | {한 줄 설명} | id, {attr1}, {attr2}, created_at | {feature1} |

## Relationships
{Entity1} 1──N {Entity2}
{Entity2} N──M {Entity3}
User 1──N {Entity1}

## Relationship Details
| Relationship | Type | Description |
|-------------|------|-------------|
| User → Entity1 | 1:N | {설명} |
| Entity1 → Entity2 | 1:N | {설명} |

## Notes
- 논리 모델 수준 (Supabase 테이블/Zustand 스토어 매핑은 구현 단계에서 결정)
- 인증/프로필 등 공통 엔티티(User)는 포함하되 최소한으로 정의
- 각 엔티티의 Source Features는 해당 엔티티가 사용되는 기능 문서를 참조
```
