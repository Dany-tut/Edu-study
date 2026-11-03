#!/usr/bin/env bash
# Called as root inside the disposable GitHub runner's WSL2 guest.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq docker.io ca-certificates curl > /tmp/iskra-install.log
if ! docker info >/dev/null 2>&1; then
  nohup dockerd >/tmp/iskra-dockerd.log 2>&1 </dev/null &
  for _ in {1..40}; do docker info >/dev/null 2>&1 && break; sleep 1; done
fi
docker info >/dev/null
cli_version=2.120.0
asset="supabase_${cli_version}_linux_amd64.deb"
release="https://github.com/supabase/cli/releases/download/v${cli_version}"
(cd /tmp && curl -fsSLO "$release/$asset" && curl -fsSLO "$release/checksums.txt" &&
  grep -F "$asset" checksums.txt | sha256sum -c - && dpkg -i "$asset")
repo=$(pwd)
work=/tmp/iskra-ci
python3 scripts/security/prepareLocalSupabase.py --workdir "$work"
# Historical DDL includes absolute function URLs. CI does not send webhooks
# to an existing project even if an old scheduled job runs.
python3 - "$work" <<'PY'
import pathlib,re,sys
for p in (pathlib.Path(sys.argv[1])/'supabase/migrations').glob('*.sql'):
    sql=p.read_text()
    p.write_text(re.sub(r'https://[a-z0-9-]+\.supabase\.co(?=/|\b)','https://example.invalid',sql))
PY
docker network create -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 iskra-ci >/dev/null
if ! supabase start --network-id iskra-ci --workdir "$work" --exclude studio,postgres-meta,logflare,vector,supavisor,imgproxy,edge-runtime > /tmp/iskra-supabase.log 2>&1; then
  grep -Ei 'error|failed|unhealthy|no space' /tmp/iskra-supabase.log | tail -15
  exit 1
fi
mkdir -p "$repo/node_modules/.cache/iskra-ci"
supabase status --workdir "$work" --output json > "$repo/node_modules/.cache/iskra-ci/status.json"
