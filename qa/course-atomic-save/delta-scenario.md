# Controlled delta save acceptance

- Scope: existing isolated QA draft 00e3a0efbf / d3a1201a-1caf-47ce-9c17-7c980e151fcf only. 4 modules, 80 lessons, 1057 tasks, ~600KB content; no assigned groups/students/enrollments. Other courses retain the stable path.
- Owner: course-save-fast integration. Base SHA 0d98033b07227e6dc945db52f615351b6384f026 plus this uncommitted patch; final exact SHA and external frozen SQL hashes recorded before release.
- Risk: whole-source promotion after a partial ACK could erase unhydrated fields, unknown JSON siblings, or concurrent module edits. Never adopt a fresh server stamp to certify stale content.
- Environment: pure helpers + actual-source React/dispatch fixtures (mock transport/auth) first; pg_temp INVOKER with actual production RLS and full transaction rollback next; then explicit QA-only browser flag and native Edge on production.
- Platform scope: fixtures verify common logic; browser acceptance planned on desktop Edge. iPhone/iPad/Android physical-device testing is NOT claimed. No new layout/scroll surfaces.

| Action | Expected result | Evidence/status |
|---|---|---|
| Passive metadata/heavy load | No edit revision, no automatic full save; pristine immutable 80-row baseline | hydration-effects.mjs PASS |
| Edit during metadata/heavy | Keep teacher input; exactly one save after heavy readiness; baseline excludes edit | hydration-effects.mjs PASS |
| Mixed versions/auth change/recovered draft | Optimization baseline rejected, no fresh stamp adoption | confirmed-baseline/hydration effects PASS |
| Description/title scalar | Tiny typed delta, CAS and complete module witness checked in same transaction | pure32 + actual dispatch PASS; actual RLS PASS; HTTP pending |
| Unsupported task/theory/material edit | Choose guarded complete save BEFORE dispatch; preserve untouched raw fields | preservation/helper/dispatch PASS; actual RLS PASS; HTTP pending |
| Explicit deletion | Delete only listed UUID/ref; absence of patch does not imply deletion | local SQL matrices + pure helper PASS; HTTP not yet tested |
| A active, B edited before ACK | ACK promotes immutable A source, B stays dirty; queued B uses A's ACK | actual dispatch/restore effects PASS; new HTTP pending |
| Conflict/failure/invalid ACK | No automatic alternate engine; retain draft and honest status | actual dispatch/restore effects PASS; new HTTP pending |
| Unknown module insert/rename | Reject even if course/lesson MAX stamp unchanged, including before full fallback | local frozen SQL matrix PASS; actual RLS PASS |
| Source lost/reviewed conflict | Select existing stable full engine before dispatch; subsequent edits remain available; no typed promotion from6arg ACK | actual client harness PASS |
| Reopen/readback | Exact expected marker and lesson title; all untouched content/tasks/IDs/modules unchanged | pending production release |

Timing: request start to final ACK, excluding typing/debounce/CUA focus delay. Report first and subsequent changing requests, exact version, request bytes and scope. No-op timings separate. SQL duration is not browser latency; HTTP minus inside-function duration is not pure network time.

Actual-RLS rollback proof PASS: metadata377.352ms, title699.255ms, guardedFULL1006.782ms; all7 cases PASS, complete data/history502 unchanged, temporary objects removed. Applied QA-only migration20261122120508; INVOKER/empty search_path/anonymous denied verified. Remaining before release: final typecheck/release checks, exact-SHA CI and four production manifests; then real HTTP acceptance. No general rollout or ~1-second claim on fixture evidence. Loss of the matched source uses the existing stable path; a fresh matched load is needed to regain delta eligibility. This keeps saving available but does not promise acceleration after a reviewed conflict or legacy restored source. In the controlled delta lane a single-row chapter ACK never advances whole-course provenance: subsequent whole-save requires CAS conflict/review. Atomic chapter-CAS is a prerequisite for broader rollout; legacy default chapter behavior was not changed.
