-- Backend core completion migration
-- Rollback notes:
-- 1) drop function if exists public.create_social_notification(uuid,text,text,text,jsonb);
-- 2) drop function if exists public.remove_friend(uuid);
-- 3) drop function if exists public.search_profiles(text,integer);
-- 4) drop function if exists public.resolve_current_gym(numeric,numeric);
-- 5) drop index if exists idx_climbing_sessions_active_user_unique;

create unique index if not exists idx_climbing_sessions_active_user_unique
  on public.climbing_sessions (user_id)
  where is_active = true;

create or replace function public.resolve_current_gym(
  latitude_input numeric,
  longitude_input numeric
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  with distances as (
    select
      g.id,
      g.radius_meters,
      6371000 * acos(
        least(
          1,
          greatest(
            -1,
            cos(radians(latitude_input::double precision))
              * cos(radians(g.latitude::double precision))
              * cos(radians(g.longitude::double precision) - radians(longitude_input::double precision))
              + sin(radians(latitude_input::double precision))
              * sin(radians(g.latitude::double precision))
          )
        )
      ) as distance_meters
    from public.gyms g
  )
  select d.id
  from distances d
  where d.distance_meters <= d.radius_meters
  order by d.distance_meters asc
  limit 1;
$$;

create or replace function public.search_profiles(
  search_text text,
  result_limit integer default 20
)
returns table (
  id uuid,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with actor as (
    select auth.uid() as user_id
  ),
  query_text as (
    select nullif(trim(search_text), '') as q
  )
  select
    p.id,
    p.email,
    p.display_name,
    p.avatar_url,
    p.created_at
  from public.profiles p
  cross join actor a
  cross join query_text qt
  where a.user_id is not null
    and p.id <> a.user_id
    and (
      qt.q is null
      or p.display_name ilike '%' || qt.q || '%'
      or p.email ilike '%' || qt.q || '%'
    )
    and not exists (
      select 1
      from public.friendships f
      where least(f.requester_id, f.addressee_id) = least(a.user_id, p.id)
        and greatest(f.requester_id, f.addressee_id) = greatest(a.user_id, p.id)
        and f.status in ('pending', 'accepted')
    )
  order by p.display_name asc
  limit greatest(1, least(coalesce(result_limit, 20), 50));
$$;

create or replace function public.remove_friend(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_user_id uuid := auth.uid();
  deleted_friendship_id uuid;
begin
  if actor_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  if actor_user_id = target_user_id then
    raise exception 'Cannot remove yourself from friends';
  end if;

  delete from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(actor_user_id, target_user_id)
    and greatest(f.requester_id, f.addressee_id) = greatest(actor_user_id, target_user_id)
  returning f.id into deleted_friendship_id;

  return deleted_friendship_id;
end;
$$;

create or replace function public.create_social_notification(
  target_user_id uuid,
  notification_type text,
  notification_title text,
  notification_body text default null,
  notification_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_user_id uuid := auth.uid();
  created_notification_id uuid;
  friendship_id uuid;
  planned_visit_id uuid;
  invite_status text;
begin
  if actor_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  if notification_type is null or notification_title is null then
    raise exception 'notification_type and notification_title are required';
  end if;

  if notification_type = 'friend_request' then
    friendship_id := nullif(notification_data ->> 'friendship_id', '')::uuid;
    if friendship_id is null then
      raise exception 'friend_request notification requires friendship_id';
    end if;

    if not exists (
      select 1
      from public.friendships f
      where f.id = friendship_id
        and f.requester_id = actor_user_id
        and f.addressee_id = target_user_id
        and f.status = 'pending'
    ) then
      raise exception 'Actor is not authorized to create this friend_request notification';
    end if;
  elsif notification_type = 'friend_request_accepted' then
    friendship_id := nullif(notification_data ->> 'friendship_id', '')::uuid;
    if friendship_id is null then
      raise exception 'friend_request_accepted notification requires friendship_id';
    end if;

    if not exists (
      select 1
      from public.friendships f
      where f.id = friendship_id
        and f.requester_id = target_user_id
        and f.addressee_id = actor_user_id
        and f.status = 'accepted'
    ) then
      raise exception 'Actor is not authorized to create this friend_request_accepted notification';
    end if;
  elsif notification_type = 'plan_invite' then
    planned_visit_id := nullif(notification_data ->> 'planned_visit_id', '')::uuid;
    if planned_visit_id is null then
      raise exception 'plan_invite notification requires planned_visit_id';
    end if;

    if not exists (
      select 1
      from public.planned_visits pv
      join public.visit_invites vi on vi.planned_visit_id = pv.id
      where pv.id = planned_visit_id
        and pv.user_id = actor_user_id
        and vi.invitee_id = target_user_id
        and vi.status = 'pending'
    ) then
      raise exception 'Actor is not authorized to create this plan_invite notification';
    end if;
  elsif notification_type = 'plan_response' then
    planned_visit_id := nullif(notification_data ->> 'planned_visit_id', '')::uuid;
    invite_status := nullif(notification_data ->> 'status', '');
    if planned_visit_id is null then
      raise exception 'plan_response notification requires planned_visit_id';
    end if;
    if invite_status not in ('accepted', 'declined') then
      raise exception 'plan_response notification requires status accepted or declined';
    end if;

    if not exists (
      select 1
      from public.planned_visits pv
      join public.visit_invites vi on vi.planned_visit_id = pv.id
      where pv.id = planned_visit_id
        and pv.user_id = target_user_id
        and vi.invitee_id = actor_user_id
        and vi.status = invite_status
    ) then
      raise exception 'Actor is not authorized to create this plan_response notification';
    end if;
  else
    raise exception 'Unsupported social notification type: %', notification_type;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    data
  )
  values (
    target_user_id,
    notification_type,
    notification_title,
    notification_body,
    notification_data
  )
  returning id into created_notification_id;

  return created_notification_id;
end;
$$;

grant execute on function public.resolve_current_gym(numeric, numeric) to authenticated;
grant execute on function public.search_profiles(text, integer) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.create_social_notification(uuid, text, text, text, jsonb) to authenticated;
