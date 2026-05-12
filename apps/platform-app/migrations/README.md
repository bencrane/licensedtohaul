# Migrations

`lth.*` schema lives in the hq-x Supabase project (same DB as `business.*`).
Apply via the pooled connection string already in `hq-licensed-to-haul/prd`.

```bash
# From apps/platform-app/
doppler run -- psql "$HQX_DB_URL_POOLED" -f migrations/001_create_lth_schema.sql
```

Migrations are forward-only. To roll back, write a new migration that reverses
the change.
