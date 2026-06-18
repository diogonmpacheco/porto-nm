alter table public.profiles
  add column if not exists suspended_until timestamptz;

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('nova pessoa', 'membro', 'admin')
      and (suspended_until is null or suspended_until <= now())
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and (suspended_until is null or suspended_until <= now())
  )
$$;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles
for select to authenticated
using (id = auth.uid());

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  subject_member_id uuid references public.profiles(id) on delete set null,
  room_id text references public.groups(id) on delete set null,
  message_id text references public.messages(id) on delete set null,
  category text not null default 'outro' check (category in ('assedio', 'consentimento', 'conteudo', 'seguranca', 'outro')),
  severity text not null default 'media' check (severity in ('baixa', 'media', 'alta', 'urgente')),
  status text not null default 'aberto' check (status in ('aberto', 'triagem', 'resolvido', 'arquivado')),
  assignee_id uuid references public.profiles(id) on delete set null,
  summary text not null,
  details text not null default '',
  internal_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;
alter table public.admin_audit_log enable row level security;

drop policy if exists "Reporters can create own reports" on public.reports;
create policy "Reporters can create own reports" on public.reports
for insert to authenticated
with check (reporter_id = auth.uid() and public.is_member());

drop policy if exists "Reporters and admins can read reports" on public.reports;
create policy "Reporters and admins can read reports" on public.reports
for select to authenticated
using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports" on public.reports
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete reports" on public.reports;
create policy "Admins can delete reports" on public.reports
for delete to authenticated
using (public.is_admin());

drop policy if exists "Admins can read audit log" on public.admin_audit_log;
create policy "Admins can read audit log" on public.admin_audit_log
for select to authenticated
using (public.is_admin());

