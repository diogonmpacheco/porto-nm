alter table public.profiles
  add column if not exists avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members can read profile photos" on storage.objects;
create policy "Members can read profile photos" on storage.objects
for select to authenticated
using (
  bucket_id = 'profile-photos'
  and public.is_member()
);

drop policy if exists "Members can upload own profile photos" on storage.objects;
create policy "Members can upload own profile photos" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'profile-photos'
  and public.is_member()
  and name like auth.uid()::text || '/%'
);

drop policy if exists "Members can update own profile photos" on storage.objects;
create policy "Members can update own profile photos" on storage.objects
for update to authenticated
using (
  bucket_id = 'profile-photos'
  and (name like auth.uid()::text || '/%' or public.is_admin())
)
with check (
  bucket_id = 'profile-photos'
  and (name like auth.uid()::text || '/%' or public.is_admin())
);

drop policy if exists "Members can delete own profile photos" on storage.objects;
create policy "Members can delete own profile photos" on storage.objects
for delete to authenticated
using (
  bucket_id = 'profile-photos'
  and (name like auth.uid()::text || '/%' or public.is_admin())
);
