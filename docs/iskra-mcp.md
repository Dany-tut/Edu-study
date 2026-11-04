# ИИ-помощники Искры через MCP

Remote MCP endpoint: `https://igsdwvwiqnozgwczzycx.supabase.co/functions/v1/iskra-mcp`

The endpoint uses Supabase OAuth 2.1 and a caller-scoped Supabase client. Every write derives the owner from the verified access token and is also subject to the database's existing RLS policies. MCP tools do not accept a teacher ID, use the service-role key, publish courses, or write to a published course.

## Tools

- `list_my_courses` — list only courses owned by the signed-in teacher.
- `create_course` — create a draft course and its first module.
- `add_course_lesson` — add a lesson and plain-text lesson notes to an owned draft course.
- `create_test_for_lesson` — add a multiple-choice test to an owned draft course lesson, provided it has no existing test.

Подключаться может любой ИИ-клиент с поддержкой удалённых MCP-серверов: например Claude, Codex и другие совместимые приложения. Название клиента берётся из OAuth-запроса, поэтому экран согласия и список подключений не привязаны к конкретному поставщику.

На этапе тестирования доступ бесплатный. Оплата и лимиты пока не реализованы. Перед запуском платного тарифа нужно отдельно добавить проверку тарифа и учёт использования на сервере; до этого доступ остаётся бесплатным.

Преподаватель проверяет и публикует изменения в Искре. Раздел профиля **Модули → ИИ-помощники** показывает OAuth-подключения и позволяет отозвать каждое отдельно.

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
