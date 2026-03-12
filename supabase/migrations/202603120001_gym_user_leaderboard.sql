drop view if exists public.gym_leaderboard;

create or replace function public.gym_user_leaderboard(target_gym_id text)
returns table (
  user_id uuid,
  total_minutes integer,
  total_sessions integer,
  rank integer,
  display_name text,
  email text,
  avatar_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
with aggregates as (
  select
    s.user_id,
    sum(s.duration_minutes)::int as total_minutes,
    count(*)::int as total_sessions
  from public.climbing_sessions s
  where s.is_active = false
    and s.gym_id = target_gym_id
  group by s.user_id
)
select
  a.user_id,
  a.total_minutes,
  a.total_sessions,
  row_number() over (order by a.total_minutes desc, a.total_sessions desc)::int as rank,
  p.display_name,
  p.email,
  p.avatar_url,
  p.created_at
from aggregates a
join public.profiles p on p.id = a.user_id
order by rank;
$$;

grant execute on function public.gym_user_leaderboard(text) to authenticated;
