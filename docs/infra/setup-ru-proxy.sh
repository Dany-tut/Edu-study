#!/usr/bin/env bash
# Настройка российского обратного прокси к Supabase на чистом Ubuntu VPS.
# Идемпотентно: можно запускать повторно. Выполняется НА СЕРВЕРЕ под root.
#
# Запуск с Mac (ключ и доступ уже есть):
#   ssh -i ~/.ssh/id_onix_livekit root@177.177.220.129 'bash -s' < docs/infra/setup-ru-proxy.sh
#
# Код приложения (VITE_SUPABASE_URL) этим скриптом НЕ трогается — это отдельный
# поэтапный PR после проверки прокси (см. docs/infra/ru-proxy.md §3).
set -euo pipefail

DOMAIN="api.iskra-study.ru"
UPSTREAM="igsdwvwiqnozgwczzycx.supabase.co"
EMAIL="dillattd@gmail.com"   # уведомления Let's Encrypt об истечении

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

mkdir -p /var/www/certbot /etc/nginx/snippets

# --- общий снипет проксирования (Host/SNI = реальный хост Supabase) ---
cat > /etc/nginx/snippets/supabase-proxy.conf <<'EOF'
proxy_set_header Host $supabase_host;
proxy_ssl_server_name on;
proxy_ssl_name $supabase_host;
proxy_ssl_protocols TLSv1.2 TLSv1.3;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_connect_timeout 10s;
# proxy_read_timeout/proxy_send_timeout НЕ здесь: иначе дубль с location
# (functions/realtime задают свои). Умолчание nginx 60s для auth/rest/storage ок.
# CORS отдаёт апстрим Supabase — на nginx не добавляем (иначе дубли заголовков).
EOF

# --- map для апгрейда websocket (http-контекст) ---
cat > /etc/nginx/conf.d/ws-upgrade.conf <<'EOF'
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
EOF

# --- этап 1: только HTTP, чтобы certbot прошёл ACME webroot ---
cat > /etc/nginx/sites-available/api.iskra-study.ru <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name api.iskra-study.ru;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 503; }
}
EOF
ln -sf /etc/nginx/sites-available/api.iskra-study.ru /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# --- этап 2: выпуск сертификата ---
certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" \
  --email "$EMAIL" --agree-tos --no-eff-email --non-interactive \
  --deploy-hook "systemctl reload nginx"

# --- этап 3: полный конфиг прокси (сертификат уже есть) ---
cat > /etc/nginx/sites-available/api.iskra-study.ru <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name api.iskra-study.ru;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name api.iskra-study.ru;

    ssl_certificate     /etc/letsencrypt/live/api.iskra-study.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.iskra-study.ru/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;

    # Апстрим Supabase; переменная + resolver = re-resolve в рантайме.
    set $supabase_host igsdwvwiqnozgwczzycx.supabase.co;
    resolver 1.1.1.1 8.8.8.8 valid=300s ipv6=off;
    resolver_timeout 5s;

    client_max_body_size 50m;

    location /auth/v1/ {
        proxy_pass https://$supabase_host;
        include /etc/nginx/snippets/supabase-proxy.conf;
    }
    location /rest/v1/ {
        proxy_pass https://$supabase_host;
        include /etc/nginx/snippets/supabase-proxy.conf;
    }
    location /storage/v1/ {
        proxy_pass https://$supabase_host;
        include /etc/nginx/snippets/supabase-proxy.conf;
        proxy_request_buffering off;
        proxy_buffering off;
    }
    location /functions/v1/ {
        proxy_pass https://$supabase_host;
        include /etc/nginx/snippets/supabase-proxy.conf;
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
    location /realtime/v1/ {
        proxy_pass https://$supabase_host;
        include /etc/nginx/snippets/supabase-proxy.conf;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    location / { return 404; }
}
EOF
nginx -t
systemctl reload nginx

echo "=== ГОТОВО. Проверка здоровья: ==="
echo -n "proxy  /auth/v1/health  -> "; curl -sS -o /dev/null -w "%{http_code}\n" "https://$DOMAIN/auth/v1/health"
echo -n "direct /auth/v1/health  -> "; curl -sS -o /dev/null -w "%{http_code}\n" "https://$UPSTREAM/auth/v1/health"
echo "--- тело health через прокси ---"
curl -sS "https://$DOMAIN/auth/v1/health"; echo
