-- Лайк под материалом ленты
--
-- ЗАЧЕМ ОТДЕЛЬНАЯ ТАБЛИЦА, А НЕ СЧЁТЧИК. Счётчик в колонке нельзя ни отменить
-- (кто именно поставил?), ни защитить от накрутки: два клика в двух вкладках
-- дали бы +2. Строка на человека и уникальный индекс решают оба вопроса разом,
-- причём на уровне БД, а не на доверии к клиенту.
--
-- ОБЛАСТЬ ВИДИМОСТИ — ГРУППА, как у комментариев (0057) и по той же причине:
-- платформа многопользовательская и работает с детьми, поэтому «12 лайков» —
-- это двенадцать одноклассников, а не двенадцать незнакомцев со всей базы.
--
-- ПОЧЕМУ ТОЛЬКО ЛАЙК И НЕТ ДИЗЛАЙКА. Под учебным материалом дизлайк — это
-- оценка не материала, а того, кто его не понял. Лента должна поощрять
-- открывать, а не бояться.

create table if not exists public.feed_likes (
  id uuid primary key default gen_random_uuid(),
  item_id text not null,
  group_id uuid references public.groups(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  author_user uuid,
  created_at timestamptz not null default now(),
  constraint feed_likes_author_ck check (
    (student_id is not null and author_user is null)
    or (student_id is null and author_user is not null)
  )
);

-- Один человек — один лайк на материал. Частичные индексы, потому что автор
-- лежит в одной из двух колонок, и общий unique их не покрывает.
create unique index if not exists feed_likes_student_uq
  on public.feed_likes (item_id, student_id) where student_id is not null;
create unique index if not exists feed_likes_user_uq
  on public.feed_likes (item_id, author_user) where author_user is not null;

create index if not exists feed_likes_item_idx
  on public.feed_likes (item_id, group_id);

alter table public.feed_likes enable row level security;

drop policy if exists anon_select_fl on public.feed_likes;
drop policy if exists anon_insert_fl on public.feed_likes;
drop policy if exists anon_delete_fl on public.feed_likes;

create policy anon_select_fl on public.feed_likes for select to anon
  using (
    group_id is not null
    and exists (select 1 from public.students s
                where s.group_id = feed_likes.group_id
                  and public.is_legacy_student(s.id))
  );
create policy anon_insert_fl on public.feed_likes for insert to anon
  with check (
    student_id is not null
    and public.is_legacy_student(student_id)
    and exists (select 1 from public.students s
                where s.id = feed_likes.student_id
                  and s.group_id = feed_likes.group_id)
  );
-- Снять свой лайк можно всегда: иначе это не лайк, а подпись под документом.
create policy anon_delete_fl on public.feed_likes for delete to anon
  using (student_id is not null and public.is_legacy_student(student_id));

drop policy if exists auth_select_fl on public.feed_likes;
drop policy if exists auth_insert_fl on public.feed_likes;
drop policy if exists auth_delete_fl on public.feed_likes;

create policy auth_select_fl on public.feed_likes for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.groups g
               where g.id = feed_likes.group_id and g.created_by = auth.uid())
    or exists (select 1 from public.students s
               where s.group_id = feed_likes.group_id and s.auth_user_id = auth.uid())
  );

create policy auth_insert_fl on public.feed_likes for insert to authenticated
  with check (
    public.is_admin()
    or (author_user = auth.uid()
        and exists (select 1 from public.groups g
                    where g.id = feed_likes.group_id and g.created_by = auth.uid()))
    or (student_id is not null and exists (
          select 1 from public.students s
          where s.id = feed_likes.student_id
            and s.auth_user_id = auth.uid()
            and s.group_id = feed_likes.group_id))
  );

create policy auth_delete_fl on public.feed_likes for delete to authenticated
  using (
    public.is_admin()
    or author_user = auth.uid()
    or exists (select 1 from public.students s
               where s.id = feed_likes.student_id and s.auth_user_id = auth.uid())
  );
