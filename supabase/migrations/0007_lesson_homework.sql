-- Homework authored in the course editor's «Домашки» tab was only ever held in
-- the editor's React state — the lessons table had no column for it, so on
-- re-entry the homework was gone. Persist it as a single JSONB blob mirroring
-- the CELesson homework sub-fields (lesson «Урок» node + recording «Запись»
-- node; hard tasks live inline in the task arrays via the isHard flag).
--
-- Shape:
-- {
--   hwTitle, hwTarget, hwDate, hwDateManual, hwTasks: [...],
--   recHwTitle, recHwTarget, recHwDate, recHwDateManual, recHwTasks: [...]
-- }

alter table public.lessons
  add column if not exists homework jsonb not null default '{}'::jsonb;
