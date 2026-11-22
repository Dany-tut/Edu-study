# Compact unchanged FULL rows · scenario card

## Candidate and boundaries
Based on production3563. Only `save_course_content_full` transport, a pure client planner and one queued FULL dispatch point change. Old full-row callers remain compatible. No new policies, roles, definer, timeout, cache authority or publication/access/schedule bypass.

Wire references have exactly `short_id` and `unchanged_id`. The client must first validate immutable confirmed dispatch/provenance and compare every writable value against its confirmed raw row. Changed/new rows stay full and preserved. The server accepts references only after owner, locked inventory and whole-course CAS, resolves them exclusively from that locked course snapshot, then applies its original validation, DISTINCT writes, access helper and complete ACK.

## Before production
- Old-full compatibility and new refs: metadata80refs, changed/new/deleted/moved rows, unknown nested values, null/absent optional chapters, no mutable dispatch/current-baseline acceptance.
- Reject foreign/missing/mismatched/duplicate refs, ref+payload, malformed objects and stale CAS; reject without content/history/access side effects.
- Actual-RLS rollback on owned isolated draft qa80g3562, UUID010ed90e-bc19-46ae-b4d5-fbb9b71b92fb,80lessons/4modules/1057tasks/0audience. Compare all scoped data/history and remove temporary objects.
- Confirm exact old function definition/body fingerprint before applying the additive-compatible extension. Fresh remote migration history; do not apply unrelated migrations.
- Required release:check and exact-SHA CI, fresh main including3563, Git deployment and four manifests.

## Ordinary HTTP acceptance
Only a fresh separate tab with `qa_profile` and no QA-save/delta flags, after a newly agreed Edge focus window. Preserve all old user tabs/drafts/caption/date edits. Read a fresh authoritative QA baseline; never clear shared drafts to obtain eligibility.

Add one temporary task, edit during A request, verify latest B; delete only that task. Measure actual request→ACK separately from input/debounce, and record numeric UTF8 body bytes/ref/full-row counts for the same request. Verify80/1057 after cleanup,79 untouched lesson versions, all unchanged data/chapters/module IDs/unknown attributes and history. Network re-open and standalone Back→catalog→re-open are separate evidence. Do not claim one-second structural saves before this HTTP measurement.

## Current status
Client19cases, server9cases/80/35policies and actual-RLS rollback14cases PASS. Actual SQL: oldnoop299.941ms, compactnoop241.216ms, metadata258.530ms, paragraph278.098ms, description310.418ms; these are SQL-only measurements, not HTTP. All scoped fingerprints/history91/80/4 equal after rollback, temporary objects removed. Compatible backend migration20261122154612 applied with INVOKER/8s/ACL unchanged. Actual editor compact/non-QA wire, immutable lateA/B, malformed ACK/conflict/no legacy retry and non-fatal numeric diagnostics fixtures PASS. Repository TSC PASS. Ordinary post-release HTTP pending. Previous3562 ordinary leaf640/563ms; structural FULL1842–3158ms. Native PC only; no physical iPhone/iPad/Android or live assigned/published UI acceptance claimed.
