-- 0034_security_stage0.sql — Этап 0 перед бетой: закрыть анонимные дыры записи.
-- Контекст: 26 из 28 учеников — legacy (anon-сессии без Supabase Auth), поэтому
-- анонимные политики нельзя просто удалить — их сужаем до legacy-строк через
-- security definer хелпер. По мере миграции учеников на Auth (этап 2) анонимная
-- поверхность схлопывается сама.

-- Хелпер: ученик ещё не привязан к Supabase Auth (RLS students закрыт для anon,
-- поэтому проверка — через definer).
create or replace function public.is_legacy_student(p_student uuid)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.students s
    where s.id = p_student and s.auth_user_id is null
  );
$$;
revoke execute on function public.is_legacy_student(uuid) from public;
grant execute on function public.is_legacy_student(uuid) to anon, authenticated;

-- ── 1. students: аноним больше не апдейтит карточки ──────────────────────────
-- Клейм приглашения работает через authenticated-политику student_claim_invited
-- (0024): JoinPage делает UPDATE уже с сессией (signUp возвращает её сразу).
drop policy if exists anon_register_by_invite_token on public.students;

-- Сиблинг-линковка карточек одного person сломалась после ужесточения чтения
-- (0026/0027): клиентский цикл в JoinPage не видит чужие строки person_id.
-- Серверная замена: линкует все карточки персоны на аккаунт вызывающего, но
-- только если строка с токеном уже принадлежит ему (то есть клейм состоялся).
create or replace function public.claim_sibling_cards(p_token uuid, p_email text, p_password text)
returns integer
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_self public.students%rowtype;
  v_cnt integer := 0;
  r record;
begin
  select * into v_self from public.students where invite_token = p_token;
  if v_self.id is null or v_self.auth_user_id is distinct from auth.uid() then
    return 0; -- токен не вызывающего / клейм ещё не сделан
  end if;
  if v_self.person_id is null then return 0; end if;
  for r in
    select id, group_id from public.students
    where person_id = v_self.person_id and id <> v_self.id and auth_user_id is null
  loop
    update public.students
       set auth_user_id = auth.uid(), email = p_email, temp_password = p_password
     where id = r.id;
    begin
      perform public.seed_student_progress(r.id, r.group_id);
    exception when others then null; -- сид не должен рушить линковку
    end;
    v_cnt := v_cnt + 1;
  end loop;
  return v_cnt;
end;
$$;
revoke execute on function public.claim_sibling_cards(uuid, text, text) from public, anon;
grant execute on function public.claim_sibling_cards(uuid, text, text) to authenticated;

-- ── 2. lesson_attendance: журнал пишет только учитель-владелец (или админ) ───
drop policy if exists allow_all on public.lesson_attendance;
create policy attendance_owner_all on public.lesson_attendance
  for all to authenticated
  using (public.is_admin()
    or exists (select 1 from public.groups g
               where g.id = lesson_attendance.group_id and g.created_by = auth.uid())
    or exists (select 1 from public.students s join public.groups g on g.id = s.group_id
               where s.id = lesson_attendance.student_id and g.created_by = auth.uid()))
  with check (public.is_admin()
    or exists (select 1 from public.groups g
               where g.id = lesson_attendance.group_id and g.created_by = auth.uid())
    or exists (select 1 from public.students s join public.groups g on g.id = s.group_id
               where s.id = lesson_attendance.student_id and g.created_by = auth.uid()));

-- ── 3. custom_diag_tests: читают все (анонимная диагностика), пишут учителя ──
drop policy if exists auth_insert on public.custom_diag_tests;
drop policy if exists auth_update on public.custom_diag_tests;
drop policy if exists auth_delete on public.custom_diag_tests;
create policy cdt_auth_insert on public.custom_diag_tests for insert to authenticated with check (true);
create policy cdt_auth_update on public.custom_diag_tests for update to authenticated using (true) with check (true);
create policy cdt_auth_delete on public.custom_diag_tests for delete to authenticated using (true);

-- ── 4. diag_results: аноним сдаёт (insert) и читает; правки/удаление — учителя ─
drop policy if exists diag_results_update on public.diag_results;
drop policy if exists diag_results_delete on public.diag_results;
create policy diag_results_update on public.diag_results for update to authenticated using (true) with check (true);
create policy diag_results_delete on public.diag_results for delete to authenticated using (true);

