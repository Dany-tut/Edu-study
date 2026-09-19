-- ─────────────────────────────────────────────────────────────────────────────
-- Каталог курса «Биология клетки — университетский курс» (biocell-ru).
--
-- Только строки каталога: курс, модуль и 12 уроков. Конспекты, домашки и хард
-- лежат в коде (src/data/bioCellLessons.ts) и подставляются, пока lessons.content
-- пуст, — ровно как у AP Chemistry. Поэтому миграция лёгкая и не дублирует текст.
--
-- Идемпотентна: повторный прогон ничего не создаёт заново и не трогает конспект,
-- если его уже написали в Конструкторе.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_course_id uuid;
  v_module_id uuid;
  v_owner uuid;
begin
  -- Владелец — тот же, что у AP-химии: оба курса собраны как общий демо-контент
  -- кабинета. Если AP-курса в базе нет, владельца не подставляем (NULL допустим).
  select created_by into v_owner from courses where short_id = 'apchem-ru' limit 1;

  insert into courses (short_id, kind, title, subject, level, description, status, color, bg, created_by)
  values (
    'biocell-ru', 'course',
    'Биология клетки — университетский курс',
    'Биология',
    'Университет, 1–2 курс',
    'Молекулярная и клеточная биология уровня первых курсов университета: от слабых связей и укладки белка до репликации, регуляции генов, сигналинга и клеточного цикла. Глубина держится по Alberts (MBoC 7), Lehninger (8) и Griffiths; текст авторский, иллюстрации — из открытых источников.',
    'draft', '#1E9E63', '#DFF3E8', v_owner
  )
  on conflict (short_id) do nothing;

  select id into v_course_id from courses where short_id = 'biocell-ru';

  -- Модуль один: курс читается подряд, дробить его на части незачем.
  select id into v_module_id from course_modules where course_id = v_course_id limit 1;
  if v_module_id is null then
    insert into course_modules (course_id, label, position)
    values (v_course_id, 'Клетка: молекулы, механизмы, методы', 0)
    returning id into v_module_id;
  end if;

  insert into lessons (course_id, module_id, short_id, title, lesson_number, position, kind, shape)
  select v_course_id, v_module_id, d.short_id, d.title, d.n, d.n, 'lesson', d.shape
  from (values
    ('biocell-ru-0',  '0. Введение: клетка как система',              0,  'diamond'),
    ('biocell-ru-1',  '1. Химия жизни: вода и макромолекулы',         1,  'circle'),
    ('biocell-ru-2',  '2. Белки: от последовательности к функции',    2,  'circle'),
    ('biocell-ru-3',  '3. Ферменты и энергетика клетки',              3,  'circle'),
    ('biocell-ru-4',  '4. Мембраны и транспорт',                      4,  'circle'),
    ('biocell-ru-5',  '5. Компартменты и трафик белков',              5,  'circle'),
    ('biocell-ru-6',  '6. ДНК, хромосомы, репликация',                6,  'circle'),
    ('biocell-ru-7',  '7. Транскрипция и трансляция',                 7,  'circle'),
    ('biocell-ru-8',  '8. Регуляция экспрессии генов',                8,  'circle'),
    ('biocell-ru-9',  '9. Сигнальные пути',                           9,  'circle'),
    ('biocell-ru-10', '10. Клеточный цикл, митоз, апоптоз',           10, 'circle'),
    ('biocell-ru-11', '11. Методы: как это узнали',                   11, 'diamond')
  ) as d(short_id, title, n, shape)
  where not exists (select 1 from lessons l where l.short_id = d.short_id);
end $$;
