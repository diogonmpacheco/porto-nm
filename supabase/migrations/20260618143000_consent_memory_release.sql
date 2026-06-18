alter table public.profiles
  add column if not exists consent_available_for text not null default '',
  add column if not exists consent_limits text not null default '',
  add column if not exists media_preference text not null default '',
  add column if not exists relationship_context text not null default '',
  add column if not exists event_comfort text not null default '';

alter table public.events
  add column if not exists vibe text not null default 'social',
  add column if not exists photo_policy text not null default 'perguntar primeiro',
  add column if not exists boundary_notes text not null default '',
  add column if not exists aftercare_prompt text not null default '';

alter table public.messages
  drop constraint if exists messages_citation_code_fkey,
  add column if not exists image_consent_required boolean not null default false,
  add column if not exists image_expires_at timestamptz;

create table if not exists public.decisions (
  id text primary key,
  code text not null unique,
  title text not null,
  summary text not null,
  outcome text not null,
  status text not null default 'aberta' check (status in ('rascunho', 'aberta', 'decidida')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  votes jsonb not null default '[]'::jsonb
);

create table if not exists public.event_checkins (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  mood text not null default 'bem' check (mood in ('bem', 'misto', 'atenção')),
  note text not null default '',
  visibility text not null default 'admins' check (visibility in ('admins', 'sponsor', 'comunidade')),
  created_at timestamptz not null default now(),
  unique (event_id, member_id)
);

insert into public.decisions (id, code, title, summary, outcome, status, created_by, created_at, votes)
values (
  'dec_1',
  'DEC-001',
  'Política de fotografias em eventos',
  'Fotos de grupo só com consentimento explícito e indicação clara de onde serão partilhadas.',
  'Sem fotos em eventos íntimos; em eventos sociais, perguntar primeiro e aceitar um não sem conversa.',
  'decidida',
  null,
  '2026-06-17 18:30:00+00',
  '[]'::jsonb
)
on conflict (id) do nothing;

drop policy if exists "Members can update own profile consent" on public.profiles;
create policy "Members can update own profile consent" on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

alter table public.decisions enable row level security;
alter table public.event_checkins enable row level security;

drop policy if exists "Members can read decisions" on public.decisions;
create policy "Members can read decisions" on public.decisions
for select to authenticated
using (public.is_member());

drop policy if exists "Members can create decisions" on public.decisions;
create policy "Members can create decisions" on public.decisions
for insert to authenticated
with check (public.is_member() and created_by = auth.uid());

drop policy if exists "Members can vote on decisions" on public.decisions;
create policy "Members can vote on decisions" on public.decisions
for update to authenticated
using (public.is_member())
with check (public.is_member());

drop policy if exists "Owners and admins can delete decisions" on public.decisions;
create policy "Owners and admins can delete decisions" on public.decisions
for delete to authenticated
using (created_by = auth.uid() or public.is_admin());

drop policy if exists "Members can read visible checkins" on public.event_checkins;
create policy "Members can read visible checkins" on public.event_checkins
for select to authenticated
using (
  public.is_member()
  and (
    visibility = 'comunidade'
    or member_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.profiles
      where profiles.id = event_checkins.member_id
        and profiles.sponsor_id = auth.uid()
    )
  )
);

drop policy if exists "Members can create own checkins" on public.event_checkins;
create policy "Members can create own checkins" on public.event_checkins
for insert to authenticated
with check (member_id = auth.uid() and public.is_member());

drop policy if exists "Members can update own checkins" on public.event_checkins;
create policy "Members can update own checkins" on public.event_checkins
for update to authenticated
using (member_id = auth.uid() or public.is_admin())
with check (member_id = auth.uid() or public.is_admin());

drop policy if exists "Members can delete own checkins" on public.event_checkins;
create policy "Members can delete own checkins" on public.event_checkins
for delete to authenticated
using (member_id = auth.uid() or public.is_admin());

create or replace function public.mark_message_image_opened(_message_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_message public.messages%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into selected_message
  from public.messages
  where id = _message_id;

  if not found then
    raise exception 'Message not found';
  end if;

  if selected_message.author_id = auth.uid()
     or (not selected_message.image_view_once and not selected_message.image_consent_required) then
    return;
  end if;

  if not auth.uid() = any(selected_message.recipients_at_send) then
    raise exception 'Image is not available to this member';
  end if;

  update public.messages
  set image_opened_by =
    case
      when auth.uid() = any(image_opened_by) then image_opened_by
      else array_append(image_opened_by, auth.uid())
    end
  where id = _message_id;
end;
$$;

grant select, insert, update, delete on public.decisions to authenticated;
grant select, insert, update, delete on public.event_checkins to authenticated;
grant execute on function public.mark_message_image_opened(text) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['decisions', 'event_checkins']
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
