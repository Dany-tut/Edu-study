# Locked-snapshot proposal — local acceptance

This proposal is **not a migration and has not been applied to production**. Default fast-path availability is controlled separately by the release owner. `proposed-snapshot-save.sql` retains the same invoker signature, ownership check, course/lesson locks, CAS, RLS/MFA, whitelisted fields, current access function and preservation/history triggers.

What changes locally:

- Read and lock the complete owned lesson roster once; derive the source stamp and all stable IDs from that server snapshot.
- Read and lock the owned module roster once. Compute field changes and removals against it in JSON, without selecting global tables again for each lesson.
- Skip unchanged module/lesson mutation statements entirely. Write only changed/new rows; check affected counts. A new UUID/ref uses strict INSERT, so a collision with any other course fails rather than rebinding it.
- Advance the course stamp for every structural/content change; a true whole-content no-op may retain its stamp. Generate the final lesson UUID list and stamp from the locked snapshot plus authoritative write RETURNING rows, including legacy NULL-reference rows and module-FK timestamp updates.
- Skip the access merge only when the locked course has exactly empty student/group arrays, the explicit intent objects are empty, and an authoritative enrollment read is also empty. Otherwise call the original access function unchanged.

The projection contains only fields owned by course content saving. Optional absent `chapter_variants` preserves the saved value; explicit null/empty still reaches the existing preservation guard. Missing required payload fields are rejected. Course ownership, audience arrays, generated columns, visibility and progress cannot enter row writes through arbitrary JSON keys.

Command:

```sh
ATOMIC_LOCAL_PROPOSAL=snapshot node qa/course-atomic-save/database.mjs
```

PASS on actual proposal SQL in PGlite with the actual existing access function and nonempty-content trigger:

- Original ownership/MFA/anon, missing/stale stamp and old-client invalidation matrix.
- 80 populated lessons: inserts, dense updates, exact no-ops, deletions, stable UUIDs, preserved progress/visibility and absent chapter variants.
- Error on the final row of a dense update rolls back prior changes and history.
- True whole-content no-op leaves course and lesson stamps unchanged.
- One changed lesson among 79 surviving lessons creates exactly one lesson history record; the other 78 stamps remain unchanged.
- Duplicate UUIDs, including case variants, fail; a complete foreign-module binding and a foreign lesson-ref collision fail with full rollback.
- Required payload field omission fails before writes.
- An orphan enrollment prevents the no-op access branch; explicit grant/mode/revoke follows the original access merge.
- Legacy NULL-ref lessons survive as before. Removing their module sets its FK to NULL; the returned stamp exactly matches the independent actual DB maximum.

This is local logic/SQL acceptance, not actual production RLS performance. The release owner will separately run a temporary invoker clone inside ROLLBACK for authenticated cold profiling and adverse cases. No claim of ~1-second browser save follows from these tests.
