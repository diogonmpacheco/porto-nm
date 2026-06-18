drop policy if exists "Owners and admins can delete events" on public.events;
create policy "Owners and admins can delete events" on public.events
for delete to authenticated
using (created_by = auth.uid() or public.is_admin());

drop policy if exists "Owners and admins can delete docs" on public.docs;
create policy "Owners and admins can delete docs" on public.docs
for delete to authenticated
using (owner_id = auth.uid() or public.is_admin());
