alter table public.messages
  add column if not exists encryption_version integer not null default 0,
  add column if not exists encrypted_payloads jsonb not null default '{}'::jsonb,
  add column if not exists sender_device_id text;

create table if not exists public.device_keys (
  id text primary key,
  member_id uuid not null references public.profiles(id) on delete cascade,
  device_label text not null default 'browser',
  public_key jsonb not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.device_keys enable row level security;

drop policy if exists "Members can read active device keys" on public.device_keys;
create policy "Members can read active device keys" on public.device_keys
for select to authenticated
using (public.is_member() and revoked_at is null);

drop policy if exists "Members can manage own device keys" on public.device_keys;
create policy "Members can manage own device keys" on public.device_keys
for all to authenticated
using (member_id = auth.uid() or public.is_admin())
with check (member_id = auth.uid() or public.is_admin());

grant select, insert, update, delete on public.device_keys to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'device_keys'
  ) then
    alter publication supabase_realtime add table public.device_keys;
  end if;
end $$;
