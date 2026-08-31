# Server Architecture: Clean Architecture (NestJS)

## Layers

Controller → Service → Repository (Supabase Client)

## Module Structure

```
apps/server/src/
  {module}/
    {module}.controller.ts        — REST endpoints
    {module}.service.ts           — Business logic
    {module}.module.ts            — NestJS module definition
    dto/
      {action}.dto.ts             — Request/Response DTOs
    guard/                         — (if module-specific guards needed)
      {guard}.guard.ts
```

Shared: `common/` for guards, decorators, filters, pipes.
Clear dependency direction: Controller → Service → Supabase Client.

## API Contracts

Define each endpoint:

```
{METHOD} /api/{resource}
  Request: {DTO fields}
  Response: {DTO fields}
  Auth: Required | Optional | None
  Used by: {Page Name}
```

## Database (if needed)

If new tables are needed for Supabase:

```
Table: {table_name}
  id: uuid (PK)
  {column}: {type}
  created_at: timestamp
  updated_at: timestamp

RLS Policy: {description}
```

All DB operations must use Supabase MCP.
