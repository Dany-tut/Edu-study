-- API checking keeps the existing teacher-only RLS and final-review path.
alter table public.hw_ai_grades
  add column if not exists run_attempts integer not null default 0,
  add column if not exists next_retry_at timestamptz;
insert into public.app_flags(key,enabled,about) values
 ('ai_hw_api',true,'Проверка домашних работ через серверный Linali API; ключ только в Secrets Edge Functions.')
on conflict(key) do nothing;

create or replace function public.hw_ai_grade_request(p_progress_id uuid, p_retry boolean default false)
returns uuid language plpgsql security definer set search_path=public as $$
declare
 p public.lesson_progress%rowtype;
 g record;
 result_id uuid;
 hw_id uuid;
 base text;
 current_grade public.hw_ai_grades%rowtype;
begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 select lp.* into p from public.lesson_progress lp
 join public.students s on s.id=lp.student_id
 where lp.id=p_progress_id and s.created_by=auth.uid() for update of lp;
 if not found then raise insufficient_privilege; end if;
 if p.status <> 'submitted' then raise exception 'submission_not_pending'; end if;
 select gr.created_by,gr.id,
 case gr.subject when 'Химия' then 'chemistry' when 'Биология' then 'biology' end as subject,
 case gr.level when 'ЕГЭ' then 'ege' when 'ОГЭ' then 'oge' end as exam
 into g from public.students s join public.groups gr on gr.id=s.group_id
 where s.id=p.student_id and gr.created_by=auth.uid();
 if g.subject is null then raise exception 'unsupported_subject'; end if;
 select * into current_grade from public.hw_ai_grades where progress_id=p.id for update;
 if found then
   if not p_retry or current_grade.status not in ('error','skipped') then return current_grade.id; end if;
   if current_grade.updated_at > now()-interval '30 seconds' then raise exception 'cooldown'; end if;
   update public.hw_ai_grades set status='pending',claimed_at=null,error=null,result=null,
     score=null,primary_score=null,max_score=null,comment=null,run_attempts=0,next_retry_at=null,updated_at=now()
   where id=current_grade.id returning id into result_id;
   return result_id;
 end if;
 base:=regexp_replace(p.lesson_ref,'-hard$','');
 if base ~ '^hw-[0-9a-f-]{36}$' then hw_id:=substring(base from 4)::uuid;
 else select h.id into hw_id from public.homework h
   where h.group_id=g.id and h.lesson_id::text=base order by h.created_at desc limit 1;
 end if;
 insert into public.hw_ai_grades(progress_id,student_id,lesson_ref,homework_id,teacher_id,kind,subject,exam,status,submitted_at)
 values(p.id,p.student_id,p.lesson_ref,hw_id,auth.uid(),case when p.lesson_ref like '%-hard' then 'hard' else 'basic' end,g.subject,g.exam,'pending',p.updated_at)
 returning id into result_id;
 return result_id;
end; $$;
revoke all on function public.hw_ai_grade_request(uuid,boolean) from public,anon;
grant execute on function public.hw_ai_grade_request(uuid,boolean) to authenticated;

-- Lease invalidation is automatic on every new attempt, including legacy
-- callers; reset retry accounting in the same transaction as the queue reset.
create or replace function public.hw_ai_api_reset()
returns trigger language plpgsql set search_path=public as $$
begin
 if NEW.status='pending' and (TG_OP='INSERT' or OLD.submitted_at is distinct from NEW.submitted_at) then
  NEW.run_attempts:=0; NEW.next_retry_at:=null;
 end if;
 return NEW;
end; $$;
drop trigger if exists hw_ai_api_reset on public.hw_ai_grades;
create trigger hw_ai_api_reset before insert or update on public.hw_ai_grades for each row execute function public.hw_ai_api_reset();

create schema if not exists iskra_private;
revoke all on schema iskra_private from public,anon,authenticated;
create extension if not exists pg_net;
create extension if not exists pg_cron;
create extension if not exists supabase_vault;

