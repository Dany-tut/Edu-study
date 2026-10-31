# Claude ↔ Искра через MCP

Remote MCP endpoint: `https://igsdwvwiqnozgwczzycx.supabase.co/functions/v1/iskra-mcp`

The endpoint uses Supabase OAuth 2.1 and a caller-scoped Supabase client. Every write derives the owner from the verified access token and is also subject to the database's existing RLS policies. MCP tools do not accept a teacher ID, use the service-role key, publish courses, or write to a published course.

## Tools

- `list_my_courses` — list only courses owned by the signed-in teacher.
- `create_course` — create a draft course and its first module.
- `add_course_lesson` — add a lesson and plain-text lesson notes to an owned draft course.
- `create_test_for_lesson` — add a multiple-choice test to an owned draft course lesson, provided it has no existing test.

Teachers review and publish changes in Искра. The profile's **Модули** section copies the server URL for Claude and lists/revokes Claude OAuth grants.

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
