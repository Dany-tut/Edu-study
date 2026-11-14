-- Additive: old timecodes and old clients keep working. RLS stays on lessons.
alter table public.lessons add column if not exists chapter_variants jsonb;
comment on column public.lessons.chapter_variants is 'Independent text/slide chapter drafts, selected mode and source; timecodes remains the published active set.';
