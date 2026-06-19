create table if not exists public.member_boundaries (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('mute', 'block')),
  reason text not null default '',
  created_at timestamptz not null default now(),
  unique (actor_id, target_id, kind),
  check (actor_id <> target_id)
);

create table if not exists public.trust_edges (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('seguir', 'confiar', 'amigue', 'evento')),
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (from_id, to_id, kind),
  check (from_id <> to_id)
);

create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  group_id text references public.groups(id) on delete set null,
  kind text not null default 'nota' check (kind in ('nota', 'pergunta', 'poll', 'media', 'evento')),
  visibility text not null default 'comunidade' check (visibility in ('comunidade', 'grupo', 'conexoes')),
  title text not null default '',
  body text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.feed_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('heart', 'spark', 'same')),
  created_at timestamptz not null default now(),
  unique (post_id, member_id, kind)
);

create table if not exists public.nocturno_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('eroteca', 'provocacao', 'fantasia', 'confissao')),
  author_id uuid references public.profiles(id) on delete set null,
  group_id text references public.groups(id) on delete set null,
  visibility text not null default 'comunidade' check (visibility in ('comunidade', 'grupo', 'conexoes', 'privado')),
  title text not null default '',
  body text not null default '',
  url text not null default '',
  tags text[] not null default '{}',
  warning text not null default '',
  mood text not null default '',
  mode text not null default '',
  limits text not null default '',
  aftercare text not null default '',
  signed boolean not null default true,
  open_to_talk boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.member_boundaries enable row level security;
alter table public.trust_edges enable row level security;
alter table public.feed_posts enable row level security;
alter table public.feed_comments enable row level security;
alter table public.feed_reactions enable row level security;
alter table public.nocturno_items enable row level security;

create or replace function public.has_block_between(_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.member_boundaries
    where kind = 'block'
      and (
        (actor_id = auth.uid() and target_id = _member_id)
        or (actor_id = _member_id and target_id = auth.uid())
      )
  )
$$;

