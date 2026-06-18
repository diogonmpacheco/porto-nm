create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  pronouns text not null default 'por definir',
  joined_at date not null default current_date,
  sponsor_id uuid references public.profiles(id) on delete set null,
  role text not null default 'nova pessoa' check (role in ('nova pessoa', 'membro', 'guardia')),
  status text not null default 'online' check (status in ('online', 'offline'))
);

create table if not exists public.groups (
  id text primary key,
  name text not null,
  focus text not null,
  privacy text not null default 'convite' check (privacy in ('aberto', 'convite', 'secreto')),
  steward_id uuid references public.profiles(id) on delete set null,
  color text not null default '#176b63',
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id text not null references public.groups(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, member_id)
);

create table if not exists public.events (
  id text primary key,
  title text not null,
  starts_at timestamptz not null,
  place text not null,
  group_id text not null references public.groups(id) on delete cascade,
  capacity integer not null default 12 check (capacity > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.event_attendees (
  event_id text not null references public.events(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, member_id)
);

create table if not exists public.docs (
  id text primary key,
  code text not null unique,
  title text not null,
  summary text not null,
  owner_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  tags text[] not null default '{}'
);

create table if not exists public.messages (
  id text primary key,
  room_id text not null references public.groups(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  recipients_at_send uuid[] not null default '{}',
  citation_code text references public.docs(code) on delete set null
);

create table if not exists public.invite_codes (
  code text primary key,
  sponsor_id uuid references public.profiles(id) on delete set null,
  role text not null default 'nova pessoa' check (role in ('nova pessoa', 'membro', 'guardia')),
  max_uses integer not null default 1 check (max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

insert into public.groups (id, name, focus, privacy, steward_id, color)
values
  ('g_geral', 'Comunidade geral', 'conversas, acolhimento e anúncios', 'convite', null, '#176b63'),
  ('g_eventos', 'Eventos Porto', 'jantares, cafés, caminhadas e assembleias', 'convite', null, '#c4493d'),
  ('g_cuidados', 'Cuidados e acordos', 'consentimento, limites e mediação', 'secreto', null, '#5457a6')
on conflict (id) do nothing;

insert into public.docs (id, code, title, summary, owner_id, updated_at, tags)
values
  ('d_1', 'DOC-001', 'Acordos de consentimento', 'Qualquer encontro da comunidade assume consentimento explícito, reversível, informado, entusiasmado e específico.', null, '2026-06-12'::timestamptz, array['consentimento', 'eventos']),
  ('d_2', 'DOC-002', 'Entradas por apadrinhamento', 'Cada nova entrada fica vinculada a quem convidou, com responsabilidade inicial de acolhimento e orientação.', null, '2026-06-14'::timestamptz, array['entradas', 'confiança']),
  ('d_3', 'DOC-003', 'Gestão de subgrupos', 'Subgrupos têm guardiã/o definido, visibilidade própria e uma lista de membros revista periodicamente.', null, '2026-06-16'::timestamptz, array['grupos', 'moderação'])
on conflict (id) do nothing;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() in ('nova pessoa', 'membro', 'guardia'), false)
$$;

create or replace function public.is_guardian()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'guardia', false)
$$;

create or replace function public.community_has_founder()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles)
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
  values (auth.uid(), nullif(trim(display_name), ''), coalesce(nullif(trim(display_pronouns), ''), 'por definir'), null, 'guardia', 'online');

  insert into public.group_members (group_id, member_id)
  select id, auth.uid()
  from public.groups
  on conflict do nothing;

  update public.groups
  set steward_id = auth.uid()
  where steward_id is null;
end;
$$;

create or replace function public.accept_invite(_invite_code text, display_name text, display_pronouns text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_invite public.invite_codes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if exists (select 1 from public.profiles where id = auth.uid()) then
    return;
  end if;

  select *
  into selected_invite
  from public.invite_codes
  where lower(code) = lower(trim(_invite_code))
    and uses < max_uses
    and (expires_at is null or expires_at > now())
  for update;

  if not found then
    raise exception 'Invalid or expired invite';
  end if;

  insert into public.profiles (id, name, pronouns, sponsor_id, role, status)
  values (
    auth.uid(),
    nullif(trim(display_name), ''),
    coalesce(nullif(trim(display_pronouns), ''), 'por definir'),
    selected_invite.sponsor_id,
    selected_invite.role,
    'online'
  );

  update public.invite_codes
  set uses = uses + 1
  where code = selected_invite.code;

  insert into public.group_members (group_id, member_id)
  values ('g_geral', auth.uid())
  on conflict do nothing;
end;
$$;

create or replace function public.set_my_status(next_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if next_status not in ('online', 'offline') then
    raise exception 'Invalid status';
  end if;

  update public.profiles
  set status = next_status
  where id = auth.uid();
end;
$$;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.events enable row level security;
alter table public.event_attendees enable row level security;
alter table public.docs enable row level security;
alter table public.messages enable row level security;
alter table public.invite_codes enable row level security;

drop policy if exists "Members can read profiles" on public.profiles;
create policy "Members can read profiles" on public.profiles
for select to authenticated
using (public.is_member());

drop policy if exists "Guardians can update profiles" on public.profiles;
create policy "Guardians can update profiles" on public.profiles
for update to authenticated
using (public.is_guardian())
with check (public.is_guardian());

drop policy if exists "Members can read groups" on public.groups;
create policy "Members can read groups" on public.groups
for select to authenticated
using (public.is_member());

drop policy if exists "Guardians can write groups" on public.groups;
create policy "Guardians can write groups" on public.groups
for all to authenticated
using (public.is_guardian())
with check (public.is_guardian());

drop policy if exists "Members can read group members" on public.group_members;
create policy "Members can read group members" on public.group_members
for select to authenticated
using (public.is_member());

drop policy if exists "Guardians can write group members" on public.group_members;
create policy "Guardians can write group members" on public.group_members
for all to authenticated
using (public.is_guardian())
with check (public.is_guardian());

drop policy if exists "Members can read events" on public.events;
create policy "Members can read events" on public.events
for select to authenticated
using (public.is_member());

drop policy if exists "Members can create events" on public.events;
create policy "Members can create events" on public.events
for insert to authenticated
with check (public.is_member() and created_by = auth.uid());

drop policy if exists "Owners and guardians can update events" on public.events;
create policy "Owners and guardians can update events" on public.events
for update to authenticated
using (created_by = auth.uid() or public.is_guardian())
with check (created_by = auth.uid() or public.is_guardian());

drop policy if exists "Members can read attendees" on public.event_attendees;
create policy "Members can read attendees" on public.event_attendees
for select to authenticated
using (public.is_member());

drop policy if exists "Members can manage own attendance" on public.event_attendees;
create policy "Members can manage own attendance" on public.event_attendees
for all to authenticated
using (member_id = auth.uid() or public.is_guardian())
with check (member_id = auth.uid() or public.is_guardian());

drop policy if exists "Members can read docs" on public.docs;
create policy "Members can read docs" on public.docs
for select to authenticated
using (public.is_member());

drop policy if exists "Members can create docs" on public.docs;
create policy "Members can create docs" on public.docs
for insert to authenticated
with check (public.is_member() and owner_id = auth.uid());

drop policy if exists "Owners and guardians can update docs" on public.docs;
create policy "Owners and guardians can update docs" on public.docs
for update to authenticated
using (owner_id = auth.uid() or public.is_guardian())
with check (owner_id = auth.uid() or public.is_guardian());

drop policy if exists "Group members can read messages" on public.messages;
create policy "Group members can read messages" on public.messages
for select to authenticated
using (
  public.is_member()
  and exists (
    select 1 from public.group_members
    where group_id = messages.room_id
      and member_id = auth.uid()
  )
);

drop policy if exists "Group members can create messages" on public.messages;
create policy "Group members can create messages" on public.messages
for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.group_members
    where group_id = messages.room_id
      and member_id = auth.uid()
  )
);

drop policy if exists "Sponsors and guardians can read invites" on public.invite_codes;
create policy "Sponsors and guardians can read invites" on public.invite_codes
for select to authenticated
using (sponsor_id = auth.uid() or public.is_guardian());

drop policy if exists "Members can create invites" on public.invite_codes;
create policy "Members can create invites" on public.invite_codes
for insert to authenticated
with check (
  sponsor_id = auth.uid()
  and public.is_member()
  and (role <> 'guardia' or public.is_guardian())
);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.is_member() to authenticated;
grant execute on function public.is_guardian() to authenticated;
grant execute on function public.community_has_founder() to anon, authenticated;
grant execute on function public.claim_founder(text, text) to authenticated;
grant execute on function public.accept_invite(text, text, text) to authenticated;
grant execute on function public.set_my_status(text) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'groups',
    'group_members',
    'events',
    'event_attendees',
    'docs',
    'messages',
    'invite_codes'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
