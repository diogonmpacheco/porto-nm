insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-images',
  'message-images',
  false,
  12582912,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/octet-stream']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.messages
  add column if not exists image_encryption_version integer not null default 0,
  add column if not exists image_cipher_iv text;

create table if not exists public.p2p_signals (
  id text primary key,
  room_id text not null references public.groups(id) on delete cascade,
  from_member_id uuid not null references public.profiles(id) on delete cascade,
  from_device_id text not null references public.device_keys(id) on delete cascade,
  to_member_id uuid not null references public.profiles(id) on delete cascade,
  to_device_id text not null references public.device_keys(id) on delete cascade,
  signal_type text not null check (signal_type in ('offer', 'answer', 'ice', 'close')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

alter table public.p2p_signals enable row level security;

drop policy if exists "Members can read own p2p signals" on public.p2p_signals;
create policy "Members can read own p2p signals" on public.p2p_signals
for select to authenticated
using (
  from_member_id = auth.uid()
  or to_member_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "Members can create own p2p signals" on public.p2p_signals;
create policy "Members can create own p2p signals" on public.p2p_signals
for insert to authenticated
with check (
  from_member_id = auth.uid()
  and public.is_member()
  and exists (
    select 1
    from public.group_members
    where group_id = p2p_signals.room_id
      and member_id = auth.uid()
  )
);

drop policy if exists "Members can delete own p2p signals" on public.p2p_signals;
create policy "Members can delete own p2p signals" on public.p2p_signals
for delete to authenticated
using (
  from_member_id = auth.uid()
  or to_member_id = auth.uid()
  or public.is_admin()
);

grant select, insert, delete on public.p2p_signals to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'p2p_signals'
  ) then
    alter publication supabase_realtime add table public.p2p_signals;
  end if;
end $$;
