-- Минимальная схема Искры для проверки миграции MCP v2 на чистом Postgres
-- (образ supabase/postgres). Только то, на что опирается миграция: auth.*,
-- private, students, lesson_progress с RLS владельца, is_staff().
create schema if not exists private;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
create or replace function public.is_staff() returns boolean language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('teacher','admin') $$;
grant execute on function public.is_staff() to authenticated;
create table if not exists auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid, status text);
create or replace function public.mfa_ok() returns boolean language sql stable security definer set search_path to '' as $$ select true $$;
grant usage on schema public to authenticated, anon;

create table public.students (
  id uuid primary key default gen_random_uuid(), name text not null, group_id uuid,
  created_by uuid, phone text, email text, temp_password text);
alter table public.students enable row level security;
create policy students_owner on public.students for select to authenticated using (created_by = (select auth.uid()));
grant select on public.students to authenticated;

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(), student_id uuid not null, lesson_ref text not null,
  subject text, status text, score integer, comment text, attachments jsonb, review_comment text,
  review_attachments jsonb, hard_submitted boolean, updated_at timestamptz default now(),
  unique (student_id, lesson_ref));
alter table public.lesson_progress enable row level security;
create policy lp_owner on public.lesson_progress for all to authenticated using (
  exists (select 1 from public.students s where s.id = student_id and s.created_by = (select auth.uid())))
  with check (true);
create policy lp_anon_insert on public.lesson_progress for insert to anon with check (true);
create policy lp_anon_select on public.lesson_progress for select to anon using (true);
create policy lp_anon_update on public.lesson_progress for update to anon using (true) with check (true);
grant select, insert, update on public.lesson_progress to authenticated, anon;
