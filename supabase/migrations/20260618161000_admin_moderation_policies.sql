drop policy if exists "Group members can read messages" on public.messages;
create policy "Group members can read messages" on public.messages
for select to authenticated
using (
  public.is_admin()
  or (
    public.is_member()
    and exists (
      select 1
      from public.group_members
      where group_id = messages.room_id
        and member_id = auth.uid()
    )
  )
);

drop policy if exists "Message authors and admins can delete messages" on public.messages;
create policy "Message authors and admins can delete messages" on public.messages
for delete to authenticated
using (author_id = auth.uid() or public.is_admin());

drop policy if exists "Message authors and admins can delete message images" on storage.objects;
create policy "Message authors and admins can delete message images" on storage.objects
for delete to authenticated
using (
  bucket_id = 'message-images'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.messages
      where messages.image_path = storage.objects.name
        and messages.author_id = auth.uid()
    )
  )
);
