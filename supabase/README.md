# Supabase Migrations

Migration SQL files live in `supabase/migrations/`.

**Single policy**: schema changes are executed via Supabase MCP `apply_migration`, and the exact same SQL is always recorded as a file here. The files are the reproducible record; deploy applies any pending ones in order.

## Naming Convention

```
YYYYMMDDHHMMSS_description.sql
```

Example: `20260319120000_create_users.sql`

## How Migrations Are Created

- **Implementation (db-implement agent)**: Applies the schema change via Supabase MCP `apply_migration` **and** writes the identical SQL to `supabase/migrations/{timestamp}_{feature_name}.sql` in the same step.

## How Migrations Are Applied

- **Deploy orchestrator**: Reads files from `supabase/migrations/` in order and applies pending ones via Supabase MCP or `supabase db push`.
- **Local development**: Use `supabase db push` or apply manually through the Supabase Dashboard.

## Notes

- Files are applied in alphabetical (timestamp) order.
- Each file should be idempotent or use `IF NOT EXISTS` guards.
- Do not modify already-applied migration files. Create a new migration instead.
