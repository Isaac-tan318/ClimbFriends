create or replace function public.is_planned_visit_owner(plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.planned_visits pv
    where pv.id = plan_id
      and pv.user_id = auth.uid()
  );
$$;

create or replace function public.is_planned_visit_invitee(plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.visit_invites vi
    where vi.planned_visit_id = plan_id
      and vi.invitee_id = auth.uid()
  );
$$;

drop policy if exists "plans owner or invitee can read" on public.planned_visits;
create policy "plans owner or invitee can read"
  on public.planned_visits for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_planned_visit_invitee(id)
  );

drop policy if exists "invites read participant" on public.visit_invites;
create policy "invites read participant"
  on public.visit_invites for select
  to authenticated
  using (
    invitee_id = auth.uid()
    or public.is_planned_visit_owner(planned_visit_id)
  );

drop policy if exists "invites owner create" on public.visit_invites;
create policy "invites owner create"
  on public.visit_invites for insert
  to authenticated
  with check (public.is_planned_visit_owner(planned_visit_id));

drop policy if exists "invites invitee or owner update" on public.visit_invites;
create policy "invites invitee or owner update"
  on public.visit_invites for update
  to authenticated
  using (
    invitee_id = auth.uid()
    or public.is_planned_visit_owner(planned_visit_id)
  )
  with check (
    invitee_id = auth.uid()
    or public.is_planned_visit_owner(planned_visit_id)
  );

grant execute on function public.is_planned_visit_owner(uuid) to authenticated;
grant execute on function public.is_planned_visit_invitee(uuid) to authenticated;
