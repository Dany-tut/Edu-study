#!/usr/bin/env bash
# Проверка миграции MCP v2 на одноразовом Postgres в Docker (не прод, не общий стенд).
# Запуск: bash scripts/iskraMcp/run-db-test.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
NAME=iskra-mcp-dbtest-$$
IMAGE=${IMAGE:-public.ecr.aws/supabase/postgres:17.6.1.127}
docker run -d --rm --name "$NAME" -e POSTGRES_PASSWORD=postgres "$IMAGE" >/dev/null
trap 'docker stop "$NAME" >/dev/null 2>&1 || true' EXIT
for _ in $(seq 1 60); do docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
sleep 3
psql() { docker exec -i "$NAME" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
psql < scripts/iskraMcp/db-fixture.sql
psql < supabase/migrations/20261126090000_mcp_scopes_log_activity.sql
psql < scripts/iskraMcp/db-test.sql
echo "OK: MCP v2 DB checks passed"
