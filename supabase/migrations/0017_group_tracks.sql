-- Направления (subject+level pairs) beyond the primary subject/level columns.
-- Used by individual (1:1) groups: a student can study Химия ЕГЭ + Биология ОГЭ
-- at once, and more tracks can be added mid-training. The existing
-- groups.subject/groups.level stay as the primary (first) track.
alter table public.groups
  add column if not exists tracks jsonb not null default '[]'::jsonb;

comment on column public.groups.tracks is
  'Extra subject tracks: [{"subject": "...", "level": "..."}]; primary track lives in subject/level columns.';
