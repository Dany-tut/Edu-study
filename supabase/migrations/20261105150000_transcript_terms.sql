-- Словарь расшифровки: термины предмета и типичные ошибки распознавания.
--
-- Зачем. Локальный модуль (Whisper на Mac учителя) на редких терминах выбирает
-- частое похожее звучание: «на s-подуровне» → «на из-под уровне». Модуль
-- получает от страницы словарь предмета и
--   1) подсказывает Whisper написанные термины (initial_prompt),
--   2) после распознавания заменяет известные ошибки (heard → written).
--
-- Откуда словарь. Стартовый набор (source='seed') + правки учителей: учитель
-- исправил реплику — страница вынимает изменённый кусок и предлагает пару.
-- Своя пара действует у учителя сразу (он за неё «проголосовал»); в общий
-- словарь предмета она попадает, когда её независимо внесли 3 учителя или
-- одобрил администратор. В базу попадают только пары терминов — не реплики
-- урока (в них речь учеников).
--
-- Звук для дообучения модели (уровень Б) сюда не попадает никогда: он лежит
-- только на Mac учителя, в папке модуля.

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table public.transcript_terms (
  id          uuid primary key default gen_random_uuid(),
  -- id предмета из реестра ('chemistry', 'biology') или название своего предмета.
  subject     text not null check (char_length(subject) between 1 and 60),
  -- Как правильно пишется: «s-подуровень», «HSO₄⁻», «пенициллин».
  written     text not null check (char_length(written) between 1 and 80),
  -- Как ошибочно распознаётся. Пусто — просто термин-подсказка.
  -- «*» в конце обеих сторон — любое окончание слова: «эс подуровн*» → «s-подуровн*».
  heard       text check (heard is null or char_length(heard) between 1 and 80),
  -- Как произносят вслух — для подсказки и для людей: «аш эс о четыре».
  spoken      text check (spoken is null or char_length(spoken) <= 80),
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  source      text not null default 'teacher' check (source in ('seed', 'teacher', 'admin')),
  created_by  uuid default auth.uid(),
  -- Сколько раз пару вносили (все учителя вместе) — порядок в подсказке.
  hits        integer not null default 1 check (hits >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index transcript_terms_unique
  on public.transcript_terms (subject, lower(written), lower(coalesce(heard, '')));
create index transcript_terms_subject_status on public.transcript_terms (subject, status);

-- Кто внёс пару: один учитель — один голос, сколько бы раз он её ни правил.
create table public.transcript_term_votes (
  term_id     uuid not null references public.transcript_terms(id) on delete cascade,
  teacher_id  uuid not null,
  created_at  timestamptz not null default now(),
  primary key (term_id, teacher_id)
);
create index transcript_term_votes_teacher on public.transcript_term_votes (teacher_id);

revoke all on public.transcript_terms, public.transcript_term_votes from anon;
grant select, insert, update, delete on public.transcript_terms to authenticated;
grant select on public.transcript_term_votes to authenticated;
alter table public.transcript_terms enable row level security;
alter table public.transcript_term_votes enable row level security;

-- Учитель видит общий словарь и свои пары; администратор — всё.
create policy transcript_terms_read on public.transcript_terms for select to authenticated using (
  (select public.is_admin()) or status = 'approved'
  or exists (select 1 from public.transcript_term_votes v where v.term_id = transcript_terms.id and v.teacher_id = (select auth.uid()))
);
create policy transcript_terms_admin_insert on public.transcript_terms for insert to authenticated
  with check ((select public.is_admin()));
create policy transcript_terms_admin_update on public.transcript_terms for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy transcript_terms_admin_delete on public.transcript_terms for delete to authenticated
  using ((select public.is_admin()));

create policy transcript_term_votes_read on public.transcript_term_votes for select to authenticated using (
  (select public.is_admin()) or teacher_id = (select auth.uid())
);

-- Порог: сколько разных учителей должны внести пару, чтобы она стала общей.
create or replace function public.transcript_terms_quorum() returns integer
language sql immutable set search_path = '' as $$ select 3 $$;

-- Предложить пары из правок. Каждая пара: {heard, written}. Пара без heard —
-- просто термин. Повтор своей же пары голос не добавляет, но считает hits.
create or replace function public.suggest_transcript_terms(p_subject text, p_pairs jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_subject text := left(trim(coalesce(p_subject, '')), 60);
  v_item jsonb;
  v_written text; v_heard text;
  v_id uuid;
  v_count integer := 0;
begin
  if v_uid is null or not public.is_staff() then raise exception 'not allowed' using errcode = '42501'; end if;
  if v_subject = '' or jsonb_typeof(p_pairs) <> 'array' then return 0; end if;
  for v_item in select value from jsonb_array_elements(p_pairs) limit 20 loop
    v_written := nullif(left(trim(coalesce(v_item ->> 'written', '')), 80), '');
    v_heard := nullif(left(trim(coalesce(v_item ->> 'heard', '')), 80), '');
    continue when v_written is null or lower(v_written) = lower(coalesce(v_heard, ''));
    insert into public.transcript_terms (subject, written, heard, source, created_by)
    values (v_subject, v_written, v_heard, 'teacher', v_uid)
    on conflict (subject, lower(written), lower(coalesce(heard, ''))) do update
      set hits = public.transcript_terms.hits + 1, updated_at = now()
    returning id into v_id;
    insert into public.transcript_term_votes (term_id, teacher_id) values (v_id, v_uid) on conflict do nothing;
    update public.transcript_terms t set status = 'approved', updated_at = now()
    where t.id = v_id and t.status = 'pending'
      and (select count(*) from public.transcript_term_votes v where v.term_id = v_id) >= public.transcript_terms_quorum();
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.suggest_transcript_terms(text, jsonb) from public, anon;
grant execute on function public.suggest_transcript_terms(text, jsonb) to authenticated;

-- Пакет для модуля: общий словарь предмета + свои пары учителя (ещё не общие,
-- но не отклонённые). Самые частые — первыми: подсказка Whisper короткая.
create or replace function public.transcript_terms_pack(p_subject text)
returns table (written text, heard text, spoken text, mine boolean)
language sql stable security definer set search_path = '' as $$
  select t.written, t.heard, t.spoken,
         exists (select 1 from public.transcript_term_votes v where v.term_id = t.id and v.teacher_id = auth.uid()) as mine
  from public.transcript_terms t
  where auth.uid() is not null and t.subject = left(trim(coalesce(p_subject, '')), 60) and t.status <> 'rejected'
    and (t.status = 'approved'
      or exists (select 1 from public.transcript_term_votes v where v.term_id = t.id and v.teacher_id = auth.uid()))
  order by t.hits desc, t.created_at
  limit 600
$$;
revoke all on function public.transcript_terms_pack(text) from public, anon;
grant execute on function public.transcript_terms_pack(text) to authenticated;

-- Админке: сколько разных учителей внесли каждую пару.
create or replace function public.transcript_term_voters(p_ids uuid[])
returns table (term_id uuid, voters integer)
language sql stable security definer set search_path = '' as $$
  select v.term_id, count(*)::integer from public.transcript_term_votes v
  where public.is_admin() and v.term_id = any(p_ids) group by v.term_id
$$;
revoke all on function public.transcript_term_voters(uuid[]) from public, anon;
grant execute on function public.transcript_term_voters(uuid[]) to authenticated;

-- ── Стартовый словарь ───────────────────────────────────────────────────────
-- Термины (heard пусто) — подсказка Whisper; пары — частые ошибки распознавания
-- русской речи. Пары с буквами-названиями («эс», «пэ», «аш») срабатывают только
-- целой фразой — обычную речь они не задевают.
insert into public.transcript_terms (subject, written, heard, spoken, status, source, created_by, hits) values
  -- химия: строение атома
  ('chemistry', 's-подуровень', null, 'эс-подуровень', 'approved', 'seed', null, 5),
  ('chemistry', 'p-подуровень', null, 'пэ-подуровень', 'approved', 'seed', null, 5),
  ('chemistry', 'd-подуровень', null, 'дэ-подуровень', 'approved', 'seed', null, 5),
  ('chemistry', 'f-подуровень', null, 'эф-подуровень', 'approved', 'seed', null, 4),
  ('chemistry', 'орбиталь', null, null, 'approved', 'seed', null, 5),
  ('chemistry', 'электронная конфигурация', null, null, 'approved', 'seed', null, 5),
  ('chemistry', 'валентные электроны', null, null, 'approved', 'seed', null, 4),
  ('chemistry', 'неспаренные электроны', null, null, 'approved', 'seed', null, 3),
  ('chemistry', 'правило Клечковского', null, null, 'approved', 'seed', null, 3),
  ('chemistry', 'принцип Паули', null, null, 'approved', 'seed', null, 3),
  ('chemistry', 'правило Хунда', null, null, 'approved', 'seed', null, 3),
  ('chemistry', 'электроотрицательность', null, null, 'approved', 'seed', null, 4),
  ('chemistry', 'степень окисления', null, null, 'approved', 'seed', null, 5),
  ('chemistry', 'sp³-гибридизация', null, 'эс-пэ-три гибридизация', 'approved', 'seed', null, 3),
  ('chemistry', 'σ-связь', null, 'сигма-связь', 'approved', 'seed', null, 3),
  ('chemistry', 'π-связь', null, 'пи-связь', 'approved', 'seed', null, 3),
  ('chemistry', 'изотоп', null, null, 'approved', 'seed', null, 3),
  ('chemistry', 'катион', null, null, 'approved', 'seed', null, 4),
  ('chemistry', 'анион', null, null, 'approved', 'seed', null, 4),
  ('chemistry', 'моль', null, null, 'approved', 'seed', null, 4),
  ('chemistry', 'молярная масса', null, null, 'approved', 'seed', null, 4),
  -- химия: реакции и растворы
  ('chemistry', 'ОВР', null, 'о-вэ-эр', 'approved', 'seed', null, 4),
  ('chemistry', 'окислитель', null, null, 'approved', 'seed', null, 4),
  ('chemistry', 'восстановитель', null, null, 'approved', 'seed', null, 4),
  ('chemistry', 'электролиз', null, null, 'approved', 'seed', null, 3),
  ('chemistry', 'гидролиз', null, null, 'approved', 'seed', null, 3),
  ('chemistry', 'электролитическая диссоциация', null, null, 'approved', 'seed', null, 3),
  ('chemistry', 'pH', null, 'пэ-аш', 'approved', 'seed', null, 3),
  ('chemistry', 'катализатор', null, null, 'approved', 'seed', null, 3),
  ('chemistry', 'ингибитор', null, null, 'approved', 'seed', null, 2),
  -- химия: органика
  ('chemistry', 'алканы', null, null, 'approved', 'seed', null, 3),
  ('chemistry', 'алкены', null, null, 'approved', 'seed', null, 3),
  ('chemistry', 'алкины', null, null, 'approved', 'seed', null, 3),
  ('chemistry', 'арены', null, null, 'approved', 'seed', null, 2),
  ('chemistry', 'альдегид', null, null, 'approved', 'seed', null, 3),
  ('chemistry', 'кетон', null, null, 'approved', 'seed', null, 3),
  ('chemistry', 'карбоновая кислота', null, null, 'approved', 'seed', null, 3),
  ('chemistry', 'сложный эфир', null, null, 'approved', 'seed', null, 2),
  ('chemistry', 'изомерия', null, null, 'approved', 'seed', null, 3),
  -- химия: формулы, которые произносят по буквам
  ('chemistry', 'H₂O', 'аш два о', 'аш-два-о', 'approved', 'seed', null, 4),
  ('chemistry', 'H₂SO₄', 'аш два эс о четыре', 'аш-два-эс-о-четыре', 'approved', 'seed', null, 4),
  ('chemistry', 'HSO₄⁻', 'аш эс о четыре', 'аш-эс-о-четыре', 'approved', 'seed', null, 3),
  ('chemistry', 'HCl', 'аш хлор', 'аш-хлор', 'approved', 'seed', null, 3),
  ('chemistry', 'NaCl', 'натрий хлор', 'натрий-хлор', 'approved', 'seed', null, 3),
  ('chemistry', 'NaOH', 'натрий о аш', 'натрий-о-аш', 'approved', 'seed', null, 3),
  ('chemistry', 'NH₃', 'эн аш три', 'эн-аш-три', 'approved', 'seed', null, 3),
  ('chemistry', 'CO₂', 'цэ о два', 'цэ-о-два', 'approved', 'seed', null, 3),
  -- химия: частые ошибки распознавания
  ('chemistry', 's-подуровн*', 'из-под уровн*', null, 'approved', 'seed', null, 5),
  ('chemistry', 's-подуровн*', 'из под уровн*', null, 'approved', 'seed', null, 5),
  ('chemistry', 's-подуровн*', 'эс подуровн*', null, 'approved', 'seed', null, 4),
  ('chemistry', 'p-подуровн*', 'пэ подуровн*', null, 'approved', 'seed', null, 4),
  ('chemistry', 'd-подуровн*', 'дэ подуровн*', null, 'approved', 'seed', null, 4),
  ('chemistry', 'f-подуровн*', 'эф подуровн*', null, 'approved', 'seed', null, 3),
  ('chemistry', 's-орбитал*', 'эс орбитал*', null, 'approved', 'seed', null, 3),
  ('chemistry', 'p-орбитал*', 'пэ орбитал*', null, 'approved', 'seed', null, 3),
  ('chemistry', 'd-орбитал*', 'дэ орбитал*', null, 'approved', 'seed', null, 3),
  ('chemistry', 'sp³-гибридизаци*', 'эс пэ три гибридизаци*', null, 'approved', 'seed', null, 2),
  ('chemistry', 'sp²-гибридизаци*', 'эс пэ два гибридизаци*', null, 'approved', 'seed', null, 2),
  ('chemistry', 'pH', 'пэ аш', null, 'approved', 'seed', null, 2),
  -- биология: клетка
  ('biology', 'митохондрия', null, null, 'approved', 'seed', null, 5),
  ('biology', 'хлоропласт', null, null, 'approved', 'seed', null, 4),
  ('biology', 'рибосома', null, null, 'approved', 'seed', null, 4),
  ('biology', 'эндоплазматическая сеть', null, null, 'approved', 'seed', null, 4),
  ('biology', 'аппарат Гольджи', null, null, 'approved', 'seed', null, 4),
  ('biology', 'лизосома', null, null, 'approved', 'seed', null, 3),
  ('biology', 'цитоплазма', null, null, 'approved', 'seed', null, 3),
  ('biology', 'фосфолипиды', null, null, 'approved', 'seed', null, 3),
  ('biology', 'эукариоты', null, null, 'approved', 'seed', null, 3),
  ('biology', 'прокариоты', null, null, 'approved', 'seed', null, 3),
  -- биология: энергия
  ('biology', 'АТФ', null, 'а-тэ-эф', 'approved', 'seed', null, 5),
  ('biology', 'АДФ', null, 'а-дэ-эф', 'approved', 'seed', null, 3),
  ('biology', 'НАДФ·Н', null, 'надф-аш', 'approved', 'seed', null, 2),
  ('biology', 'гликолиз', null, null, 'approved', 'seed', null, 4),
  ('biology', 'цикл Кребса', null, null, 'approved', 'seed', null, 4),
  ('biology', 'окислительное фосфорилирование', null, null, 'approved', 'seed', null, 3),
  ('biology', 'фотосинтез', null, null, 'approved', 'seed', null, 4),
  ('biology', 'хемосинтез', null, null, 'approved', 'seed', null, 2),
  -- биология: наследственность
  ('biology', 'ДНК', null, 'дэ-эн-ка', 'approved', 'seed', null, 5),
  ('biology', 'РНК', null, 'эр-эн-ка', 'approved', 'seed', null, 4),
  ('biology', 'мРНК', null, 'эм-эр-эн-ка', 'approved', 'seed', null, 3),
  ('biology', 'тРНК', null, 'тэ-эр-эн-ка', 'approved', 'seed', null, 3),
  ('biology', 'транскрипция', null, null, 'approved', 'seed', null, 4),
  ('biology', 'трансляция', null, null, 'approved', 'seed', null, 4),
  ('biology', 'репликация', null, null, 'approved', 'seed', null, 4),
  ('biology', 'кодон', null, null, 'approved', 'seed', null, 3),
  ('biology', 'антикодон', null, null, 'approved', 'seed', null, 3),
  ('biology', 'аллель', null, null, 'approved', 'seed', null, 3),
  ('biology', 'генотип', null, null, 'approved', 'seed', null, 3),
  ('biology', 'фенотип', null, null, 'approved', 'seed', null, 3),
  ('biology', 'гомозигота', null, null, 'approved', 'seed', null, 3),
  ('biology', 'гетерозигота', null, null, 'approved', 'seed', null, 3),
  ('biology', 'митоз', null, null, 'approved', 'seed', null, 4),
  ('biology', 'мейоз', null, null, 'approved', 'seed', null, 4),
  ('biology', 'интерфаза', null, null, 'approved', 'seed', null, 3),
  ('biology', 'кроссинговер', null, null, 'approved', 'seed', null, 3),
  ('biology', 'хроматида', null, null, 'approved', 'seed', null, 3),
  ('biology', 'центромера', null, null, 'approved', 'seed', null, 2),
  -- биология: прочее
  ('biology', 'фермент', null, null, 'approved', 'seed', null, 4),
  ('biology', 'субстрат', null, null, 'approved', 'seed', null, 3),
  ('biology', 'пенициллин', null, null, 'approved', 'seed', null, 3),
  ('biology', 'антибиотик', null, null, 'approved', 'seed', null, 3),
  -- биология: аббревиатуры по буквам
  ('biology', 'ДНК', 'дэ эн ка', null, 'approved', 'seed', null, 4),
  ('biology', 'РНК', 'эр эн ка', null, 'approved', 'seed', null, 3),
  ('biology', 'мРНК', 'эм эр эн ка', null, 'approved', 'seed', null, 2),
  ('biology', 'тРНК', 'тэ эр эн ка', null, 'approved', 'seed', null, 2),
  ('biology', 'АТФ', 'а тэ эф', null, 'approved', 'seed', null, 3),
  ('biology', 'АДФ', 'а дэ эф', null, 'approved', 'seed', null, 2)
on conflict do nothing;
