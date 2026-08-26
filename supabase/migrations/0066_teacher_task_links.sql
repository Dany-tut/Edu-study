-- ── Задача учителя может указывать на карточку ученика ───────────────────────
-- ЗАЧЕМ. Задачи были чистым текстом: клик по строке открывал модалку правки, и
-- «Заполнить карточку: Анна · Японский» никуда не вела — карточку приходилось
-- искать руками в Группах. Ссылка на строку students (и её группу) превращает
-- задачу в кнопку: клик открывает ту самую карточку.
--
-- Обе колонки nullable — обычная задача «созвон в 18:00» ни на кого не
-- ссылается. on delete cascade: задача про удалённую карточку бессмысленна и
-- висела бы вечно, ведя в пустоту.
alter table public.teacher_tasks
  add column if not exists student_id uuid references public.students(id) on delete cascade,
  add column if not exists group_id   uuid references public.groups(id)   on delete cascade;

-- Поиск «есть ли уже незакрытая задача по этой карточке» — дедуп при
-- автосоздании направления.
create index if not exists teacher_tasks_student_idx
  on public.teacher_tasks (student_id) where student_id is not null;
