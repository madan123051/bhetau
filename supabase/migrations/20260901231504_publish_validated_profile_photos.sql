-- Bhetau's current upload route validates file size, MIME type, and binary
-- signature before inserting metadata. Until a trusted asynchronous content
-- moderation worker is introduced, publish those already-validated uploads so
-- authenticated users allowed by profile_photos RLS can resolve signed URLs.
update public.profile_photos
set moderation_state = 'approved'
where moderation_state = 'pending'
  and bytes between 1 and 5242880
  and mime_type in ('image/jpeg', 'image/png', 'image/webp');