create or replace function public.log_admin_action(
  _action text,
  _target_type text,
  _target_id text,
  _metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  values (auth.uid(), _action, _target_type, _target_id, coalesce(_metadata, '{}'::jsonb));
end;
$$;

create or replace function public.admin_update_member_role(_member_id uuid, _role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_role text;
begin
  if not public.is_admin() then
    raise exception 'Admin required';
  end if;

  if _role not in ('nova pessoa', 'membro', 'admin') then
    raise exception 'Invalid role';
  end if;

  if _member_id = auth.uid() and _role <> 'admin' then
    raise exception 'Cannot remove own admin role';
  end if;

  select role into old_role from public.profiles where id = _member_id;
  update public.profiles set role = _role where id = _member_id;
  perform public.log_admin_action(
    'member.role_updated',
    'profile',
    _member_id::text,
    jsonb_build_object('from', old_role, 'to', _role)
  );
end;
$$;

create or replace function public.admin_delete_message(_message_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_message public.messages%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin required';
  end if;

  select * into selected_message from public.messages where id = _message_id;
  if not found then
    return;
  end if;

  delete from public.messages where id = _message_id;
  perform public.log_admin_action(
    'message.deleted',
    'message',
    _message_id,
    jsonb_build_object('room_id', selected_message.room_id, 'author_id', selected_message.author_id)
  );
end;
$$;

create or replace function public.admin_delete_event(_event_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_event public.events%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin required';
  end if;

  select * into selected_event from public.events where id = _event_id;
  if not found then
    return;
  end if;

  delete from public.events where id = _event_id;
  perform public.log_admin_action(
    'event.deleted',
    'event',
    _event_id,
    jsonb_build_object('title', selected_event.title, 'starts_at', selected_event.starts_at)
  );
end;
$$;

create or replace function public.admin_delete_event_room(_room_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_room public.event_rooms%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin required';
  end if;

  select * into selected_room from public.event_rooms where id = _room_id;
  if not found then
    return;
  end if;

  delete from public.event_rooms where id = _room_id;
  perform public.log_admin_action(
    'event_room.deleted',
    'event_room',
    _room_id,
    jsonb_build_object('event_id', selected_room.event_id, 'name', selected_room.name)
  );
end;
$$;

create or replace function public.admin_delete_doc(_doc_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_doc public.docs%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin required';
  end if;

  select * into selected_doc from public.docs where id = _doc_id;
  if not found then
    return;
  end if;

  delete from public.docs where id = _doc_id;
  perform public.log_admin_action(
    'doc.deleted',
    'doc',
    _doc_id,
    jsonb_build_object('code', selected_doc.code, 'title', selected_doc.title)
  );
end;
$$;

create or replace function public.admin_delete_decision(_decision_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_decision public.decisions%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin required';
  end if;

  select * into selected_decision from public.decisions where id = _decision_id;
  if not found then
    return;
  end if;

  delete from public.decisions where id = _decision_id;
  perform public.log_admin_action(
    'decision.deleted',
    'decision',
    _decision_id,
    jsonb_build_object('code', selected_decision.code, 'title', selected_decision.title)
  );
end;
$$;

create or replace function public.issue_invite(_code text, _role text, _max_uses integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  next_code text := upper(trim(_code));
  next_role text := coalesce(nullif(trim(_role), ''), 'nova pessoa');
  next_max_uses integer := greatest(coalesce(_max_uses, 1), 1);
begin
  if not public.is_member() then
    raise exception 'Member required';
  end if;

  if next_role not in ('nova pessoa', 'membro', 'admin') then
    raise exception 'Invalid role';
  end if;

  if next_role = 'admin' and not public.is_admin() then
    raise exception 'Admin invite requires admin';
  end if;

  insert into public.invite_codes (code, sponsor_id, role, max_uses)
  values (next_code, auth.uid(), next_role, next_max_uses);

  perform public.log_admin_action(
    'invite.created',
    'invite',
    next_code,
    jsonb_build_object('role', next_role, 'max_uses', next_max_uses)
  );
end;
$$;

create or replace function public.admin_update_report(
  _report_id uuid,
  _status text default null,
  _severity text default null,
  _assignee_id uuid default null,
  _internal_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_report public.reports%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin required';
  end if;

  if _status is not null and _status not in ('aberto', 'triagem', 'resolvido', 'arquivado') then
    raise exception 'Invalid report status';
  end if;

  if _severity is not null and _severity not in ('baixa', 'media', 'alta', 'urgente') then
    raise exception 'Invalid report severity';
  end if;

  select * into selected_report from public.reports where id = _report_id;
  if not found then
    raise exception 'Report not found';
  end if;

  update public.reports
  set
    status = coalesce(_status, status),
    severity = coalesce(_severity, severity),
    assignee_id = coalesce(_assignee_id, assignee_id),
    internal_notes = coalesce(_internal_notes, internal_notes),
    updated_at = now()
  where id = _report_id;

  perform public.log_admin_action(
    'report.updated',
    'report',
    _report_id::text,
    jsonb_build_object('status', coalesce(_status, selected_report.status), 'severity', coalesce(_severity, selected_report.severity))
  );
end;
$$;

create or replace function public.set_member_suspension(_member_id uuid, _suspended_until timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin required';
  end if;

  if _member_id = auth.uid() then
    raise exception 'Cannot suspend own account';
  end if;

  update public.profiles
  set suspended_until = _suspended_until
  where id = _member_id;

  perform public.log_admin_action(
    case when _suspended_until is null then 'member.suspension_cleared' else 'member.suspended' end,
    'profile',
    _member_id::text,
    jsonb_build_object('until', _suspended_until)
  );
end;
$$;

grant select, insert, update, delete on public.reports to authenticated;
grant select on public.admin_audit_log to authenticated;
revoke execute on function public.log_admin_action(text, text, text, jsonb) from public;
revoke execute on function public.log_admin_action(text, text, text, jsonb) from authenticated;
grant execute on function public.admin_update_member_role(uuid, text) to authenticated;
grant execute on function public.admin_delete_message(text) to authenticated;
grant execute on function public.admin_delete_event(text) to authenticated;
grant execute on function public.admin_delete_event_room(text) to authenticated;
grant execute on function public.admin_delete_doc(text) to authenticated;
grant execute on function public.admin_delete_decision(text) to authenticated;
grant execute on function public.issue_invite(text, text, integer) to authenticated;
grant execute on function public.admin_update_report(uuid, text, text, uuid, text) to authenticated;
grant execute on function public.set_member_suspension(uuid, timestamptz) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['reports', 'admin_audit_log']
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
