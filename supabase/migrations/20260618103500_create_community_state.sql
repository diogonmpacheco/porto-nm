create table if not exists public.community_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.community_state enable row level security;

drop policy if exists "Prototype can read shared state" on public.community_state;
create policy "Prototype can read shared state"
on public.community_state
for select
to anon
using (true);

drop policy if exists "Prototype can create shared state" on public.community_state;
create policy "Prototype can create shared state"
on public.community_state
for insert
to anon
with check (true);

drop policy if exists "Prototype can update shared state" on public.community_state;
create policy "Prototype can update shared state"
on public.community_state
for update
to anon
using (true)
with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'community_state'
  ) then
    alter publication supabase_realtime add table public.community_state;
  end if;
end $$;
