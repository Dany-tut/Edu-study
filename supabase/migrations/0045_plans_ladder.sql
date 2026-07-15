-- Пересборка лесенки тарифов под запуск продаж.
-- Лесенка по числу учеников: Free до 2 / Базовый 490 до 5 /
-- Про 990 до 15 / Школа 2490 до 30 / Безлимит 4990 без лимита.
-- Подписок ещё нет (teacher_subscriptions пуст), код 'solo' убираем безопасно.

update plans set name = 'Бесплатный', price_rub = 0,    max_students = 2,    sort = 0 where code = 'free';
update plans set name = 'Про',        price_rub = 990,  max_students = 15,   sort = 2 where code = 'pro';
update plans set name = 'Школа',      price_rub = 2490, max_students = 30,   sort = 3 where code = 'school';

insert into plans (code, name, price_rub, max_students, features, sort) values
  ('basic',     'Базовый',  490,  5,    '[]'::jsonb, 1),
  ('unlimited', 'Безлимит', 4990, null, '[]'::jsonb, 4)
on conflict (code) do update
  set name = excluded.name, price_rub = excluded.price_rub,
      max_students = excluded.max_students, sort = excluded.sort;

-- Старый тариф «Соло» больше не предлагаем (никто на нём не сидит).
delete from plans where code = 'solo';
