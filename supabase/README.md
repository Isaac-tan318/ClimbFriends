# Supabase Setup

## 1) Environment
Create `.env` from `.env.example` and set:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

For scripts/functions also set:

- `SUPABASE_SECRET_KEY`

## 2) Migrations
Apply SQL in order:

1. `supabase/migrations/202603110001_initial_schema.sql`
2. `supabase/migrations/202603120001_gym_user_leaderboard.sql`
3. `supabase/seed.sql`

## 3) Edge Functions
Function stubs are in:

- `supabase/functions/publish-session/index.js`
- `supabase/functions/invite-friends/index.js`
- `supabase/functions/send-push-notification/index.js`
- `supabase/functions/compute-leaderboards/index.js`

## 4) Import Mock Data
Run one-off script after creating user accounts:

```bash
node scripts/supabase/import-mock-data.mjs
```

This script expects `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in your environment.