create or replace function public.can_read_scoped_content(_author_id uuid, _group_id text, _visibility text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or (
      public.is_member()
      and (_author_id is null or not public.has_block_between(_author_id))
      and (
        _visibility = 'comunidade'
        or (_author_id = auth.uid())
        or (
          _visibility = 'grupo'
          and _group_id is not null
          and exists (
            select 1
            from public.group_members
            where group_id = _group_id
              and member_id = auth.uid()
          )
        )
        or (
          _visibility = 'conexoes'
          and _author_id is not null
          and (
            exists (
              select 1
              from public.trust_edges
              where (from_id = auth.uid() and to_id = _author_id)
                 or (from_id = _author_id and to_id = auth.uid())
            )
            or exists (
              select 1
              from public.relationship_links
              where visibility <> 'privado'
                and (
                  (member_id = auth.uid() and related_member_id = _author_id)
                  or (member_id = _author_id and related_member_id = auth.uid())
                )
            )
          )
        )
        or (_visibility = 'privado' and _author_id = auth.uid())
      )
    )
$$;

drop policy if exists "Members can read own boundaries" on public.member_boundaries;
create policy "Members can read own boundaries" on public.member_boundaries
for select to authenticated
using (actor_id = auth.uid() or target_id = auth.uid() or public.is_admin());

drop policy if exists "Members can manage own boundaries" on public.member_boundaries;
create policy "Members can manage own boundaries" on public.member_boundaries
for all to authenticated
using (actor_id = auth.uid())
with check (actor_id = auth.uid() and public.is_member());

drop policy if exists "Members can read trust edges" on public.trust_edges;
create policy "Members can read trust edges" on public.trust_edges
for select to authenticated
using (public.is_member() and not public.has_block_between(from_id) and not public.has_block_between(to_id));

drop policy if exists "Members can manage own trust edges" on public.trust_edges;
create policy "Members can manage own trust edges" on public.trust_edges
for all to authenticated
using (from_id = auth.uid())
with check (from_id = auth.uid() and public.is_member() and not public.has_block_between(to_id));

drop policy if exists "Members can read feed posts" on public.feed_posts;
create policy "Members can read feed posts" on public.feed_posts
for select to authenticated
using (public.can_read_scoped_content(author_id, group_id, visibility));

drop policy if exists "Members can create feed posts" on public.feed_posts;
create policy "Members can create feed posts" on public.feed_posts
for insert to authenticated
with check (
  author_id = auth.uid()
  and public.is_member()
  and (
    visibility <> 'grupo'
    or exists (
      select 1
      from public.group_members
      where group_id = feed_posts.group_id
        and member_id = auth.uid()
    )
  )
);

drop policy if exists "Authors and admins can update feed posts" on public.feed_posts;
create policy "Authors and admins can update feed posts" on public.feed_posts
for update to authenticated
using (author_id = auth.uid() or public.is_admin())
with check (author_id = auth.uid() or public.is_admin());

drop policy if exists "Authors and admins can delete feed posts" on public.feed_posts;
create policy "Authors and admins can delete feed posts" on public.feed_posts
for delete to authenticated
using (author_id = auth.uid() or public.is_admin());

drop policy if exists "Members can read feed comments" on public.feed_comments;
create policy "Members can read feed comments" on public.feed_comments
for select to authenticated
using (
  public.is_member()
  and not public.has_block_between(author_id)
  and exists (
    select 1
    from public.feed_posts
    where feed_posts.id = feed_comments.post_id
      and public.can_read_scoped_content(feed_posts.author_id, feed_posts.group_id, feed_posts.visibility)
  )
);

drop policy if exists "Members can create feed comments" on public.feed_comments;
create policy "Members can create feed comments" on public.feed_comments
for insert to authenticated
with check (
  author_id = auth.uid()
  and public.is_member()
  and exists (
    select 1
    from public.feed_posts
    where feed_posts.id = feed_comments.post_id
      and public.can_read_scoped_content(feed_posts.author_id, feed_posts.group_id, feed_posts.visibility)
  )
);

drop policy if exists "Authors and admins can delete feed comments" on public.feed_comments;
create policy "Authors and admins can delete feed comments" on public.feed_comments
for delete to authenticated
using (author_id = auth.uid() or public.is_admin());

drop policy if exists "Members can read feed reactions" on public.feed_reactions;
create policy "Members can read feed reactions" on public.feed_reactions
for select to authenticated
using (
  public.is_member()
  and exists (
    select 1
    from public.feed_posts
    where feed_posts.id = feed_reactions.post_id
      and public.can_read_scoped_content(feed_posts.author_id, feed_posts.group_id, feed_posts.visibility)
  )
);

drop policy if exists "Members can manage own feed reactions" on public.feed_reactions;
create policy "Members can manage own feed reactions" on public.feed_reactions
for all to authenticated
using (member_id = auth.uid())
with check (member_id = auth.uid() and public.is_member());

drop policy if exists "Members can read nocturno items" on public.nocturno_items;
create policy "Members can read nocturno items" on public.nocturno_items
for select to authenticated
using (public.can_read_scoped_content(author_id, group_id, visibility));

drop policy if exists "Members can create nocturno items" on public.nocturno_items;
create policy "Members can create nocturno items" on public.nocturno_items
for insert to authenticated
with check (
  public.is_member()
  and (author_id = auth.uid() or author_id is null)
  and (
    visibility <> 'grupo'
    or exists (
      select 1
      from public.group_members
      where group_id = nocturno_items.group_id
        and member_id = auth.uid()
    )
  )
);

drop policy if exists "Authors and admins can update nocturno items" on public.nocturno_items;
create policy "Authors and admins can update nocturno items" on public.nocturno_items
for update to authenticated
using (author_id = auth.uid() or public.is_admin())
with check (author_id = auth.uid() or public.is_admin());

drop policy if exists "Authors and admins can delete nocturno items" on public.nocturno_items;
create policy "Authors and admins can delete nocturno items" on public.nocturno_items
for delete to authenticated
using (author_id = auth.uid() or public.is_admin());

drop policy if exists "Group members can read messages" on public.messages;
create policy "Group members can read messages" on public.messages
for select to authenticated
using (
  public.is_admin()
  or (
    public.is_member()
    and not public.has_block_between(author_id)
    and exists (
      select 1
      from public.group_members
      where group_id = messages.room_id
        and member_id = auth.uid()
    )
  )
);

grant select, insert, update, delete on public.member_boundaries to authenticated;
grant select, insert, update, delete on public.trust_edges to authenticated;
grant select, insert, update, delete on public.feed_posts to authenticated;
grant select, insert, update, delete on public.feed_comments to authenticated;
grant select, insert, update, delete on public.feed_reactions to authenticated;
grant select, insert, update, delete on public.nocturno_items to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['member_boundaries', 'trust_edges', 'feed_posts', 'feed_comments', 'feed_reactions', 'nocturno_items']
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
