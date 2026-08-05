-- Storage bucket for task media: listening audio stimuli (teacher-authored) and
-- student voice answers. Audio can't live in base64-in-JSONB (Postgres quota),
-- so it goes here. Images keep their existing base64/JSONB path.
--
-- Private bucket, served via short-lived signed URLs. Mirrors the existing
-- `homework-files` owner model (owner = auth.uid() for writes) but adds an
-- authenticated-read policy so the other side of a lesson (teacher ↔ student)
-- can play the file. Finer per-relationship read scoping lands with the voice
-- format (5D); for now the closed tutoring platform reads within authenticated.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-media', 'task-media', false, 20971520,  -- 20 MB / file
  array['audio/webm','audio/ogg','audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/aac','audio/wav']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Owner has full control of their own objects (insert/update/delete + read).
drop policy if exists "task_media owner rw" on storage.objects;
create policy "task_media owner rw" on storage.objects
  for all to authenticated
  using (bucket_id = 'task-media' and owner = auth.uid())
  with check (bucket_id = 'task-media' and owner = auth.uid());

-- Any authenticated user may READ (so the counterpart can play via signed URL).
drop policy if exists "task_media auth read" on storage.objects;
create policy "task_media auth read" on storage.objects
  for select to authenticated
  using (bucket_id = 'task-media');
