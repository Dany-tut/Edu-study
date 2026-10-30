# Independent students — analysis before implementation

The current students row is both a person card and an enrolment. `person_id`
links enrolments belonging to one human; existing lesson progress, invitations,
accounts and payments reference students.id and must retain those IDs.

Dependencies inspected: useGroups/useStudents/useAllStudents, teacher group and
student pages, mobile student roster, student session and JoinPage, person merging,
RLS migrations 0026/0034/0087–0089, plan trigger 0037, claim RPC 0038,
schedule ownership 0121, and password reset Edge Function.

Problems: ownership is inferred from groups; allStudents uses an inner join;
students tab only exposes individual groups; panel requires a group; plan counts
rows rather than people. Nullable group_id alone would make pupils invisible and
bypass quotas. A renamed button still creates an individual group.

Chosen model: add students.created_by, backfill from groups, allow group_id NULL.
No fabricated group for new students. Keep existing person_id and enrolment rows.
First assignment reuses the unattached row, preserving ID/token/progress; additional
assignments retain existing linked-row behavior. Explicit ownership covers RLS,
quotas, global roster, password reset, and direct schedule ownership.
All-student roster deduplicates by person_id, shows assignment labels and supports
existing group/individual assignment actions. Creation requires name only.

Migration is additive; do not infer that historical empty-subject individual groups
are unattached: some may represent intentional individual lessons.

Deployment: database migration must precede frontend and password-reset function.
Connected MCP exposes a different inactive project, not the app's configured project
igsdwvwiqnozgwczzycx; do not run SQL against that unrelated project.

## Verification and deployment status

- Migration executed in isolated PostgreSQL (PGlite), with real authenticated-role
  RLS checks: owner backfill, name-only creation, foreign owner invisibility, denied
  forged ownership, direct progress access, denied foreign-group assignment,
  preserved ID/token/person_id on first assignment, distinct-person quota and
  preservation of student rows after deleting their group. All passed.
- TypeScript check passed. Production Vite build passed.
- Additional call sites fixed: full student dashboard, login null-group session,
  homework submission queries, account provisioning, password reset, avatars.
- Frontend represents SQL NULL group_id as an empty string to preserve existing
  navigation/session contracts; queries and writes use real SQL NULL.
- Migration and Edge Functions have NOT been deployed to the configured app
  database. Apply the migration first, deploy provision-student-account and
  reset-student-password next, then deploy the frontend. Live integration and
  database advisories still require access to the configured Supabase project.

## UI and compatibility follow-up

Tab names now consistently select a list. Separate visible plus buttons create a
student/group, including on touch screens. The creation form starts with a labeled
name field, accepts Enter, and explicitly says lesson assignment can happen later.
Individual assignment actions use “Назначить занятия” instead of card terminology.

Compatibility tests also cover existing administrative moves and group-owner
transfers. A group ownership trigger synchronizes students.created_by so older
transfer RPCs keep working; teacher isolation remains enforced.

Re-run the isolated SQL regression suite without changing app dependencies:

```sh
npm install --prefix /tmp/independent-student-db @electric-sql/pglite@0.5.13 --no-package-lock --ignore-scripts
PGLITE_MODULE=file:///tmp/independent-student-db/node_modules/@electric-sql/pglite/dist/index.js node scripts/checkIndependentStudents.mjs
```

The fixture covers the tables/functions needed by this migration, not the full
production schema. Production-specific integration still requires a database copy.

## Production-copy verification (31 October 2026, Bangkok)

A real production snapshot was obtained through the authenticated Supabase CLI.
Schema/data backups are outside the repository in a private temporary directory.
A local Supabase stack restored public, private, auth and storage schemas, with
matching PostgreSQL extensions and Auth migration history.

The final migration was reapplied to a second fresh database restored from that
snapshot. Before/after checks covered 59 tables: 58 student rows, 26 groups,
34 Auth accounts, 1052 progress rows, 38 attendance rows and 18 payments.
All data fingerprints matched (students excludes the added owner and update
timestamp). Every student received an owner; owner/group mismatches: zero.

Real-schema checks found and fixed legacy notification routing through the primary
teacher and the group-only homework-photo access helper. Browser testing found
and fixed Russian-formatted group creation dates, incorrect new-student warning
filters, the regular-group deletion affordance in individual directions, and mobile
visibility of unassigned students. Mobile now supports name-only creation and
assignment from a student sheet.

Browser evidence: name-only desktop and mobile creation, one person in the roster
after group plus individual assignment, account registration before assignment,
and successful student browser login after assignment. REST checks verified
owner-only visibility, rejection of foreign-group assignment, distinct namesake
identities, correct notification ownership, and preserved account/student/person
IDs and invitation tokens.

The production migration was applied transactionally with before/after data guards
and registered in migration history. It left 58 students and 26 groups, with zero
missing owners. Frontend release is isolated from parallel icon/native changes.

Final browser follow-up: after authenticating a new student, normalize last-visit
dates to the roster format and treat missing academic activity as unknown rather
than a zero grade or missing homework. A new login no longer marks the pupil as
missing or overdue. The optional group picker explicitly shows “Пока без занятий”.