create or replace function iskra_private.dispatch_homework_ai(p_id uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare target_url text; worker_secret text;
begin
 if not exists(select 1 from public.app_flags where key='ai_hw_api' and enabled) then return; end if;
 select decrypted_secret into target_url from vault.decrypted_secrets where name='iskra_hw_api_url' limit 1;
 select decrypted_secret into worker_secret from vault.decrypted_secrets where name='iskra_hw_api_secret' limit 1;
 if target_url is null or worker_secret is null then return; end if;
 perform net.http_post(url:=target_url,
   headers:=jsonb_build_object('Content-Type','application/json','x-hw-grade-secret',worker_secret),
   body:=jsonb_build_object('action','tick','id',p_id),timeout_milliseconds:=5000);
end; $$;
revoke all on function iskra_private.dispatch_homework_ai(uuid) from public,anon,authenticated;

create or replace function iskra_private.wake_homework_ai()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if NEW.status='pending' and (TG_OP='INSERT' or OLD.status is distinct from NEW.status or OLD.submitted_at is distinct from NEW.submitted_at) then
   perform iskra_private.dispatch_homework_ai(NEW.id);
 end if;
 return null;
end; $$;
revoke all on function iskra_private.wake_homework_ai() from public,anon,authenticated;
drop trigger if exists wake_homework_ai on public.hw_ai_grades;
create trigger wake_homework_ai after insert or update on public.hw_ai_grades for each row execute function iskra_private.wake_homework_ai();

select cron.schedule('iskra-homework-ai','* * * * *',
 $job$select iskra_private.dispatch_homework_ai() where exists(
 select 1 from public.hw_ai_grades where status='pending'
 or (status='error' and next_retry_at<=now())
 or (status='working' and claimed_at<now()-interval '5 minutes'));$job$);

-- Include homework attached to a course lesson as well as standalone hw-* refs.
create or replace function public.hw_ai_grade_track()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g record;
  hw uuid;
  base text;
  hard boolean;
begin
  -- Работа ушла из submitted (учитель проверил): незавершённая предоценка
  -- больше не нужна.
  if TG_OP = 'UPDATE' and OLD.status = 'submitted' and NEW.status <> 'submitted' then
    update hw_ai_grades
       set status = case status when 'graded' then 'dismissed' else 'skipped' end,
           updated_at = now()
     where progress_id = NEW.id
       and status in ('pending', 'working', 'graded', 'error');
    return null;
  end if;

  hard := NEW.lesson_ref like '%-hard';
  if NEW.status <> 'submitted' then
    return null;
  end if;
  -- Та же сдача без изменений (повторная запись статуса) — очередь не трогаем.
  if TG_OP = 'UPDATE' and OLD.status = 'submitted'
     and OLD.attachments is not distinct from NEW.attachments
     and OLD.comment is not distinct from NEW.comment then
    return null;
  end if;
  if not exists (select 1 from app_flags where key = 'ai_hw_grade' and enabled) then
    return null;
  end if;

  -- Предмет и учитель — по группе ученика; домашка (условия, эталоны) —
  -- по ключу `hw-<id>` или по уроку, к которому она привязана.
  select gr.created_by, gr.id as group_id,
         case gr.subject when 'Химия' then 'chemistry' when 'Биология' then 'biology' end as subj,
         case gr.level   when 'ЕГЭ'   then 'ege'       when 'ОГЭ'      then 'oge'     end as exam
    into g
    from students s join groups gr on gr.id = s.group_id
   where s.id = NEW.student_id;
  if g.subj is null then
    return null;  -- не ХимБио
  end if;

  base := case when hard then left(NEW.lesson_ref, length(NEW.lesson_ref) - 5) else NEW.lesson_ref end;
  if base ~ '^hw-[0-9a-f-]{36}$' then
    hw := substring(base from 4)::uuid;
  else
    select h.id into hw from homework h
     where h.lesson_id::text = base and h.group_id = g.group_id
     order by h.created_at desc limit 1;
  end if;
  if not hard and not exists (select 1 from homework where id = hw) then
    return null;
  end if;

  insert into hw_ai_grades (progress_id, student_id, lesson_ref, homework_id, teacher_id,
                            kind, subject, exam, status, submitted_at)
  values (NEW.id, NEW.student_id, NEW.lesson_ref, hw, g.created_by,
          case when hard then 'hard' else 'basic' end, g.subj, g.exam,
          'pending', coalesce(NEW.updated_at, now()))
  on conflict (progress_id) do update
     set status = 'pending', submitted_at = excluded.submitted_at, kind = excluded.kind,
         homework_id = excluded.homework_id,
         subject = excluded.subject, exam = excluded.exam, teacher_id = excluded.teacher_id,
         claimed_at = null, result = null, primary_score = null, max_score = null,
         score = null, comment = null, model = null, graded_at = null, error = null,
         final_score = null, confirmed_by = null, confirmed_at = null, updated_at = now();
  return null;
end; $$;
