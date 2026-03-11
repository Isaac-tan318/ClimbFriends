-- Initial schema for ClimbFriends Supabase backend
-- Generated on 2026-03-11

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null,
  avatar_url text,
  level integer not null default 1,
  xp integer not null default 0,
  tier text not null default 'Noob',
  push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  location_enabled boolean not null default true,
  friend_visibility_enabled boolean not null default true,
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gyms (
  id text primary key,
  name text not null,
  brand text not null,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  radius_meters integer not null,
  address text not null,
  image_url text,
  grades text[] default '{}',
  walls text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_grades (
  brand text primary key,
  grades text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.climbing_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  gym_id text not null references public.gyms(id),
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_climbing_sessions_user_started
  on public.climbing_sessions (user_id, started_at desc);

create index if not exists idx_climbing_sessions_active
  on public.climbing_sessions (user_id, is_active)
  where is_active = true;

create table if not exists public.logged_climbs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.climbing_sessions(id) on delete cascade,
  gym_id text not null references public.gyms(id),
  user_id uuid not null references public.profiles(id) on delete cascade,
  grade text not null,
  color text not null,
  wall text not null,
  instagram_url text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_logged_climbs_session_id
  on public.logged_climbs (session_id);

create index if not exists idx_logged_climbs_gym_logged_at
  on public.logged_climbs (gym_id, logged_at desc);

create index if not exists idx_logged_climbs_user_logged_at
  on public.logged_climbs (user_id, logged_at desc);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

create unique index if not exists idx_friendships_pair_unique
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index if not exists idx_friendships_addressee_status
  on public.friendships (addressee_id, status);

create table if not exists public.user_locations (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_gym_id text references public.gyms(id),
  is_at_gym boolean not null default false,
  last_seen_at timestamptz,
  latitude numeric(10,7),
  longitude numeric(10,7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.planned_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  gym_id text not null references public.gyms(id),
  planned_date timestamptz not null,
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_planned_visits_user_planned_date
  on public.planned_visits (user_id, planned_date);

create table if not exists public.visit_invites (
  id uuid primary key default gen_random_uuid(),
  planned_visit_id uuid not null references public.planned_visits(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (planned_visit_id, invitee_id)
);

create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('session', 'send')),
  user_id uuid not null references public.profiles(id) on delete cascade,
  gym_id text not null references public.gyms(id),
  posted_at timestamptz not null default now(),
  session_id uuid references public.climbing_sessions(id) on delete set null,
  session_duration_minutes integer,
  climb_count integer,
  grade text,
  color text,
  wall text,
  instagram_url text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_feed_posts_posted_at
  on public.feed_posts (posted_at desc);

create index if not exists idx_feed_posts_gym_posted_at
  on public.feed_posts (gym_id, posted_at desc);

create table if not exists public.feed_post_climbed_with (
  feed_post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (feed_post_id, user_id)
);

create table if not exists public.achievements (
  id text primary key,
  category text not null,
  label text not null,
  description text not null,
  xp integer not null default 0,
  is_hidden boolean not null default false,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_messages_pair_created
  on public.messages (sender_id, receiver_id, created_at desc);

create index if not exists idx_messages_receiver_created
  on public.messages (receiver_id, created_at desc);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_user_settings_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

create trigger set_gyms_updated_at
before update on public.gyms
for each row execute function public.set_updated_at();

create trigger set_brand_grades_updated_at
before update on public.brand_grades
for each row execute function public.set_updated_at();

create trigger set_climbing_sessions_updated_at
before update on public.climbing_sessions
for each row execute function public.set_updated_at();

create trigger set_logged_climbs_updated_at
before update on public.logged_climbs
for each row execute function public.set_updated_at();

create trigger set_friendships_updated_at
before update on public.friendships
for each row execute function public.set_updated_at();

create trigger set_user_locations_updated_at
before update on public.user_locations
for each row execute function public.set_updated_at();

create trigger set_planned_visits_updated_at
before update on public.planned_visits
for each row execute function public.set_updated_at();

create trigger set_visit_invites_updated_at
before update on public.visit_invites
for each row execute function public.set_updated_at();

create trigger set_feed_posts_updated_at
before update on public.feed_posts
for each row execute function public.set_updated_at();

create trigger set_achievements_updated_at
before update on public.achievements
for each row execute function public.set_updated_at();

create trigger set_user_achievements_updated_at
before update on public.user_achievements
for each row execute function public.set_updated_at();

create trigger set_notifications_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

create trigger set_messages_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_locations (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace view public.national_leaderboard as
select
  s.user_id,
  sum(s.duration_minutes)::int as total_minutes,
  count(*)::int as total_sessions,
  row_number() over (order by sum(s.duration_minutes) desc, min(s.started_at) asc)::int as rank,
  p.display_name,
  p.email,
  p.avatar_url,
  p.created_at
from public.climbing_sessions s
join public.profiles p on p.id = s.user_id
where s.is_active = false
group by s.user_id, p.display_name, p.email, p.avatar_url, p.created_at;

create or replace view public.gym_leaderboard as
select
  s.gym_id,
  g.name as gym_name,
  g.brand,
  sum(s.duration_minutes)::int as total_minutes,
  count(*)::int as total_sessions,
  count(distinct s.user_id)::int as active_members_count,
  row_number() over (order by sum(s.duration_minutes) desc, count(*) desc)::int as rank
from public.climbing_sessions s
join public.gyms g on g.id = s.gym_id
where s.is_active = false
group by s.gym_id, g.name, g.brand;

create or replace function public.friends_leaderboard(current_user_id uuid)
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
with friend_ids as (
  select case
    when requester_id = current_user_id then addressee_id
    else requester_id
  end as friend_id
  from public.friendships
  where status = 'accepted'
    and (requester_id = current_user_id or addressee_id = current_user_id)
), target_ids as (
  select current_user_id as user_id
  union
  select friend_id from friend_ids
), aggregates as (
  select
    s.user_id,
    sum(s.duration_minutes)::int as total_minutes,
    count(*)::int as total_sessions
  from public.climbing_sessions s
  join target_ids t on t.user_id = s.user_id
  where s.is_active = false
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

-- RLS
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.climbing_sessions enable row level security;
alter table public.logged_climbs enable row level security;
alter table public.friendships enable row level security;
alter table public.user_locations enable row level security;
alter table public.planned_visits enable row level security;
alter table public.visit_invites enable row level security;
alter table public.feed_posts enable row level security;
alter table public.feed_post_climbed_with enable row level security;
alter table public.user_achievements enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.gyms enable row level security;
alter table public.brand_grades enable row level security;
alter table public.achievements enable row level security;

create policy "profiles readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles insert own row"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles update own row"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "user_settings own row"
  on public.user_settings for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sessions own rows"
  on public.climbing_sessions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "logged_climbs own rows"
  on public.logged_climbs for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "friendships participant access"
  on public.friendships for select
  to authenticated
  using (auth.uid() in (requester_id, addressee_id));

create policy "friendships create own request"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id);

create policy "friendships update participants"
  on public.friendships for update
  to authenticated
  using (auth.uid() in (requester_id, addressee_id))
  with check (auth.uid() in (requester_id, addressee_id));

create policy "friendships delete participants"
  on public.friendships for delete
  to authenticated
  using (auth.uid() in (requester_id, addressee_id));

create policy "locations readable by authenticated"
  on public.user_locations for select
  to authenticated
  using (true);

create policy "locations own row"
  on public.user_locations for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "plans owner or invitee can read"
  on public.planned_visits for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.visit_invites vi
      where vi.planned_visit_id = planned_visits.id
        and vi.invitee_id = auth.uid()
    )
  );

create policy "plans owner create"
  on public.planned_visits for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "plans owner update"
  on public.planned_visits for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "plans owner delete"
  on public.planned_visits for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "invites read participant"
  on public.visit_invites for select
  to authenticated
  using (
    invitee_id = auth.uid()
    or exists (
      select 1
      from public.planned_visits pv
      where pv.id = visit_invites.planned_visit_id
        and pv.user_id = auth.uid()
    )
  );

create policy "invites owner create"
  on public.visit_invites for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.planned_visits pv
      where pv.id = visit_invites.planned_visit_id
        and pv.user_id = auth.uid()
    )
  );

create policy "invites invitee or owner update"
  on public.visit_invites for update
  to authenticated
  using (
    invitee_id = auth.uid()
    or exists (
      select 1
      from public.planned_visits pv
      where pv.id = visit_invites.planned_visit_id
        and pv.user_id = auth.uid()
    )
  )
  with check (
    invitee_id = auth.uid()
    or exists (
      select 1
      from public.planned_visits pv
      where pv.id = visit_invites.planned_visit_id
        and pv.user_id = auth.uid()
    )
  );

create policy "feed posts readable by authenticated"
  on public.feed_posts for select
  to authenticated
  using (true);

create policy "feed posts create own"
  on public.feed_posts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "feed posts update own"
  on public.feed_posts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "feed posts delete own"
  on public.feed_posts for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "feed climbed_with read authenticated"
  on public.feed_post_climbed_with for select
  to authenticated
  using (true);

create policy "feed climbed_with post owner write"
  on public.feed_post_climbed_with for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.feed_posts fp
      where fp.id = feed_post_climbed_with.feed_post_id
        and fp.user_id = auth.uid()
    )
  );

