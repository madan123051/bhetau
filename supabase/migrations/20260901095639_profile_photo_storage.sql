-- Private profile-photo storage. Object access deliberately follows the
-- authorization decision already made by public.profile_photos RLS.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile_photo_objects_read_authorized" on storage.objects;
create policy "profile_photo_objects_read_authorized"
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-photos'
  and exists (
    select 1
    from public.profile_photos photo
    where photo.storage_path = name
  )
);

drop policy if exists "profile_photo_objects_insert_self" on storage.objects;
create policy "profile_photo_objects_insert_self"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "profile_photo_objects_delete_self" on storage.objects;
create policy "profile_photo_objects_delete_self"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
