-- Избранные ученики учителя в «Группах» (концепт: Figma «Искра», стр. 25).
-- Избранное личное: у соавторов группы свой порядок, поэтому это строки учителя,
-- а не поле в students (карточка ученика общая).
--
-- person_key — тот же ключ, что склеивает карточки человека в списке
-- (personKey в lib/useGroups.ts: person_id → auth user → name:<имя>).
--
-- Только добавляет таблицу и функцию; существующие данные не трогаются.
-- История и резервное копирование подхватывают новую public-таблицу сами
-- (iskra_history.protected_tables, docs/data-preservation.md).
create table if not exists public.teacher_pinned_students (
  teacher_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  person_key text not null check (length(person_key) between 1 and 200),
  position integer not null default 0,
  pinned_at timestamptz not null default now(),
  primary key (teacher_id, person_key)
);
alter table public.teacher_pinned_students enable row level security;
revoke all on public.teacher_pinned_students from anon;
grant select, insert, update, delete on public.teacher_pinned_students to authenticated;

create policy pinned_own on public.teacher_pinned_students for all to authenticated
using (teacher_id = (select auth.uid()))
with check (teacher_id = (select auth.uid()));

do $$ begin
  if not exists(select 1 from pg_policy where polrelid='public.teacher_pinned_students'::regclass and polname='mfa_required') then
    create policy mfa_required on public.teacher_pinned_students as restrictive for all to authenticated
    using ((select public.mfa_ok())) with check ((select public.mfa_ok()));
  end if;
end $$;

-- Новый порядок закреплённых одним вызовом. Меняет только position у своих
-- строк; ключи, которых нет среди закреплённых, игнорируются (ничего не создаёт
-- и не удаляет).
create or replace function public.reorder_pinned_students(p_keys text[])
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Нужно войти в кабинет'; end if;
  update public.teacher_pinned_students p
     set position = k.ord - 1
    from unnest(p_keys) with ordinality as k(key, ord)
   where p.teacher_id = auth.uid() and p.person_key = k.key and p.position <> k.ord - 1;
end;
$$;
revoke all on function public.reorder_pinned_students(text[]) from public, anon;
grant execute on function public.reorder_pinned_students(text[]) to authenticated;
