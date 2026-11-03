# Claude ↔ Искра через MCP

Remote MCP endpoint: `https://igsdwvwiqnozgwczzycx.supabase.co/functions/v1/iskra-mcp`

The endpoint uses Supabase OAuth 2.1 and a caller-scoped Supabase client. Every write derives the owner from the verified access token and is also subject to the database's existing RLS policies. MCP tools do not accept a teacher ID, use the service-role key, publish courses, or write to a published course.

## Tools

- `list_my_courses` — list only courses owned by the signed-in teacher.
- `create_course` — create a draft course and its first module.
- `add_course_lesson` — add a lesson and plain-text lesson notes to an owned draft course.
- `create_test_for_lesson` — add a multiple-choice test to an owned draft course lesson, provided it has no existing test.

Teachers review and publish changes in Искра. Open **Настройки → Интеграции** on desktop, or **Ещё → Интеграции** on mobile. The shared card checks MCP availability separately from issued OAuth grants, copies the server URL, opens Claude's connector form, and revokes individual grants by client ID. Names from dynamic registration are untrusted display values, not proof that an application is Claude.

In the verified Claude client, use **Customize → Connectors → Add connector → Add custom connector**, choose **Sign in now** and **Register automatically**, then approve access in Iskra. The card links to the observed web form: https://claude.ai/customize/connectors/yours?modal=add-custom-connector .

## Supabase Auth setup required for production

This project uses a hosted Supabase project. In its dashboard:

1. Enable the OAuth 2.1 server and dynamic client registration under **Authentication → OAuth Server**. MCP clients register their OAuth client dynamically; each teacher still approves access in the Искра consent screen.
2. Set **Authorization Path** to `/oauth/consent` and keep **Site URL** on the production Искра origin. Vercel rewrites this route to the SPA.
3. Ensure JWT signing uses ES256 or RS256. Supabase's MCP middleware rejects legacy HS256 access tokens.
4. Review the OAuth clients/grants and test one Claude connection before announcing availability.

Then deploy the web app and function. The Edge Function must have `verify_jwt = false` so MCP OAuth discovery can respond before sign-in; its middleware still requires and validates a teacher access token for tools. `supabase/config.toml` carries that function setting.

```sh
supabase functions deploy iskra-mcp --project-ref igsdwvwiqnozgwczzycx --no-verify-jwt
```

The OAuth 2.1 server is a project-level setting, separate from the Edge Function deployment. Do not enable it until the signing-key and production consent-path settings have been reviewed.

## Acceptance on3 November2026

ES256, production consent/site URL and OAuth discovery were checked. OAuth server and dynamic registration are enabled; only three auth.oauth_server fields were pushed from an isolated minimal config. The protected MCP function is deployed. Protocol plus complete local UI with real backend passed; see [evidence](qa/mcp-integration-2026-11-03/README.md). Actual Claude reaches consent; completion requires the pending browser confirmation and is recorded separately. OAuth credentials inherit the owner’s existing RLS rights; draft-only guarantees describe the four MCP tools, not every direct Supabase API.
