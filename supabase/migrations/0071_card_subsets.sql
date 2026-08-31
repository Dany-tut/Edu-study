-- Четвёртый уровень подборок: стопка внутри набора
--
-- ЗАЧЕМ. Уровней было три (полка → набор → карточки), и для сериала этого не
-- хватило: сезон целиком — четыреста сорок слов одной кучей, а нужна стопка на
-- серию, штук на двадцать. Метка `ep` у карточки эту задачу не решала: она
-- рисовалась серой строчкой и ничего не фильтровала.
--
-- ПОЧЕМУ НЕ НОВАЯ ТАБЛИЦА. Подстопка отличается от набора ровно одним — у неё
-- есть родитель. Всё остальное совпадает: заголовок, описание, порядок, и
-- главное — карточки, которые уже лежат в set_cards со ссылкой на set_id.
-- Отдельная таблица card_subsets означала бы вторую таблицу карточек рядом с
-- первой, и любой запрос «дай все карточки набора» пришлось бы писать дважды.
-- Поэтому self-reference: подстопка — это строка card_sets с parent_set_id.
--
-- GROUP_ID У ПОДСТОПКИ ЗАПОЛНЕН ТОЖЕ, и это не избыточность, а условие работы
-- политик RLS: они написаны через group_id (см. 0069), и строка без него была
-- бы не видна ни владельцу, ни ученику. Ссылка на родителя добавляет уровень,
-- но не отменяет принадлежность группе.

alter table public.card_sets
  add column if not exists parent_set_id uuid
    references public.card_sets(id) on delete cascade;

-- Выборка идёт «все наборы группы» одним запросом, а раскладываются они по
-- родителям уже на клиенте. Индекс нужен не выборке, а каскаду удаления:
-- без него удаление сезона перебирало бы таблицу целиком на каждую серию.
create index if not exists card_sets_parent_idx
  on public.card_sets(parent_set_id) where parent_set_id is not null;

-- ── Потолок вложенности ──────────────────────────────────────────────────────
--
-- Четыре уровня и ни одним больше. В типах клиента это уже так (CardSubset не
-- имеет своих подстопок), но клиент — не единственный, кто пишет в базу: есть
-- редактор таблиц, есть будущие скрипты, есть чужая сессия. Правило, которое
-- держится только соглашением, рано или поздно нарушат молча, поэтому оно
-- стоит здесь.
--
-- CHECK для этого не годится: он видит только свою строку, а решение зависит от
-- родительской. Отсюда триггер.
create or replace function public.card_sets_depth_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  grandparent uuid;
begin
  if new.parent_set_id is null then
    return new;
  end if;

  -- Сам себе родитель — вырожденный случай, который иначе даёт бесконечный цикл
  -- при сборке дерева на клиенте.
  if new.parent_set_id = new.id then
    raise exception 'набор не может быть вложен сам в себя';
  end if;

  select parent_set_id into grandparent
  from public.card_sets
  where id = new.parent_set_id;

  if grandparent is not null then
    raise exception 'глубже четырёх уровней нельзя: полка → набор → стопка → карточки';
  end if;

  return new;
end;
$$;

drop trigger if exists card_sets_depth_guard_trg on public.card_sets;
create trigger card_sets_depth_guard_trg
  before insert or update of parent_set_id on public.card_sets
  for each row execute function public.card_sets_depth_guard();

-- Родитель, у которого уже есть дети, сам не должен уехать под чужого родителя:
-- это тот же пятый уровень, только собранный с другого конца.
create or replace function public.card_sets_no_reparent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.parent_set_id is not null
     and exists (select 1 from public.card_sets where parent_set_id = new.id) then
    raise exception 'у набора есть свои стопки — его нельзя вложить в другой набор';
  end if;
  return new;
end;
$$;

drop trigger if exists card_sets_no_reparent_trg on public.card_sets;
create trigger card_sets_no_reparent_trg
  before update of parent_set_id on public.card_sets
  for each row execute function public.card_sets_no_reparent();

comment on column public.card_sets.parent_set_id is
  'Родительский набор. NULL — обычный набор второго уровня; заполнено — стопка внутри набора (серия внутри сезона). Глубже двух уровней запрещено триггером.';
