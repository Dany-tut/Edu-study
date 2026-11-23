# Analytics loading and pill caption alignment · 23 November 2026

Base: `5aa5c44702d7d4621100d1f8a2a55292c26f7f78`, 1.0.3588. User reported analytics failure and visually low pill text. Scope: TeacherAnalytics, Segmented caption ink profile and two analytics read indexes; course save untouched.

## Observed defect and database verification

Production telemetry 07:07:45 UTC: four analytics RPCs returned HTTP500 after 9.306–9.590s. Matching PostgreSQL logs recorded statement timeouts. A single `Promise.all` hid successful KPI results until all ten RPCs plus geography/resolutions completed; rejection could strand loading. These failures occurred on3588, not just an old tab.

Ordinary `VACUUM (ANALYZE)` on analytics_events (not FULL) changed heat query SQL time1633.997→156.366ms, heap fetches19909→2. Page stats still exceeded8s alone. Added indexes online using CONCURRENTLY before transactional migration20261123091001. Page counts now read a narrow partial covering index; only page_leave reads dwell metadata. Comparison on one live raw snapshot: original214 groups, rewritten214 groups, EXCEPT ALL both directions0. Raw data/role NULL groups/filter/averages preserved; no approximate cache substituted.

Authenticated-role SQL invocation under controlled trusted admin claims, read-only/rollback and unchanged8s limit: heat232.34ms/106rows, daily2276.47ms/31rows, breakdown67.04ms/42rows, pages1529.75ms/214rows. These are SQL timings, not browser/HTTP latency. Teacher with user_metadata.role=admin but app_metadata.role=teacher was rejected. Anonymous execute remains false. Owner, ACL, pre-existing SECURITY DEFINER and search_path unchanged. Security advisor flags that authenticated DEFINER entry point as before; original explicit is_admin guard remains. No auth policies, live rows or retention were changed.

## Frontend acceptance

`checkAdminAnalyticsLoad.mjs`: two workers, progressive successful summary before held chart; rejected request isolated; stale period suppresses result and queued work; idle tab does no work; hanging response has a bounded timeout.

Actual TeacherAnalytics React effects with controlled transport: KPI303 appears while heat is held; no pages RPC before Issues; daily failure has a named alert/retry; retry calls only daily; changing7→90 while7is held keeps900 after late777; Issues loads on entry. No pageerrors. Requests from a cancelled test generation are deliberately allowed to finish to verify late-response protection. Issues shows no green health verdict until all required issue sources succeed. Existing heatmap/digest/diagnostic child flows unchanged, not accepted as new E2E coverage.

Segmented ink opt-in: actual caption bounds for the actual font, font+text cache bounded256; baseline default elsewhere unchanged. Roboto13 before: Data+0.452px, Analytics−0.620px, Teachers−0.617px; after absolute deviation<0.015px. Fourplatform previews ×2themes across7sizes (14cases): PC1440/1280low, iPhone320/390, iPad820portrait/1180landscape, Android412. Actual fonts, selected/unselected, 200%zoom; measured ink<0.15px, controls/icons geometry unchanged. PCdark/iPhonelight PNGs inspected. Not a physical device or authenticated server UI proof.

Evidence outside Git: `/Users/dany/.codex/iskra-qa/admin-analytics-loading-20261123/` (scenario, React effects/matrix JSON, before/after PNGs, SQL comparison). Full published SHA/manifests and production UI readback must be recorded after release; do not substitute fixture PASS for production acceptance.
