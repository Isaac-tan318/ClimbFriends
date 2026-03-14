-- Rankings gym index migration
-- Rollback notes:
-- 1) drop index if exists idx_climbing_sessions_completed_gym_user;

create index if not exists idx_climbing_sessions_completed_gym_user
  on public.climbing_sessions (gym_id, user_id)
  where is_active = false;
