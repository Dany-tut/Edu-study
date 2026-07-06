-- 0031_student_person_id
-- First-class person identity across a teacher's student rows.
--
-- Until now "the same human" was inferred by matching students.name within one
-- teacher (resolveSiblingStudentIds / personKey / siblingCards). That is fragile:
-- two same-named students collide, a rename breaks the link, and a group row and
-- its 1:1 cards weren't reliably tied together. `person_id` makes identity explicit.
--
-- Additive + nullable-with-default → non-breaking: existing name-based paths keep
-- working as a fallback; new rows get a person_id automatically, and the app copies
-- the source person's id when a card/enrolment reuses an existing human.

alter table students add column if not exists person_id uuid;

-- Backfill: one person per (owner, identity), where identity is the person's auth
-- account if any row for that (owner, name) is registered, else the lowercased name.
-- Folding auth into the (owner,name) group unifies a pre-registration name-keyed
-- card with the later registered row of the same person.
with keyed as (
  select
    s.id,
    g.created_by::text || '|' || coalesce(
      (select max(s2.auth_user_id::text)
         from students s2
         join groups g2 on g2.id = s2.group_id
        where g2.created_by = g.created_by
          and lower(trim(s2.name)) = lower(trim(s.name))),
      'n:' || lower(trim(s.name))
    ) as pkey
  from students s
  join groups g on g.id = s.group_id
),
persons as (
  select pkey, gen_random_uuid() as pid from keyed group by pkey
)
update students s
set person_id = p.pid
from keyed k
join persons p on p.pkey = k.pkey
where s.id = k.id
  and s.person_id is null;

-- New rows default to a fresh person; the app overrides this when linking to an
-- existing human (addIndividualCard / addExistingStudentToGroup / multi-track).
alter table students alter column person_id set default gen_random_uuid();

create index if not exists students_person_id_idx on students(person_id);
