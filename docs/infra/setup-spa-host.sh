#!/usr/bin/env bash
# Отдача собранного SPA Искры с российского VPS на домене iskra-study.ru.
# Нужно, чтобы ученики ИЗ РФ могли ОТКРЫТЬ сам app (не только достучаться до
# Supabase через прокси api.iskra-study.ru). Вариант B миграции домена —
# см. docs/infra/domain-migration.md.
#
# ИДЕМПОТЕНТНО, выполняется НА СЕРВЕРЕ под root. НЕ трогает server-block
# `api.iskra-study.ru` (обратный прокси к Supabase — критичен для входа из РФ):
# этот скрипт только ДОБАВЛЯЕТ отдельный конфиг iskra-study.ru.
#
# Запуск с Mac:
#   ssh -i ~/.ssh/id_onix_livekit root@177.177.220.129 'bash -s' < docs/infra/setup-spa-host.sh
#
# ВНИМАНИЕ: на apex iskra-study.ru сейчас НЕ должно быть настроено ничего
# другого (напр. SMM-редиректа на vercel.app). Координация — через оператора.
# Выпускать TLS и ставить этот конфиг ТОЛЬКО после «да» Дани.
set -euo pipefail

DOMAIN="iskra-study.ru"
WEBROOT="/var/www/iskra-study"          # сюда кладётся содержимое dist/ (см. §deploy)
EMAIL="dillattd@gmail.com"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

mkdir -p /var/www/certbot "$WEBROOT"
# заглушка, пока не залит dist (чтобы nginx -t и ACME проходили)
[ -f "$WEBROOT/index.html" ] || echo "<!doctype html><title>Искра</title>Скоро." > "$WEBROOT/index.html"

# --- этап 1: только HTTP для ACME webroot (certbot) ---
cat > /etc/nginx/sites-available/iskra-study.ru <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name iskra-study.ru www.iskra-study.ru;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 503; }
}
EOF
ln -sf /etc/nginx/sites-available/iskra-study.ru /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# --- этап 2: выпуск сертификата на корень (+www) ---
certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" -d "www.$DOMAIN" \
  --email "$EMAIL" --agree-tos --no-eff-email --non-interactive \
  --deploy-hook "systemctl reload nginx"

# --- этап 3: полный конфиг отдачи SPA ---
# Семантика маршрутов повторяет vercel.json (SPA-fallback, /t/:id.html,
# .well-known как статика, иммутабельный кэш /assets, no-store для
# release.json/version.json) и те же security-заголовки.
cat > /etc/nginx/sites-available/iskra-study.ru <<'EOF'
map $sent_http_content_type $iskra_cache {
    default                   "public, max-age=0, must-revalidate";
    ~*application/javascript  "public, max-age=31536000, immutable";
    ~*text/css                "public, max-age=31536000, immutable";
}

server {
    listen 80;
    listen [::]:80;
    server_name iskra-study.ru www.iskra-study.ru;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://iskra-study.ru$request_uri; }
}

# www -> apex
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name www.iskra-study.ru;
    ssl_certificate     /etc/letsencrypt/live/iskra-study.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/iskra-study.ru/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    return 301 https://iskra-study.ru$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name iskra-study.ru;

    ssl_certificate     /etc/letsencrypt/live/iskra-study.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/iskra-study.ru/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;

    root /var/www/iskra-study;
    index index.html;

    # .well-known как JSON-статика (passkey AASA + Related Origin Requests)
    location = /.well-known/apple-app-site-association { default_type application/json; }
    location = /.well-known/webauthn                   { default_type application/json; }

    # версии — всегда свежие
    location = /release.json { add_header Cache-Control "no-store" always; }
    location = /version.json { add_header Cache-Control "no-store" always; }

    # иммутабельные ассеты с хэшем в имени
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        try_files $uri =404;
    }

    # короткие ссылки тестов: /t/<id> -> /t/<id>.html
    location /t/ { try_files $uri $uri.html /index.html; }

    # security-заголовки (зеркало vercel.json; при расхождении источник — vercel.json)
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Permissions-Policy "camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), interest-cohort=()" always;
    add_header Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.clarity.ms https://*.clarity.ms https://eu-assets.i.posthog.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; connect-src 'self' https://igsdwvwiqnozgwczzycx.supabase.co wss://igsdwvwiqnozgwczzycx.supabase.co https://api.iskra-study.ru wss://api.iskra-study.ru https://eu.i.posthog.com https://eu-assets.i.posthog.com https://*.ingest.de.sentry.io https://*.clarity.ms https://*.r2.cloudflarestorage.com; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'" always;

    # SPA-fallback: всё без расширения -> index.html (как rewrite в vercel.json)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
nginx -t
systemctl reload nginx

echo "=== ГОТОВО. Проверка: ==="
echo -n "https://iskra-study.ru/ -> "; curl -sS -o /dev/null -w "%{http_code}\n" "https://iskra-study.ru/"
echo -n "api.* не задет        -> "; curl -sS -o /dev/null -w "%{http_code}\n" "https://api.iskra-study.ru/auth/v1/health"
