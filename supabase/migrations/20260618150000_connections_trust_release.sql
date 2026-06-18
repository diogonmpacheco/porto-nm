create table if not exists public.member_intentions (
  member_id uuid primary key references public.profiles(id) on delete cascade,
  kinds text[] not null default '{}',
  note text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.warm_introductions (
  id text primary key,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  connector_id uuid not null references public.profiles(id) on delete cascade,
  note text not null default '',
  status text not null default 'pedido' check (status in ('pedido', 'aceite', 'recusado', 'aberto')),
  created_at timestamptz not null default now()
);

create table if not exists public.mutual_interests (
  id text primary key,
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('amizade', 'date', 'flirt', 'evento')),
  created_at timestamptz not null default now(),
  unique (from_id, to_id, kind)
);

create table if not exists public.relationship_links (
  id text primary key,
  member_id uuid not null references public.profiles(id) on delete cascade,
  related_member_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  visibility text not null default 'comunidade' check (visibility in ('privado', 'conexões', 'comunidade')),
  created_at timestamptz not null default now()
);

create table if not exists public.event_rooms (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  name text not null,
  purpose text not null default '',
  expires_at timestamptz not null,
  created_by uuid references public.profiles(id) on delete set null,
  member_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.privacy_settings (
  id text primary key default 'main',
  device_only_messages boolean not null default false,
  local_media_vault boolean not null default true,
  metadata_stripping boolean not null default true,
  p2p_ready boolean not null default false,
  relay_plan text not null default 'Servidor apenas como ponte temporária; media íntima deve migrar para envio direto entre dispositivos.',
  updated_at timestamptz not null default now()
);

insert into public.privacy_settings (id)
values ('main')
on conflict (id) do nothing;

alter table public.member_intentions enable row level security;
alter table public.warm_introductions enable row level security;
alter table public.mutual_interests enable row level security;
alter table public.relationship_links enable row level security;
alter table public.event_rooms enable row level security;
alter table public.privacy_settings enable row level security;

drop policy if exists "Members can read intentions" on public.member_intentions;
create policy "Members can read intentions" on public.member_intentions
for select to authenticated
using (public.is_member());

drop policy if exists "Members can manage own intentions" on public.member_intentions;
create policy "Members can manage own intentions" on public.member_intentions
for all to authenticated
using (member_id = auth.uid() or public.is_admin())
with check (member_id = auth.uid() or public.is_admin());

drop policy if exists "Participants can read introductions" on public.warm_introductions;
create policy "Participants can read introductions" on public.warm_introductions
for select to authenticated
using (
  public.is_admin()
  or requester_id = auth.uid()
  or target_id = auth.uid()
  or connector_id = auth.uid()
);

drop policy if exists "Members can create introductions" on public.warm_introductions;
create policy "Members can create introductions" on public.warm_introductions
for insert to authenticated
with check (requester_id = auth.uid() and public.is_member());

drop policy if exists "Participants can update introductions" on public.warm_introductions;
create policy "Participants can update introductions" on public.warm_introductions
for update to authenticated
using (
  public.is_admin()
  or requester_id = auth.uid()
  or target_id = auth.uid()
  or connector_id = auth.uid()
)
with check (
  public.is_admin()
  or requester_id = auth.uid()
  or target_id = auth.uid()
  or connector_id = auth.uid()
);

drop policy if exists "Members can delete own introductions" on public.warm_introductions;
create policy "Members can delete own introductions" on public.warm_introductions
for delete to authenticated
using (requester_id = auth.uid() or public.is_admin());

drop policy if exists "Members can read related interests" on public.mutual_interests;
create policy "Members can read related interests" on public.mutual_interests
for select to authenticated
using (from_id = auth.uid() or to_id = auth.uid() or public.is_admin());

drop policy if exists "Members can manage own interests" on public.mutual_interests;
create policy "Members can manage own interests" on public.mutual_interests
for all to authenticated
using (from_id = auth.uid() or public.is_admin())
with check (from_id = auth.uid() or public.is_admin());

drop policy if exists "Members can read visible relationships" on public.relationship_links;
create policy "Members can read visible relationships" on public.relationship_links
for select to authenticated
using (
  visibility = 'comunidade'
  or member_id = auth.uid()
  or related_member_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "Members can create own relationships" on public.relationship_links;
create policy "Members can create own relationships" on public.relationship_links
for insert to authenticated
with check (member_id = auth.uid() and public.is_member());

drop policy if exists "Members can update own relationships" on public.relationship_links;
create policy "Members can update own relationships" on public.relationship_links
for update to authenticated
using (member_id = auth.uid() or public.is_admin())
with check (member_id = auth.uid() or public.is_admin());

drop policy if exists "Members can delete own relationships" on public.relationship_links;
create policy "Members can delete own relationships" on public.relationship_links
for delete to authenticated
using (member_id = auth.uid() or public.is_admin());

drop policy if exists "Room members can read event rooms" on public.event_rooms;
create policy "Room members can read event rooms" on public.event_rooms
for select to authenticated
using (
  public.is_admin()
  or created_by = auth.uid()
  or auth.uid() = any(member_ids)
);

drop policy if exists "Members can create event rooms" on public.event_rooms;
create policy "Members can create event rooms" on public.event_rooms
for insert to authenticated
with check (created_by = auth.uid() and public.is_member());

drop policy if exists "Creators can update event rooms" on public.event_rooms;
create policy "Creators can update event rooms" on public.event_rooms
for update to authenticated
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());

drop policy if exists "Creators can delete event rooms" on public.event_rooms;
create policy "Creators can delete event rooms" on public.event_rooms
for delete to authenticated
using (created_by = auth.uid() or public.is_admin());

drop policy if exists "Members can read privacy settings" on public.privacy_settings;
create policy "Members can read privacy settings" on public.privacy_settings
for select to authenticated
using (public.is_member());

drop policy if exists "Members can update privacy settings" on public.privacy_settings;
create policy "Members can update privacy settings" on public.privacy_settings
for all to authenticated
using (public.is_member())
with check (public.is_member());

grant select, insert, update, delete on public.member_intentions to authenticated;
grant select, insert, update, delete on public.warm_introductions to authenticated;
grant select, insert, update, delete on public.mutual_interests to authenticated;
grant select, insert, update, delete on public.relationship_links to authenticated;
grant select, insert, update, delete on public.event_rooms to authenticated;
grant select, insert, update, delete on public.privacy_settings to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'member_intentions',
    'warm_introductions',
    'mutual_interests',
    'relationship_links',
    'event_rooms',
    'privacy_settings'
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
