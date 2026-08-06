-- Порядок курсов в Конструкторе: «Новые» = по времени, а не по позиции в массиве.
-- Нужна отметка публикации: опубликовали — курс идёт в начало списка, обычная
-- правка (updated_at меняется на каждое сохранение) его не двигает.
alter table public.courses add column if not exists published_at timestamptz;

-- Уже опубликованным проставляем время последней записи — иначе они уедут в конец.
update public.courses
   set published_at = coalesce(updated_at, created_at)
 where status = 'published' and published_at is null;

-- Штампуем в БД, а не в клиенте: курс пишут два разных пути (карточка в
-- Конструкторе и редактор курса), триггер держит поле честным для обоих.
create or replace function public.courses_stamp_published_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' then
    if tg_op = 'INSERT' or old.status is distinct from 'published' then
      new.published_at := now();
    else
      new.published_at := coalesce(old.published_at, now());
    end if;
  else
    new.published_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_courses_published_at on public.courses;
create trigger trg_courses_published_at
  before insert or update on public.courses
  for each row execute function public.courses_stamp_published_at();
