# Set-based save correction · 2026-11-22

Incident supplied by release owner: real production save of an isolated 80-lesson QA course on the first atomic RPC failed with PostgreSQL `57014` after 11,139 ms (09:24:57 UTC). Owner confirmed complete rollback: saved content hash and stamp unchanged, marker retained in the local draft. This is a failure, not a completed save timing.

Owner's read-only authenticated RLS plan for `SELECT id, short_id FROM lessons WHERE course_id=<QA UUID> ORDER BY id FOR UPDATE` reported Planning Time 157.742 ms, Execution Time 7.415 ms for 80 rows, more than 100 nested RLS InitPlans, JIT off. This identifies repeated planning as a plausible explanation for the per-lesson loop; it does not measure the replacement RPC.

New CLI-generated migration: `20261122092745_course_content_set_based_save.sql`. Same function signature and return contract. Only replacement: instead of one SELECT and one UPDATE per lesson, materialize the typed desired recordset once, run a bulk UPDATE with full distinct-field comparison and a bulk INSERT for absent refs. Presence of optional chapter variants is tracked independently from their value. Course lock, lesson locks, timestamp CAS, explicit write whitelist, owner/RLS/MFA, existing access function and preservation/history triggers remain active. No timeout, policy, security role, or client/editor changes.

Local actual SQL check applies the original migration followed by the replacement. The unchanged SQL guard matrix passes; populated fixture raised to 80 lessons (3 modules, 5 homework tasks each, about 960KB of synthetic theory text). Covers insert, exact no-op preserving stamps/history, dense update retaining every UUID, failed final-row preservation check rolling back earlier writes/history, intentional removal, omitted chapter variants, old-client invalidation, ownership/anon/MFA, duplicate/foreign identities and access rejection rollback.

Run: `node qa/course-atomic-save/database.mjs` using the separately installed PGlite dependency documented in the main QA card.

Production application and real latency measurement belong to the release owner. No production writes or schema application performed by this implementation agent. Local SQL correctness does not establish ~1-second network save time. Assigned-course calendar/full-access operations remain separately documented limitations.

Production acceptance of set-based replacement also failed with57014 after9758ms at09:28:11.972Z. LocalSQL PASS did not prove real RLS runtime. Optimization disabled in production helper, preserving the proven legacy save path while actual planning diagnosis continues. Do not present either failed request as a successful-save duration.
