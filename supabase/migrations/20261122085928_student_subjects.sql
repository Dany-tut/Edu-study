-- Multiple subjects belong to one student row; selecting them does not enrol
-- the student in groups/courses or create individual lesson cards.
-- Additive: scalar subject remains usable by earlier web/native clients.
alter table public.students add column if not exists subjects text[] not null default '{}';

create or replace function public.sync_student_subjects()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
declare
  picked text[];
begin
  if tg_op = 'INSERT' then
    picked := case when cardinality(new.subjects) > 0 then new.subjects else array[new.subject] end;
  elsif new.subjects is distinct from old.subjects then
    picked := new.subjects;
  elsif new.subject is distinct from old.subject then
    -- A scalar edit from an old client changes only the first choice and
    -- preserves all other choices made by a newer client.
    picked := array[new.subject] || coalesce(old.subjects[2:cardinality(old.subjects)], '{}');
  else
    picked := new.subjects;
  end if;

  select coalesce(array_agg(item order by first_position), '{}') into new.subjects
  from (
    select (array_agg(btrim(value) order by position))[1] as item, min(position) as first_position
    from unnest(picked) with ordinality as p(value, position)
    where nullif(btrim(value), '') is not null
    group by lower(btrim(value))
  ) canonical;
  new.subject := new.subjects[1];
  return new;
end;
$$;

drop trigger if exists students_sync_subjects on public.students;
create trigger students_sync_subjects before insert or update of subject, subjects
on public.students for each row execute function public.sync_student_subjects();

-- Existing records, IDs, invitations and ownership stay intact.
update public.students set subjects = array[subject]
where cardinality(subjects) = 0 and nullif(btrim(subject), '') is not null;

comment on column public.students.subjects is
  'Selected subject names, independent of group enrolments/course access. subject mirrors the first entry for legacy clients.';
