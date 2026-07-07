-- 0038_student_claim_rpc.sql — КРИТИЧНО: клейм ученика через SECURITY DEFINER RPC.
--
-- Предыстория: регистрация ученика (JoinPage) делала прямой UPDATE students по
-- invite_token. Это работало ТОЛЬКО через анонимную политику
-- anon_register_by_invite_token (USING invite_token IS NOT NULL AND email IS NULL,
-- CHECK true), которую 0034 удалила как дыру — аноним мог одним запросом захватить
-- ВСЕ неактивированные инвайты (политика не привязывала UPDATE к конкретному
-- токену). После её удаления прямой клейм перестал работать, а оставшаяся
-- authenticated-политика student_claim_invited имеет тот же дефект (любой
-- залогиненный может PATCH-нуть все pending-инвайты).
--
-- Решение: единый definer-RPC. Токен и креды уходят на сервер, RLS UPDATE-политика
-- на клейм больше не нужна. RPC привязывает auth_user_id к auth.uid() вызывающего
-- (только что прошёл signUp), поэтому чужой аккаунт подставить нельзя, и трогает
-- лишь строку своего токена + сиблинг-карточки того же person_id.

create or replace function public.claim_student_account(
  p_token uuid, p_email text, p_password text
)
returns table(student_id uuid, group_id uuid)
language plpgsql security definer
set search_path to 'public'
as $$
declare
  me uuid := auth.uid();
  v_self public.students%rowtype;
  r record;
begin
  if me is null then raise exception 'not authenticated'; end if;

  select * into v_self from public.students s where s.invite_token = p_token;
  if v_self.id is null then raise exception 'invalid invite token'; end if;
  -- Уже занят другим аккаунтом — блок; свой же токен → идемпотентный повтор.
  if v_self.auth_user_id is not null and v_self.auth_user_id <> me then
    raise exception 'invite already used';
  end if;

  update public.students s
     set email = p_email, temp_password = p_password, auth_user_id = me
   where s.id = v_self.id;

  begin perform public.seed_student_progress(v_self.id, v_self.group_id);
  exception when others then null; end;

  -- Сиблинг-карточки одного человека (person_id) → один логин на все предметы.
  -- Алиасы обязательны: OUT-параметр group_id иначе конфликтует с колонкой.
  if v_self.person_id is not null then
    for r in
      select s.id as sid, s.group_id as gid from public.students s
      where s.person_id = v_self.person_id and s.id <> v_self.id and s.auth_user_id is null
    loop
      update public.students s
         set auth_user_id = me, email = p_email, temp_password = p_password
       where s.id = r.sid;
      begin perform public.seed_student_progress(r.sid, r.gid);
      exception when others then null; end;
    end loop;
  end if;

  student_id := v_self.id;
  group_id := v_self.group_id;
  return next;
end;
$$;
revoke execute on function public.claim_student_account(uuid, text, text) from public, anon;
grant execute on function public.claim_student_account(uuid, text, text) to authenticated;

-- Прямой UPDATE-клейм больше не нужен и небезопасен (позволяет захватить любой
-- pending-инвайт через сырой API). Весь клейм идёт через claim_student_account.
drop policy if exists student_claim_invited on public.students;

-- claim_sibling_cards (0034) поглощён новым RPC — оставляем как no-op-совместимость
-- на случай старых кэшей клиента, но JoinPage больше его не зовёт.
