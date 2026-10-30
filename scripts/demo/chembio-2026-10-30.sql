-- Demo data requested for 30/31 October and 1 November 2026.
-- Only de3010ad rows are created; no student accounts are attached.
-- Re-running does not duplicate lessons or overwrite existing submissions.
do $seed$
begin
insert into groups (id, name, subject, level, is_individual, created_by, icon, color, color_soft, start_date)
select v.id::uuid, v.name, v.subject, v.level, v.ind, '84fe210b-677d-41e2-a3d9-74021390c0c2'::uuid,
       coalesce(src.icon, ''), coalesce(src.color, '#786AD7'), coalesce(src.color_soft, '#EEE9FC'), '2026-09-01'::date
from (values
  ('de3010ad-0000-4000-8000-000000000001', 'Демо · Хим ОГЭ 2027',      'Химия',    'ОГЭ', false),
  ('de3010ad-0000-4000-8000-000000000002', 'Демо · Био ЕГЭ интенсив',  'Биология', 'ЕГЭ', false),
  ('de3010ad-0000-4000-8000-000000000003', 'Демо · Хим ЕГЭ вечер',     'Химия',    'ЕГЭ', false),
  ('de3010ad-0000-4000-8000-000000000004', 'Демо · Маша Ковалёва',     'Биология', 'ЕГЭ', true),
  ('de3010ad-0000-4000-8000-000000000005', 'Демо · Тимур Ахметов',     'Химия',    'ЕГЭ', true)
) v(id, name, subject, level, ind)
left join lateral (select icon, color, color_soft from groups g
                   where g.created_by = '84fe210b-677d-41e2-a3d9-74021390c0c2'::uuid and g.subject = v.subject order by (g.id::text like 'da7a5eed%') desc, g.id limit 1) src on true
on conflict (id) do nothing;
insert into students (id, group_id, name, started_at)
select ('de3010ad-0000-4000-8001-0000000000' || lpad(n::text, 2, '0'))::uuid,
       ('de3010ad-0000-4000-8000-00000000000' || g)::uuid, name, '2026-09-01'::date
from (values
  (1, 1, 'Демо Полина'), (2, 1, 'Демо Илья'), (3, 1, 'Демо Ксюша'), (4, 1, 'Демо Гоша'),
  (5, 2, 'Демо Аля'), (6, 2, 'Демо Марк'), (7, 2, 'Демо Ева'), (8, 2, 'Демо Лёва'), (9, 2, 'Демо Дина'), (10, 2, 'Демо Саша'),
  (11, 3, 'Демо Нина'), (12, 3, 'Демо Федя'), (13, 3, 'Демо Яна'),
  (14, 4, 'Демо Маша Ковалёва'),
  (15, 5, 'Демо Тимур Ахметов')
) s(n, g, name)
on conflict (id) do nothing;
insert into schedule_lessons (id, group_id, student_id, date, time_start, time_end, subject, lesson_title, status, node_type)
select ('de3010ad-0000-4000-8003-' || lpad((row_number() over (order by d, t0, g))::text, 12, '0'))::uuid,
       ('de3010ad-0000-4000-8000-00000000000' || g)::uuid,
       case when st is null then null else ('de3010ad-0000-4000-8001-0000000000' || lpad(st::text, 2, '0'))::uuid end,
       d::date, t0, t1, subj, coalesce(title, ''), 'upcoming', nt
from (values
  ('2026-10-30', 5, 15,   '09:00', '10:00', 'Химия',    'Задача № 33',                       'lesson'),
  ('2026-10-30', 1, null, '15:00', '16:30', 'Химия',    'Классы неорганических веществ',     'lesson'),
  ('2026-10-30', 2, null, '17:00', '18:30', 'Биология', 'Генетика: дигибридное скрещивание', 'lesson'),
  ('2026-10-30', 4, 14,   '19:00', '20:00', 'Биология', 'Эволюция',                          'lesson'),
  ('2026-10-30', 3, null, '20:15', '21:45', 'Химия',    'ОВР',                               'lesson'),
  ('2026-10-31', 2, null, '10:00', '11:30', 'Биология', 'Пробник: часть 2',                  'lesson'),
  ('2026-10-31', 5, 15,   '11:00', '12:00', 'Химия',    'Разбор пробника',                   'lesson'),
  ('2026-10-31', 3, null, '14:00', '15:30', 'Химия',    'Запись: электролиз',                'rec'),
  ('2026-10-31', 1, null, '18:00', '19:00', 'Химия',    'Реакции ионного обмена',            'lesson'),
  ('2026-11-01', 4, 14,   '10:00', '11:00', 'Биология', 'Клетка: повтор',                    'lesson'),
  ('2026-11-01', 2, null, '12:00', '13:30', 'Биология', 'Экология',                          'lesson'),
  ('2026-11-01', 1, null, '16:00', '17:00', 'Химия',    null,                                'lesson')
) l(d, g, st, t0, t1, subj, title, nt)
on conflict (id) do nothing;
insert into homework (id, group_id, title, due_date, assigned_at, status, task_ids, total_students, created_by)
select ('de3010ad-0000-4000-8002-00000000000' || n)::uuid, ('de3010ad-0000-4000-8000-00000000000' || g)::uuid,
       title, due::date, asg::date, 'active', '[]'::jsonb, tot, '84fe210b-677d-41e2-a3d9-74021390c0c2'::uuid
from (values
  (1, 1, 'ДЗ № 5 · Классы веществ',   '2026-10-30', '2026-10-27', 4),
  (2, 2, 'ДЗ № 18 · Генетика',        '2026-10-30', '2026-10-26', 6),
  (3, 3, 'ДЗ № 9 · ОВР',              '2026-10-31', '2026-10-28', 3),
  (4, 2, 'Пробник ЕГЭ · вариант 3',   '2026-10-31', '2026-10-29', 6),
  (5, 1, 'ДЗ № 6 · Ионный обмен',     '2026-11-01', '2026-10-29', 4),
  (6, 3, '',                          '2026-11-01', '2026-10-27', 3),
  (7, 4, 'Эволюция: тест',            '2026-11-01', '2026-10-28', 1)
) h(n, g, title, due, asg, tot)
on conflict (id) do nothing;
insert into lesson_progress (student_id, lesson_ref, subject, status, score, updated_at)
select ('de3010ad-0000-4000-8001-0000000000' || lpad(st::text, 2, '0'))::uuid,
       'hw-de3010ad-0000-4000-8002-00000000000' || hw, subj, status,
       case when status = 'completed' then 4 end, now()
from (values
  (1, 1, 'Химия', 'completed'), (2, 1, 'Химия', 'completed'), (3, 1, 'Химия', 'returned'), (4, 1, 'Химия', 'submitted'),
  (5, 2, 'Биология', 'completed'), (6, 2, 'Биология', 'submitted'),
  (5, 4, 'Биология', 'completed'), (6, 4, 'Биология', 'completed'), (7, 4, 'Биология', 'returned'),
  (8, 4, 'Биология', 'submitted'), (9, 4, 'Биология', 'submitted'),
  (1, 5, 'Химия', 'submitted'),
  (11, 6, 'Химия', 'completed')
) p(st, hw, subj, status)
on conflict (student_id, lesson_ref) do nothing;
update hw_ai_grades set status = 'skipped', updated_at = now() where student_id::text like 'de3010ad%' and status = 'pending';
delete from notifications where link->>'studentId' like 'de3010ad%';
end $seed$;
