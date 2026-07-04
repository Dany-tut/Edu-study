-- Shared-course access: a course owned by one teacher can be made visible to
-- others (read-only) without transferring ownership. courses RLS is read_all,
-- so owner-scoping is client-side (.eq('created_by', uid)); the client widens
-- its two library reads with a union over course_shares. No RLS change needed.
create table if not exists public.course_shares (
  course_id  uuid not null references public.courses(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (course_id, teacher_id)
);
create index if not exists course_shares_teacher_idx on public.course_shares(teacher_id);

alter table public.course_shares enable row level security;

drop policy if exists read_all_course_shares on public.course_shares;
create policy read_all_course_shares on public.course_shares
  for select using (true);

drop policy if exists write_auth_course_shares on public.course_shares;
create policy write_auth_course_shares on public.course_shares
  for all to authenticated using (true) with check (true);
