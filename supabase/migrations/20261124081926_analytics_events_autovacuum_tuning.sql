-- analytics_events получает непрерывный поток вставок; автоочистка запускалась
-- редко и не успевала отмечать страницы видимыми (relallvisible = 0), из-за
-- чего index-only scan ходил в таблицу на каждую строку: выборка за 7 дней
-- 1,9 с вместо 0,19 с, «Сейчас на сайте» до 6,7 с. Чистим чаще по вставкам.
-- Только параметры автоочистки, данные не меняются. Откат: alter table ... reset (...).
alter table public.analytics_events set (
  autovacuum_vacuum_insert_scale_factor = 0.02,
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.05
);
