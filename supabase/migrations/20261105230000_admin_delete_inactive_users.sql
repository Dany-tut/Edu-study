-- Админка → «Пользователи → Все пользователи»: удалить строку и почистить
-- неактивных за N месяцев.
--
-- ЗАЧЕМ. В таблице «Все пользователи» копились строки «—» с ролью «Учитель»:
-- 05.11.2026 их было 90 (≈15 тыс. событий за 2–3 ноября). Это следы в
-- analytics_events от аккаунтов, которых больше нет: ни профиля, ни ученика.
-- Удалить такую строку можно только вместе с её событиями — другого «тела» у
-- неё нет. Плюс владельцу нужна кнопка «удалить неактивных 3/6 мес».
--
-- ТРИ ВИДА СТРОК.
-- • ghost   — нет ни profiles, ни students: удаляются только события.
-- • student — admin_student_delete (как в реестре учеников) + его события.
-- • teacher — admin_delete_teacher(…, false): данные и аккаунт + события.
--   Админов не трогаем никогда.
--
-- ОСТОРОЖНО С УЧЕНИКАМИ. «Ни разу не входил» не значит «не нужен»: многие
-- ученики живут только в журнале учителя и в приложение не заходят. Поэтому
-- сервер ничего не выбирает сам — админ отмечает строки галочками, а сервер
-- повторно проверяет, что каждая всё ещё неактивна (p_months), и пропускает
-- тех, кто успел зайти между показом списка и нажатием.
--
-- Неактивен = последнее событие (или, если событий нет, дата создания)
-- старше N месяцев. Свежесозданный ученик, который ещё не входил, сюда не
-- попадает.

create or replace function public.admin_inactive_candidates(p_months integer)
returns table(kind text, id uuid, name text, email text, detail text, last_seen timestamptz, events bigint)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_cutoff timestamptz := now() - make_interval(months => greatest(p_months, 1));
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  with acts as (
    select coalesce(ae.user_id, ae.student_id) as aid, max(ae.created_at) as last_at, count(*) as cnt
    from analytics_events ae
    where coalesce(ae.user_id, ae.student_id) is not null
    group by 1
  )
  -- Следы удалённых аккаунтов — всегда, независимо от срока.
  select 'ghost'::text, a.aid, '—'::text, null::text, null::text, a.last_at, a.cnt
  from acts a
  where not exists (select 1 from profiles p where p.id = a.aid)
    and not exists (select 1 from students s where s.id = a.aid)
  union all
  select 'student'::text, s.id, s.name, s.email,
         concat_ws(' · ', tp.name, g.name),
         a.last_at, coalesce(a.cnt, 0)
  from students s
  left join acts a on a.aid = s.id
  left join groups g on g.id = s.group_id
  left join profiles tp on tp.id = g.created_by
  where coalesce(a.last_at, s.created_at) < v_cutoff
  union all
  select 'teacher'::text, p.id, p.name, u.email::text,
         (select count(*) from groups g where g.created_by = p.id)::text || ' гр. · '
           || (select count(*) from students st join groups g on g.id = st.group_id where g.created_by = p.id)::text || ' уч.',
         a.last_at, coalesce(a.cnt, 0)
  from profiles p
  left join auth.users u on u.id = p.id
  left join acts a on a.aid = p.id
  where p.role = 'teacher'
    and p.id is distinct from auth.uid()
    and coalesce(a.last_at, p.created_at) < v_cutoff
  order by 1, 6 nulls first;
end $function$;

-- p_months = null — удаление одной строки по кнопке в таблице, без проверки
-- срока. Иначе каждая строка перепроверяется на неактивность.
create or replace function public.admin_delete_actors(p_ids uuid[], p_months integer default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_role text;
  v_last timestamptz;
  v_created timestamptz;
  v_cutoff timestamptz := case when p_months is null then null else now() - make_interval(months => greatest(p_months, 1)) end;
  v_ghosts int := 0; v_students int := 0; v_teachers int := 0; v_skipped int := 0;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;

  foreach v_id in array coalesce(p_ids, '{}') loop
    select max(created_at) into v_last from analytics_events where user_id = v_id or student_id = v_id;

    select role, created_at into v_role, v_created from profiles where id = v_id;
    if found then
      if v_role is distinct from 'teacher' or v_id = auth.uid()
         or (v_cutoff is not null and coalesce(v_last, v_created) >= v_cutoff) then
        v_skipped := v_skipped + 1; continue;
      end if;
      perform public.admin_delete_teacher(v_id, false);
      delete from analytics_events where user_id = v_id;
      v_teachers := v_teachers + 1;
      continue;
    end if;

    select created_at into v_created from students where id = v_id;
    if found then
      if v_cutoff is not null and coalesce(v_last, v_created) >= v_cutoff then
        v_skipped := v_skipped + 1; continue;
      end if;
      perform public.admin_student_delete(v_id);
      delete from analytics_events where student_id = v_id;
      v_students := v_students + 1;
      continue;
    end if;

    delete from analytics_events where user_id = v_id or student_id = v_id;
    v_ghosts := v_ghosts + 1;
  end loop;

  return jsonb_build_object('ghosts', v_ghosts, 'students', v_students, 'teachers', v_teachers, 'skipped', v_skipped);
end $function$;

revoke execute on function public.admin_inactive_candidates(integer) from public, anon;
revoke execute on function public.admin_delete_actors(uuid[], integer) from public, anon;
grant execute on function public.admin_inactive_candidates(integer) to authenticated;
grant execute on function public.admin_delete_actors(uuid[], integer) to authenticated;