-- ── 5. payments: финансы видит и пишет только владелец (или админ) ────────────
drop policy if exists anon_read_payments on public.payments;
drop policy if exists payments_read on public.payments;
drop policy if exists payments_insert on public.payments;
create policy payments_read on public.payments for select to authenticated
  using (public.is_admin() or teacher_id = auth.uid());
create policy payments_insert on public.payments for insert to authenticated
  with check (public.is_admin() or teacher_id = auth.uid());

-- ── 6. lesson_progress: anon — только строки legacy-учеников; auth — свои ─────
drop policy if exists anon_insert_lp on public.lesson_progress;
drop policy if exists anon_update_lp on public.lesson_progress;
drop policy if exists anon_select_lp on public.lesson_progress;
create policy anon_insert_lp on public.lesson_progress for insert to anon
  with check (public.is_legacy_student(student_id));
create policy anon_update_lp on public.lesson_progress for update to anon
  using (public.is_legacy_student(student_id))
  with check (public.is_legacy_student(student_id));
create policy anon_select_lp on public.lesson_progress for select to anon
  using (public.is_legacy_student(student_id));

drop policy if exists auth_insert_lp on public.lesson_progress;
drop policy if exists auth_update_lp on public.lesson_progress;
drop policy if exists auth_select_lp on public.lesson_progress;
create policy auth_select_lp on public.lesson_progress for select to authenticated
  using (public.is_admin()
    or exists (select 1 from public.students s
               where s.id = lesson_progress.student_id
                 and (s.auth_user_id = auth.uid()
                      or exists (select 1 from public.groups g
                                 where g.id = s.group_id and g.created_by = auth.uid()))));
create policy auth_insert_lp on public.lesson_progress for insert to authenticated
  with check (public.is_admin()
    or exists (select 1 from public.students s
               where s.id = lesson_progress.student_id
                 and (s.auth_user_id = auth.uid()
                      or exists (select 1 from public.groups g
                                 where g.id = s.group_id and g.created_by = auth.uid()))));
create policy auth_update_lp on public.lesson_progress for update to authenticated
  using (public.is_admin()
    or exists (select 1 from public.students s
               where s.id = lesson_progress.student_id
                 and (s.auth_user_id = auth.uid()
                      or exists (select 1 from public.groups g
                                 where g.id = s.group_id and g.created_by = auth.uid()))))
  with check (public.is_admin()
    or exists (select 1 from public.students s
               where s.id = lesson_progress.student_id
                 and (s.auth_user_id = auth.uid()
                      or exists (select 1 from public.groups g
                                 where g.id = s.group_id and g.created_by = auth.uid()))));

-- ── 7. notifications: anon — только legacy-получатели; auth — свои ────────────
drop policy if exists notif_select_anon on public.notifications;
drop policy if exists notif_update_anon on public.notifications;
create policy notif_select_anon on public.notifications for select to anon
  using (recipient_role = 'student' and public.is_legacy_student(recipient_id));
create policy notif_update_anon on public.notifications for update to anon
  using (recipient_role = 'student' and public.is_legacy_student(recipient_id))
  with check (recipient_role = 'student' and public.is_legacy_student(recipient_id));

drop policy if exists notif_select_auth on public.notifications;
drop policy if exists notif_update_auth on public.notifications;
create policy notif_select_auth on public.notifications for select to authenticated
  using (public.is_admin() or recipient_id = auth.uid()
    or exists (select 1 from public.students s
               where s.id = notifications.recipient_id and s.auth_user_id = auth.uid()));
create policy notif_update_auth on public.notifications for update to authenticated
  using (public.is_admin() or recipient_id = auth.uid()
    or exists (select 1 from public.students s
               where s.id = notifications.recipient_id and s.auth_user_id = auth.uid()))
  with check (public.is_admin() or recipient_id = auth.uid()
    or exists (select 1 from public.students s
               where s.id = notifications.recipient_id and s.auth_user_id = auth.uid()));

-- ОСТАВЛЕНО НА ЭТАП 2 (сознательно): review_cards / confidence_log anon-записи
-- (student_id там text, смешан с anon_name — скоупить нечем до миграции на Auth).
