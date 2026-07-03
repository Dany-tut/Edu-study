-- Teacher-enforced per-student widget visibility. Distinct from students.preferences.widgetOrder
-- (which the student controls and which useStudentPrefsSync overwrites wholesale) — this column is
-- set only by the teacher at creation and filtered out of the carousel at render, so the student
-- can never re-enable a widget the teacher hid.
alter table public.students
  add column if not exists hidden_widgets integer[] not null default '{}'::integer[];

comment on column public.students.hidden_widgets is
  'Widget ids (see src/data/widgets.ts WIDGET_META) the teacher hid for this student; filtered out of the dashboard carousel and reorder modal.';
