# Changed-only ordinary course saves · 2026-11-22

Candidate based on main 7e106e393db795d85db0827e7caeb4d50ae0e777 (3560).

## Scope
Ordinary matched network sources (draft and published) now support preserved paragraph/self-check/task/file leaves through save_course_content_delta. No QA URL switch or owner/course allowlist in this ordinary path. Explicit structure/mixed edits use a raw-preserved full snapshot; the server updates only DISTINCT fields/rows. Publication and chapter barriers require full source/version/roster witnesses before advancing the baseline. Current access intents use the unchanged helper in the same FULL transaction. RLS, history, 8s timeout and existing visibility/schedule queue barriers remain.

New courses and locally invented module IDs still use the existing stable creation path until a matched network source is available. Unknown/mixed restored drafts do not acquire a fresh stamp. This release does not claim one-second creation, publication, media upload or large structural/access edits.

## Scenario card (before ordinary production verification)
Use only QA course 00e3a0efbf, 4 modules, 80 lessons, 1057 tasks, empty authoritative audience, draft. Do not overwrite user caption/date edits. Do not reload or clear the old3556 unsaved tab. After deployment open a separate fresh ordinary URL without qa_course_save/qa_course_delta, verify exact version, change one paragraph/question/file property, measure network request→ACK, reopen/read DB. Check 79 untouched rows, unknown nested fields, stable IDs and module roster. Conflict/error retains latest draft; late ACK A must not certify B. Assigned/published branches are covered by isolated SQL fixtures, not a live teacher/student workflow acceptance.

## Completed controlled production checks (3558, restricted entry only)
Native Edge, session9717edd4-4c1f-4e1d-aa92-7d63b5a83a59, same populated QA:
- New paragraph edit: HTTP745ms, client766.6ms, function345.838ms, request7002 UTF8 bytes.
- New homework.question edit: HTTP965ms at14:56:28.151Z, success200.
- Add notebook link: HTTP877ms at14:56:50.001Z, success200.
- Restore original question: HTTP547ms at14:57:13.906Z, success200.
- DB readback: marker absent, notebook.url/path correct, workbook.qaHidden and qaHiddenRoot retained. Only target lesson xmin changed out of80;79 untouched.
- These are real changing requests, not no-op timing. Browser online=false telemetry is observed and not treated as failed save.

## SQL and client evidence
- General wide actual-RLS rollback: paragraph139.112ms, homework104.898ms, material106.739ms, mixed117.248ms (SQL only); CAS/status/foreign reject. Data/history/80/4 fingerprints equal after rollback.
- FULLv2 actual-RLS rollback9 checks: no-op179.695ms, metadata161.752ms, description203.971ms, paragraph178.581ms; existing access helper rejection rolls back content. Data/history/80/4 equal.
- Whole chapter actual rollback:116.303ms, PASS; whole publication59.753ms, PASS. Publication proof explicitly accounts for existing published_at trigger. Final scoped data/history536 and80/4 equal; temporary objects removed.
- Portable fixtures: ordinary-wide32, full preservation12, FULL ACK9, chapter/publication ACK18, actual editor dispatch tests include insert/delete fallback, nested hidden fields, immutableA/B, bad ACK/conflict, visibility barrier and publication sequence.

Ordinary post-release evidence remains to be added. Controlled proof is not a claim that all existing assigned course workflows are accepted.
