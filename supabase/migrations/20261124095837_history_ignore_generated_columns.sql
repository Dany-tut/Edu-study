-- История версий (capture_old_row): вычисляемые столбцы в NEW триггера
-- BEFORE ещё пусты, поэтому сравнение «изменилась ли строка» у lessons
-- (has_hard, journal_homework_summary) всегда видело разницу, и любое пустое
-- сохранение урока писало в row_versions полную копию строки (до 1,4 МБ на
-- урок). Теперь вычисляемые столбцы исключаются из сравнения — они целиком
-- выводятся из остальных, которые сравниваются по-прежнему. Настоящие
-- изменения пишутся как раньше (проверено: заголовок, домашка, другие
-- таблицы). Пустое сохранение курса на 301 урок: 3,4 с → 0,5 с.
-- Откат: ~/.codex/iskra-backups/*-preserve-fastpath/rollback.sql
create or replace function iskra_history.generated_columns(p_table regclass) returns text[] language sql stable set search_path to '' as $$
  select coalesce(array_agg(a.attname::text), '{}'::text[]) from pg_catalog.pg_attribute a
  where a.attrelid = p_table and a.attgenerated = 's' and not a.attisdropped;
$$;
CREATE OR REPLACE FUNCTION iskra_history.capture_old_row() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
declare before_row jsonb := to_jsonb(old); skip text[];
begin
  if tg_op = 'UPDATE' then
    -- Вычисляемые столбцы в NEW триггера BEFORE ещё не посчитаны (пусты) и
    -- целиком выводятся из остальных — сравниваем без них.
    skip := array['updated_at'] || iskra_history.generated_columns(tg_relid);
    if before_row - skip = to_jsonb(new) - skip then
      return new;
    end if;
  end if;
  insert into iskra_history.row_versions(table_name,row_id,operation,actor_id,database_role,old_row)
  values(tg_table_schema||'.'||tg_table_name, coalesce(before_row->>'id',before_row->>'short_id'),tg_op,
    auth.uid(),coalesce(nullif(current_setting('role',true),'none'),session_user),before_row);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;
