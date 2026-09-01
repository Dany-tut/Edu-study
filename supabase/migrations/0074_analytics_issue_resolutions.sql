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

-- ── Rage-точки тоже закрываются ──────────────────────────────────────────────
--
-- У них своя подпись — `rage|экран|элемент`, потому что «текст кнопки» и есть
-- то, что чинят. Чтобы закрытие вело себя как у ошибок (вернулось — значит
-- открыто снова), функции не хватало одного поля: когда точка сработала в
-- последний раз. Без него «старое закрыто» и «случилось опять» неразличимы.
create or replace function public.admin_rage_hotspots(p_days integer default 30)
returns table(path text, element text, cnt bigint, last_at timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select
      ae.path,
      coalesce(ae.meta->>'text', ae.meta->>'cls', ae.meta->>'tag', '—') as element,
      count(*)::bigint,
      max(ae.created_at)
    from analytics_events ae
    where ae.event = 'rage_click'
      and ae.created_at > now() - make_interval(days => p_days)
    group by ae.path, element
    order by 3 desc
    limit 20;
end; $function$;

-- ── Снимок для bounce-страниц ────────────────────────────────────────────────
--
-- У ошибки и rage-точки есть время последнего случая — по нему видно, вернулась
-- ли проблема. У «короткого dwell» времени нет: это средняя по окну, она есть
-- всегда. Поэтому здесь запоминается снимок на момент закрытия (визиты и dwell),
-- а страница всплывает заново, когда после закрытия набралась заметная новая
-- выборка и время до ухода всё ещё короткое (порог — в клиенте).
alter table public.analytics_issue_resolutions
  add column if not exists snapshot jsonb;
