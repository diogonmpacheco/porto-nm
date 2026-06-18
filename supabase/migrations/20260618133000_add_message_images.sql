insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-images',
  'message-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.messages
  add column if not exists image_path text,
  add column if not exists image_name text,
  add column if not exists image_mime_type text,
  add column if not exists image_view_once boolean not null default false,
  add column if not exists image_opened_by uuid[] not null default '{}';

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

  if selected_message.author_id = auth.uid() or not selected_message.image_view_once then
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

drop policy if exists "Members can upload message images" on storage.objects;
create policy "Members can upload message images" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'message-images'
  and public.is_member()
);

drop policy if exists "Message participants can read message images" on storage.objects;
create policy "Message participants can read message images" on storage.objects
for select to authenticated
using (
  bucket_id = 'message-images'
  and exists (
    select 1
    from public.messages
    where messages.image_path = storage.objects.name
      and (
        messages.author_id = auth.uid()
        or (
          auth.uid() = any(messages.recipients_at_send)
          and not (
            messages.image_view_once
            and auth.uid() = any(messages.image_opened_by)
          )
        )
      )
  )
);

grant execute on function public.mark_message_image_opened(text) to authenticated;
