# Ordinary content-only delta acceptance

Base: 98866de9574aacf6d120671381f3005e02bac1d0 /3555. Candidate SHA is frozen by the release commit, before actual HTTP testing. Root owns implementation and verification. No layout or platform styling changes.

Scope: existing owned draft/published courses with a matched pristine network baseline and stable UUID/ref identities. Whitelist: course title/description/level/color/bg and existing lesson.description. Any other canonical change, explicit access intent, roster/structure/calendar/publication change chooses the existing path BEFORE dispatch. No fallback after an attempted delta. Content-only ACK never reconciles access/schedule or processes a later publication click.

Local evidence: ordinary-delta.mjs20 classification cases; client.mjs executes actual editor dispatch including immutableA/newB, late publication pending intent, malformedACK/conflict/no retry; actual hydration and restore effects retain provenance protections. SQL fixture11 cases uses80 rich lessons/current35 policies and abort-on-mutation statement triggers for audience/progress/calendar/visibility.

Actual-RLS rollback evidence on isolated QA00e3a0efbf:6/6 checks passed under synthetic ownerAAL2 with EMPTY app_metadata. Metadata SQL91.261ms, lesson.description117.329ms are SQL-only, not browser timings. CAS/module/status/foreign rejection passed; data/history fingerprints unchanged after rollback (523 history rows,80lessons,4modules), all temporary objects removed. No production student/audience rows fabricated; assigned/published semantics are local fixture coverage only so far.

## Before live UI acceptance

Native Edge desktop on isolated QA80 via ordinary URL WITHOUT either QA flag. No working course edits. Capture row versions and content/access/progress/schedule/visibility fingerprints before each real unique edit. Expected metadata0lessonwrites, single lesson.description1target/79untouched/modules0. Verify DB marker and re-opened values, then restore original lesson.description. Record exact RPC/version/HTTP duration/payload bytes separately from debounce and CUA time. Exercise real conflict/error/lateACK separately before broad acceptance. UI Saved alone is insufficient.

Pending live: exact release SHA/4manifests, metadata and lesson.description timings/readback/reopen/writecounts; ordinary error/lateACK/retry. Mobile/iPhone/iPad/Android physical acceptance NOT TESTED. Existing UI overflow/movement matrix not claimed by this logic change. Wide JSON, chapters, structural/schedule changes and the legacy full-upsert fallback are outside this incremental release and remain open work.
