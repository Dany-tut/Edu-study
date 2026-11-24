#!/usr/bin/env bash
# Установка/обновление службы iskra-media-sync на VPS api.iskra-study.ru.
# Запуск с Mac:  bash docs/infra/setup-media-sync.sh
# Идемпотентно. Секрет службы (/etc/iskra-media-sync.env) создаётся один раз;
# в БД кладётся только его SHA-256 (media_sync.service_keys) — вручную, см. README.
# Ключ Google Drive API Дани кладёт сам: /etc/iskra-import.env, GOOGLE_DRIVE_API_KEY, 600.
set -euo pipefail
HOST=${HOST:-root@177.177.220.129}
KEY=${KEY:-$HOME/.ssh/id_onix_livekit}
DIR=$(cd "$(dirname "$0")" && pwd)
ANON=${SUPABASE_ANON_KEY:?нужен SUPABASE_ANON_KEY (публичный anon-ключ проекта)}

scp -i "$KEY" -q "$DIR/media-sync/index.mjs" "$HOST:/tmp/iskra-media-sync.mjs"
ssh -i "$KEY" "$HOST" ANON="$ANON" bash -s <<'EOF'
set -euo pipefail
command -v node >/dev/null || { apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs >/dev/null; }
install -d -m 755 /opt/iskra-media-sync
install -m 644 /tmp/iskra-media-sync.mjs /opt/iskra-media-sync/index.mjs
if [ ! -f /etc/iskra-media-sync.env ]; then umask 077; printf "MEDIA_SYNC_SECRET=%s\n" "$(openssl rand -hex 32)" > /etc/iskra-media-sync.env; fi
grep -q '^SUPABASE_ANON_KEY=' /etc/iskra-media-sync.env || printf "SUPABASE_ANON_KEY=%s\n" "$ANON" >> /etc/iskra-media-sync.env
chmod 600 /etc/iskra-media-sync.env

cat > /etc/systemd/system/iskra-media-sync.service <<'UNIT'
[Unit]
Description=Iskra: автоимпорт записей уроков из папок Диска в R2
After=network-online.target
Wants=network-online.target

[Service]
EnvironmentFile=/etc/iskra-media-sync.env
EnvironmentFile=-/etc/iskra-import.env
ExecStart=/usr/bin/node /opt/iskra-media-sync/index.mjs
Restart=always
RestartSec=5
DynamicUser=yes
MemoryMax=300M
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/nginx/snippets/iskra-media-sync.conf <<'NGX'
# Автоимпорт записей: API службы iskra-media-sync (127.0.0.1:8787).
location /media-sync/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_read_timeout 120s;
    client_max_body_size 64k;
}
NGX
F=$(readlink -f /etc/nginx/sites-enabled/api.iskra-study.ru)
grep -q "snippets/iskra-media-sync.conf" "$F" || sed -i "s|^    include /etc/nginx/snippets/iskra-media.conf;|    include /etc/nginx/snippets/iskra-media.conf;\n    include /etc/nginx/snippets/iskra-media-sync.conf;|" "$F"
systemctl daemon-reload
systemctl enable -q iskra-media-sync
systemctl restart iskra-media-sync
nginx -t -q && systemctl reload nginx
sleep 2
systemctl is-active iskra-media-sync
curl -s http://127.0.0.1:8787/media-sync/health; echo
EOF
