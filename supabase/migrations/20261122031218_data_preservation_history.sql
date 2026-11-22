-- Incident 2026-11-22: preserve OLD rows in the same transaction as every
-- product UPDATE/DELETE. Fail closed if archival fails. Not exposed by PostgREST.
create schema if not exists iskra_history;
revoke all on schema iskra_history from public, anon, authenticated, service_role;

create table iskra_history.row_versions (
  version_id bigint generated always as identity primary key,
  captured_at timestamptz not null default clock_timestamp(),
  transaction_id bigint not null default txid_current(),
  table_name text not null,
  row_id text,
  operation text not null check (operation in ('BASELINE','UPDATE','DELETE')),
  actor_id uuid,
  database_role text not null,
  old_row jsonb not null
);
create index row_versions_lookup on iskra_history.row_versions(table_name,row_id,version_id desc);
alter table iskra_history.row_versions enable row level security;
revoke all on all tables in schema iskra_history from public,anon,authenticated,service_role;
revoke all on all sequences in schema iskra_history from public,anon,authenticated,service_role;

create function iskra_history.capture_old_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare before_row jsonb := to_jsonb(old);
begin
  if tg_op = 'UPDATE' and before_row - 'updated_at' = to_jsonb(new) - 'updated_at' then
    return new;
  end if;
  insert into iskra_history.row_versions(table_name,row_id,operation,actor_id,database_role,old_row)
  values(tg_table_schema||'.'||tg_table_name, coalesce(before_row->>'id',before_row->>'short_id'),tg_op,
    auth.uid(),coalesce(nullif(current_setting('role',true),'none'),session_user),before_row);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function iskra_history.capture_old_row() from public,anon,authenticated,service_role;

-- TRUNCATE does not fire row triggers; reject it rather than bypassing history.
create function iskra_history.reject_truncate() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'ISKRA_DATA_PRESERVATION: TRUNCATE is prohibited on %.%. Use reviewed row operations with history.',tg_table_schema,tg_table_name;
end;
$$;
revoke all on function iskra_history.reject_truncate() from public,anon,authenticated,service_role;

-- Emergency guard for old clients which serialize not-loaded fields as empty.
-- Deliberate clearing requires a reviewed SQL transaction and explicit approval
-- reference in SET LOCAL iskra.approved_data_change = '<approval reference>'.
create function iskra_history.reject_empty_lesson_overwrite() returns trigger
language plpgsql set search_path = '' as $$
declare field text; before_row jsonb := to_jsonb(old); after_row jsonb := to_jsonb(new);
begin
  if nullif(current_setting('iskra.approved_data_change',true),'') is not null then
    return new;
  end if;
  foreach field in array array['youtube_url','description','timecodes','chapter_variants','content','materials','homework','test_tasks'] loop
    if before_row->field is not null and before_row->field not in ('null'::jsonb,'""'::jsonb,'{}'::jsonb,'[]'::jsonb)
      and (after_row->field is null or after_row->field in ('null'::jsonb,'""'::jsonb,'{}'::jsonb,'[]'::jsonb)) then
      raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: refusing to clear lessons.'||field||' without reviewed approval; reload the course.';
    end if;
  end loop;
  -- A nonempty JSON object must not hide deletion of nested user content.
  foreach field in array array['transcript','paragraphs','selfCheck','cardSetId','cardGroupId'] loop
    if old.content->field is not null and old.content->field not in ('null'::jsonb,'""'::jsonb,'{}'::jsonb,'[]'::jsonb)
      and (new.content->field is null or new.content->field in ('null'::jsonb,'""'::jsonb,'{}'::jsonb,'[]'::jsonb)) then
      raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: refusing to remove lesson content.'||field||' without reviewed approval.';
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function iskra_history.reject_empty_lesson_overwrite() from public,anon,authenticated,service_role;
create trigger lessons_preserve_nonempty before update on public.lessons
for each row execute function iskra_history.reject_empty_lesson_overwrite();

-- Product tables only: do not archive tokens, MFA secrets, telemetry or caches.
-- The baseline and trigger installation are one migration transaction, so no
-- committed write can fall between baseline capture and active row history.
do $$
declare target text;
begin
  foreach target in array array[
    'courses','course_modules','course_enrollments','course_shares','lessons',
    'schedule','schedule_lessons','lesson_attendance','lesson_progress',
    'teacher_lesson_sessions','lesson_recaps','lesson_teacher_notes',
    'groups','students','profiles','parent_contacts','parent_reports',
    'homework','homework_attempts','hw_ai_grades','hw_ai_corrections',
    'payments','payment_claims','payment_invoices','plans','teacher_tasks',
    'task_bank','custom_diag_tests','diag_questions','diag_results','diag_question_defaults',
    'test_assignments','trainers','trainer_questions','quiz_questions','widgets',
    'card_groups','card_sets','set_cards','review_cards','deck_stickers','desk_layouts',
    'feed_comments','feed_likes','feedback_items','feedback_topics','feedback_requests',
    'transcript_terms','transcript_term_votes','transcript_corrections',
    'curriculum','course_reactions','phrase_gaps','science_facts','science_memes',
    'teacher_modules','teacher_feature_prefs','reminder_settings','tg_messages','tg_threads'
  ] loop
    if to_regclass('public.'||target) is null then continue; end if;
    execute format('lock table public.%I in share row exclusive mode',target);
    execute format('insert into iskra_history.row_versions(table_name,row_id,operation,database_role,old_row) select %L,coalesce(to_jsonb(t)->>''id'',to_jsonb(t)->>''short_id''),''BASELINE'',session_user,to_jsonb(t) from public.%I t','public.'||target,target);
    execute format('create trigger iskra_preserve_row before update or delete on public.%I for each row execute function iskra_history.capture_old_row()',target);
    execute format('create trigger iskra_no_truncate before truncate on public.%I for each statement execute function iskra_history.reject_truncate()',target);
  end loop;
end;
$$;

-- History itself is append-only even for accidental privileged mutations.
create function iskra_history.reject_history_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin raise exception 'ISKRA_DATA_PRESERVATION: history is append-only'; end;
$$;
revoke all on function iskra_history.reject_history_mutation() from public,anon,authenticated,service_role;
create trigger history_append_only before update or delete on iskra_history.row_versions
for each row execute function iskra_history.reject_history_mutation();
create trigger history_no_truncate before truncate on iskra_history.row_versions
for each statement execute function iskra_history.reject_history_mutation();
