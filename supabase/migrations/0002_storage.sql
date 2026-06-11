-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0002_storage — file/photo buckets                                          ║
-- ║  task-images      public  — images attached to bank questions             ║
-- ║  lesson-materials public  — lesson handouts / files                       ║
-- ║  homework-files   private — student submission photos/files (Этап 3)      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

insert into storage.buckets (id, name, public)
values
  ('task-images',      'task-images',      true),
  ('lesson-materials', 'lesson-materials', true),
  ('homework-files',   'homework-files',   false)
on conflict (id) do nothing;

-- Public buckets: anyone may read (images are shown to all students).
create policy "read task-images"
  on storage.objects for select using (bucket_id = 'task-images');
create policy "read lesson-materials"
  on storage.objects for select using (bucket_id = 'lesson-materials');

-- Logged-in users may upload/replace into the authoring buckets.
-- (Этап 3 narrows this to teacher-role.)
create policy "write task-images"
  on storage.objects for all to authenticated
  using      (bucket_id = 'task-images')
  with check (bucket_id = 'task-images');
create policy "write lesson-materials"
  on storage.objects for all to authenticated
  using      (bucket_id = 'lesson-materials')
  with check (bucket_id = 'lesson-materials');

-- Private homework files: a user can only see/manage their own uploads.
-- (Этап 3 also grants the owning teacher read access for grading.)
create policy "owner rw homework-files"
  on storage.objects for all to authenticated
  using      (bucket_id = 'homework-files' and owner = auth.uid())
  with check (bucket_id = 'homework-files' and owner = auth.uid());
