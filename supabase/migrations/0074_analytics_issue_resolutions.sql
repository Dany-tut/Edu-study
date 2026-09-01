-- Закрытие проблем в «Аналитике».
--
-- ЗАЧЕМ. Счётчик ошибок суммирует окно в 30 дней и потому показывает историю, а
-- не состояние: 19 повторов бага, починенного вчера, продолжают гореть красным
-- ещё месяц. Нужен способ сказать «это разобрано» — и увидеть честный ноль.
--
-- КАК УСТРОЕНО. Закрывается не строка лога, а ПОДПИСЬ ошибки — `событие|текст|
-- файл|строка`, ровно тот ключ, по которому лог и так группируется. Все записи
-- этой подписи СТАРШЕ момента закрытия перестают считаться. Если та же ошибка
-- случится снова после — она всплывёт сама, уже как регресс: закрытие никогда
-- не прячет новое, поэтому «замести под ковёр» им не получится.
create table if not exists public.analytics_issue_resolutions (
  -- `event|msg|src|line`. Текст, а не хеш: подпись видно глазами прямо в базе.
  signature   text primary key,
  resolved_at timestamptz not null default now(),
  resolved_by uuid references auth.users(id) on delete set null,
  -- Версия приложения, в которой закрыли — чтобы регресс читался как «вернулось
  -- после 1.0.834», а не как «когда-то что-то было».
  app_version text,
  note        text
);

alter table public.analytics_issue_resolutions enable row level security;

-- Вкладка «Аналитика» — только для админа, здесь та же граница.
drop policy if exists analytics_issue_resolutions_admin_all on public.analytics_issue_resolutions;
create policy analytics_issue_resolutions_admin_all on public.analytics_issue_resolutions
  for all using (public.is_admin()) with check (public.is_admin());
