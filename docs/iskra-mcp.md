# ИИ-помощники Искры через MCP

Remote MCP endpoint: `https://igsdwvwiqnozgwczzycx.supabase.co/functions/v1/iskra-mcp`

The endpoint uses Supabase OAuth 2.1 and a caller-scoped Supabase client. Every write and read derives the owner from the verified access token and is also subject to the database's existing RLS policies. MCP tools do not accept a teacher ID, use the service-role key, publish courses, or write to a published course.

## Tools

- `list_my_courses` — list only courses owned by the signed-in teacher.
- `create_course` — create a draft course and its first module.
- `add_course_lesson` — add a lesson and plain-text lesson notes to an owned draft course.
- `create_test_for_lesson` — add a multiple-choice test to an owned draft course lesson, provided it has no existing test.
- `attach_lesson_file` — attach a reference file to an owned draft course lesson, either by uploading its bytes (base64, up to 15 MB, into the `lesson-materials` bucket under `<uid>/<uuid>.<ext>`) or by an external link (`url`, for larger files). The file stores as owner-scoped, so only the uploading teacher can read, overwrite, or delete it.

### Read-only tools (свои группы и ученики)

Все пять инструментов только читают. Они работают через того же клиента от имени преподавателя и под RLS, без service-role и без параметра `teacher_id`. Ученик или группа чужого преподавателя выглядят как «не найден». Даты периода (`since`, `until`) задаются в формате `YYYY-MM-DD` и включаются в период; по умолчанию берутся последние 90 дней.

- `list_my_groups` — свои группы: название, предмет, уровень, индивидуальная или нет, число учеников.
- `list_my_students` — свои ученики (можно указать `group_id`): только id, имя и группа.
- `student_summary` — сводка по одному ученику за период. Посещаемость: доля присутствий, средняя отметка, последние пропуски. ДЗ: статусы, средний балл, первичные баллы проверок ИИ с отметками о подтверждении учителем. Учебные долги: просроченные задания группы без сданной работы и работы на доработке. Также сохранённые баллы и диагностики.
- `mistakes_by_topic` — где ученик, группа или все ученики теряют баллы за период. Номера экзаменационных заданий берутся из `hw_ai_grades` (недобранные первичные баллы и комментарии), задания ДЗ — из ответов `homework_attempts` с вердиктом `wrong`/`hint`/`empty`, темы — из `diag_results`. Этот инструмент отвечает на вопросы вроде «что повторить с 11Б?».
- `test_results` — диагностики (процент, ответы, три самые слабые темы) и тесты внутри курсов (уроки `kind = 'test'`, статус и балл из `lesson_progress`).

Инструменты не отдают телефон, почту, контакты родителей, Telegram, пароль, комментарий преподавателя, оплаты и денежный долг. В ответ попадает только имя ученика.

#### Изоляция: где RLS, а где явный фильтр

RLS проверена на проде 6 ноября 2026: транзакция с откатом от имени обычного учителя (`set local role authenticated`, `aal2`). Результаты:

| Таблица | Чужие строки, видимые учителю |
|---|---|
| `students`, `groups`, `lesson_attendance`, `lesson_progress`, `homework_attempts`, `hw_ai_grades`, `homework`, `test_assignments` | 0 — RLS закрывает по владельцу |
| `diag_results` | **все 27** — политика `diag_results_select_auth` пускает любого `is_staff()` |

Кроме того, администратор по `is_admin()` видит всех учеников через RLS. Поэтому `readTools.ts` не полагается на RLS. Сначала инструменты берут список своих учеников явным фильтром `students.created_by = auth.uid()` (сейчас у всех учеников он совпадает с владельцем группы). Затем каждый запрос сужается `in('student_id', …)`. Для `diag_results` используются `student_id` и `linked_student_id`, для `hw_ai_grades` дополнительно `teacher_id = uid`. После этого строки ещё раз отфильтровываются в коде. Через MCP администратор тоже видит только своих учеников.

Политику `diag_results` стоит сузить отдельной миграцией до учеников владельца. Сначала нужно проверить, на что в интерфейсе опирается чтение всех диагностик (непривязанные результаты, сводка администратора).

Тесты: `npm run check:iskra-mcp` (`deno check` и `readTools_test.ts`). Фейковая база в них ведёт себя хуже прода: пропускает строки всех учителей, а в отдельном тесте вообще игнорирует фильтры запроса. Тесты проверяют, что чужой ученик и группа не находятся, а в ответах нет чужих имён, тем, id и контактов.

Подключаться может любой ИИ-клиент с поддержкой удалённых MCP-серверов: например Claude, Codex и другие совместимые приложения. Название клиента берётся из OAuth-запроса, поэтому экран согласия и список подключений не привязаны к конкретному поставщику.

На этапе тестирования доступ бесплатный. Оплата и лимиты пока не реализованы. Перед запуском платного тарифа нужно отдельно добавить проверку тарифа и учёт использования на сервере; до этого доступ остаётся бесплатным.

Teachers review and publish changes in Искра. Open **Настройки → Интеграции** on desktop, or **Ещё → Интеграции** on mobile. The shared card checks MCP availability separately from issued OAuth grants, copies the server URL, opens Claude's connector form, and revokes individual grants by client ID. Names from dynamic registration are untrusted display values, not proof that an application is Claude.

In the verified Claude client, use **Customize → Connectors → Add connector → Add custom connector**, choose **Sign in now** and **Register automatically**, then approve access in Iskra. The card links to the observed web form: https://claude.ai/customize/connectors/yours?modal=add-custom-connector .

## Supabase Auth setup required for production

This project uses a hosted Supabase project. In its dashboard:

1. Enable the OAuth 2.1 server and dynamic client registration under **Authentication → OAuth Server**. MCP clients register their OAuth client dynamically; each teacher still approves access in the Искра consent screen.
2. Set **Authorization Path** to `/oauth/consent` and keep **Site URL** on the production Искра origin. The route must serve the SPA while preserving `/oauth/consent`; do not convert it into a hash-router route.
3. Ensure JWT signing uses ES256 or RS256. Supabase's MCP middleware rejects legacy HS256 access tokens.
4. Review OAuth clients and grants, then test with at least one MCP-compatible client before announcing availability.

Then deploy the web app and function. The Edge Function must have `verify_jwt = false` so MCP OAuth discovery can respond before sign-in; its middleware still requires and validates a teacher access token for tools. `supabase/config.toml` carries that function setting.

```sh
supabase functions deploy iskra-mcp --project-ref igsdwvwiqnozgwczzycx --no-verify-jwt
```

The OAuth 2.1 server is a project-level setting, separate from the Edge Function deployment. Do not enable it until the signing-key and production consent-path settings have been reviewed.

## Acceptance on3 November2026

ES256, production consent/site URL and OAuth discovery were checked. OAuth server and dynamic registration are enabled; only three auth.oauth_server fields were pushed from an isolated minimal config. The protected MCP function is deployed. Protocol plus complete local UI with real backend passed; see [evidence](qa/mcp-integration-2026-11-03/README.md). Actual Claude reaches consent; completion requires the pending browser confirmation and is recorded separately. OAuth credentials inherit the owner’s existing RLS rights; draft-only guarantees describe the write tools, not every direct Supabase API.
