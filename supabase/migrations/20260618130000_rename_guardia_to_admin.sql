drop policy if exists "Guardians can update profiles" on public.profiles;
drop policy if exists "Guardians can write groups" on public.groups;
drop policy if exists "Guardians can write group members" on public.group_members;
drop policy if exists "Owners and guardians can update events" on public.events;
drop policy if exists "Members can manage own attendance" on public.event_attendees;
drop policy if exists "Owners and guardians can update docs" on public.docs;
drop policy if exists "Sponsors and guardians can read invites" on public.invite_codes;
drop policy if exists "Members can create invites" on public.invite_codes;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.invite_codes drop constraint if exists invite_codes_role_check;

update public.profiles
set role = 'admin'
where role = 'guardia';

update public.invite_codes
set role = 'admin'
where role = 'guardia';

alter table public.profiles
  add constraint profiles_role_check check (role in ('nova pessoa', 'membro', 'admin'));

alter table public.invite_codes
  add constraint invite_codes_role_check check (role in ('nova pessoa', 'membro', 'admin'));

update public.docs
set summary = 'Subgrupos têm admin definido, visibilidade própria e uma lista de membros revista periodicamente.'
where id = 'd_3';

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() in ('nova pessoa', 'membro', 'admin'), false)
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'admin', false)
$$;

create or replace function public.is_guardian()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
$$;

create or replace function public.claim_founder(display_name text, display_pronouns text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if exists (select 1 from public.profiles) then
    raise exception 'Founder already exists';
  end if;

  insert into public.profiles (id, name, pronouns, sponsor_id, role, status)
  values (auth.uid(), nullif(trim(display_name), ''), coalesce(nullif(trim(display_pronouns), ''), 'por definir'), null, 'admin', 'online');

  insert into public.group_members (group_id, member_id)
  select id, auth.uid()
  from public.groups
  on conflict do nothing;

  update public.groups
  set steward_id = auth.uid()
  where steward_id is null;
end;
$$;

create policy "Admins can update profiles" on public.profiles
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can write groups" on public.groups
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can write group members" on public.group_members
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Owners and admins can update events" on public.events
for update to authenticated
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());

create policy "Members can manage own attendance" on public.event_attendees
for all to authenticated
using (member_id = auth.uid() or public.is_admin())
with check (member_id = auth.uid() or public.is_admin());

create policy "Owners and admins can update docs" on public.docs
for update to authenticated
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

create policy "Sponsors and admins can read invites" on public.invite_codes
for select to authenticated
using (sponsor_id = auth.uid() or public.is_admin());

create policy "Members can create invites" on public.invite_codes
for insert to authenticated
with check (
  sponsor_id = auth.uid()
  and public.is_member()
  and (role <> 'admin' or public.is_admin())
);

grant execute on function public.is_admin() to authenticated;
