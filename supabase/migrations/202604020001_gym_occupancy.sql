-- Gym occupancy aggregation migration

create or replace function public.get_gym_occupancy()
returns table (
  gym_id text,
  occupancy_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    current_gym_id as gym_id,
    count(user_id) as occupancy_count
  from public.user_locations
  where is_at_gym = true
    -- Only count users seen in the last 4 hours to avoid ghost sessions
    and (last_seen_at > now() - interval '4 hours' or last_seen_at is null)
  group by current_gym_id;
$$;

grant execute on function public.get_gym_occupancy() to authenticated;