create policy "feed climbed_with post owner delete"
  on public.feed_post_climbed_with for delete
  to authenticated
  using (
    exists (
      select 1
      from public.feed_posts fp
      where fp.id = feed_post_climbed_with.feed_post_id
        and fp.user_id = auth.uid()
    )
  );

create policy "user achievements own read"
  on public.user_achievements for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user achievements own write"
  on public.user_achievements for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "notifications own read"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "notifications own update"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notifications own insert"
  on public.notifications for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "messages participant read"
  on public.messages for select
  to authenticated
  using (auth.uid() in (sender_id, receiver_id));

create policy "messages sender insert"
  on public.messages for insert
  to authenticated
  with check (auth.uid() = sender_id);

create policy "messages receiver update read status"
  on public.messages for update
  to authenticated
  using (auth.uid() in (sender_id, receiver_id))
  with check (auth.uid() in (sender_id, receiver_id));

create policy "gyms readable by authenticated"
  on public.gyms for select
  to authenticated
  using (true);

create policy "brand grades readable by authenticated"
  on public.brand_grades for select
  to authenticated
  using (true);

create policy "achievements readable by authenticated"
  on public.achievements for select
  to authenticated
  using (true);

grant select on public.national_leaderboard to authenticated;
grant select on public.gym_leaderboard to authenticated;
grant execute on function public.friends_leaderboard(uuid) to authenticated;

