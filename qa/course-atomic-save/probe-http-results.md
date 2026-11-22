# Restricted production probe · 3546

Exact SHA54cbccf658c7d3db434178d4966cb617cc1e09cb. Four manifests confirmed; mirror45011824256 success. Desktop native Edge/macOS only, actual authenticated owner, isolated draft00e3a0efbf,4modules/80lessons/599788B rich content,0chapters/assignments. Other courses retain stable save.

Metadata edit: input10:22:04.298–04.436Z; POST probe completion10:22:08.666Z, duration3294ms/status200. Lesson title edit10:22:41.297–41.426Z; completion46.995Z,duration4641ms/200. DB descriptions/title read back. Title restored. Full80lesson JSON vs post-duplicate history:0changed rows excludingupdated_at;4modules retained.

Overlap:A input10:23:28.223Z,B10:23:31.525Z;Acompletion32.693Z/3364ms,B35.571Z/2855ms. B precedes AACK by1.168s. DB finalB confirmed. No parallel writes.

BLOCKER:stale primary QA after secondary-tab edit triggered intentionalSQLSTATE40001, and PostgREST retried internally forever. api_stalled30002ms; exact own backend30919 freshly fingerprinted as probe/authenticator, terminated once; freshpg_stat_activity confirms absent. Full data rolled back, local draft visibly retained. Official Supabase KB confirms retry loop for business40001. Fix only intentional probe CAS toPT409; client accepts PT409 and legacy40001 with same exact prefix. No genuine serialization-failure conversion, no globalfunction/RLS changes. Followup actual conflict/retry/reload required. Adjacent read-only audit:save_course_access_changes has intentional40001; chapter migrations no occurrence; no unrelated DDL applied.

pg_stat_statements for8successful PostgREST probe wrappers:mean2038.85ms,min1619.96,max2841.17. Earlier pg_temp0.4–0.63s is not equivalent:fixture assembly before timer warms reads/JSON. Transport not yet proven dominant. Goal~1s NOT reached; no generalrollout.
