# Course scope planning acceptance

This candidate changes only four existing SELECT-policy expressions:
`unnest(my_course_ids())` → `unnest((SELECT public.my_course_ids())::uuid[])`.
The original zero-argument STABLE helper, its SECURITY DEFINER owner/search_path/ACL,
all policy commands/roles/permissiveness, all other USING branches, restrictive
MFA/staff/visibility policies, and every WITH CHECK remain unchanged.

Supabase documents the scalar-SELECT InitPlan pattern for row-independent functions:
https://supabase.com/docs/guides/database/postgres/row-level-security
Postgres17 STABLE functions use a statement snapshot:
https://www.postgresql.org/docs/17/xfunc-volatility.html
No cross-request permission cache, client authority GUC or new definer bypass is introduced.

## Reproduction and evidence

`node qa/course-scope-initplan/policy-equivalence.mjs`
uses existing optional PGlite0.5.17 QA dependency at
`/tmp/iskra-visibility-test-deps/node_modules/@electric-sql/pglite/dist/index.js`;
set PGLITE_MODULE to another installed module path. It does not contact production.
Its JSON report goes to `/tmp/iskra-course-scope-policy-equivalence-results.json`
(or ISKRA_SCOPE_QA_RESULT), outside the checkout.

The manifest contains exact live helper definitions and35policy attributes for the
four target tables and direct share/visibility dependencies. The local fixture
checks17synthetic actors ×306 SELECT/write-policy outcomes: owners, shares, taught
groups, enrolled/direct/group students, foreign/empty/null/duplicate scope, admin,
anon and MFA failure/success. Original helper properties/body and all policy
metadata except the four qualifications must match. Local instrumentation alone
counts planner evaluations14→1 (one unchanged auxiliary visibility policy remains),
non-admin runtime calls2→2, admin0→0, and rechecks actor/scope on each statement,
including actor switch in the same prepared plan. These are not HTTP timings.

Actual production READ-ONLY isolated-predicate EXPLAIN controls on our QA rows
returned identical sets0/4/1/80. Original→wrapped planning ms:
enrollments50.653→1.848, modules14.755→0.333, courses11.027→0.555,
lessons13.891→0.534. These isolate expressions, not the whole live policy or HTTP.
No live policy was changed for those controls; no real JWT/session values were read.

## Rollout scenario

Before backend apply: local equivalence, exact migration guard (original policy
qualifications/helper definition+ACL+STABLE), fresh remote migration history,
release:check and exact-SHA CI. Migration takes a bounded2s lock wait and8s statement
budget. No force or RLS disabling. After apply, compare all captured policy/helper
metadata: only four qualifications may differ. Advisors, actual restricted80QA
metadata/title/restore, xmin/history write counts and full data readback follow.
Both production domains must confirm the same full SHA before browser acceptance.

Baseline actual3552: metadata HTTP1.821s/server1.518s; inventory/CAS588ms and module
snapshot687ms dominate. Title HTTP3.472s/server3.147s additionally targetREAD506ms
and lessonUPDATE1172ms. JIT off/plan-cache auto are observed, not changed. Target~1s
and any claim about ordinary assigned/published courses remain unproved until actual
post-change HTTP tests. A selective-write probe is still QA-only; faster common
policy planning does not by itself enable that path for working courses.

Previous controlled80QA proves actual FULL fallback/conflict/reload/review and
latest-draft safety. After fresh metadata edit, xmin/timestamps show0lesson updates;
a title edit touches exactly1lesson version/history row and leaves79versions and
all4module versions unchanged. Physical-mobile acceptance is not claimed.

A separate inner-helper InitPlan experiment passed equivalence but showed no
reliable live speed gain; it is deliberately not part of this change.
