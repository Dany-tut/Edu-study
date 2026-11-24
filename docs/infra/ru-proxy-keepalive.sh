#!/usr/bin/env bash
# Держать соединения прокси api.iskra-study.ru → Supabase открытыми (keepalive).
#
# Зачем: в setup-ru-proxy.sh `proxy_pass https://$supabase_host` идёт через
# переменную и без блока upstream — nginx на КАЖДЫЙ запрос ученика из РФ заново
# открывает TCP и TLS до Supabase (несколько лишних кругов Москва ↔ Supabase).
# Здесь: upstream с keepalive и периодическим переразрешением DNS (resolve,
# nginx ≥ 1.27.3; на сервере 1.28.3) для auth/rest/storage/functions.
# Realtime (websocket) не трогаем.
#
# Безопасно: копия /etc/nginx до правки, nginx -t, при ошибке — автоматический
# откат и reload старого конфига. Идемпотентно.
#
# Запуск с Mac:
#   ssh -i ~/.ssh/id_onix_livekit root@177.177.220.129 'bash -s' < docs/infra/ru-proxy-keepalive.sh
set -euo pipefail

UPSTREAM_HOST="igsdwvwiqnozgwczzycx.supabase.co"
SITE=/etc/nginx/sites-available/api.iskra-study.ru
BACKUP="/root/nginx-backup-$(date +%Y%m%d-%H%M%S)"

cp -a /etc/nginx "$BACKUP"
echo "Копия конфига: $BACKUP"

rollback() {
  echo "!!! Ошибка — возвращаю прежний конфиг из $BACKUP"
  rm -rf /etc/nginx && cp -a "$BACKUP" /etc/nginx
  nginx -t && systemctl reload nginx
  exit 1
}
trap rollback ERR

cat > /etc/nginx/conf.d/supabase-upstream.conf <<EOF
# Апстрим Supabase с пулом соединений (ru-proxy-keepalive.sh).
resolver 1.1.1.1 8.8.8.8 valid=300s ipv6=off;
upstream supabase_api {
    zone supabase_api 64k;
    server ${UPSTREAM_HOST}:443 resolve;
    keepalive 32;
    keepalive_requests 1000;
    keepalive_timeout 60s;
}
EOF

cat > /etc/nginx/snippets/supabase-keepalive.conf <<'EOF'
# Для keepalive к апстриму: HTTP/1.1 и без «Connection: close».
proxy_http_version 1.1;
proxy_set_header Connection "";
EOF

python3 - "$SITE" <<'PY'
import re, sys
path = sys.argv[1]
s = open(path).read()
out, changed = [], 0
# Меняем proxy_pass только в location auth/rest/storage/functions.
for block in re.split(r'(?=\n    location )', s):
    m = re.match(r'\n    location (/(auth|rest|storage|functions)/v1/) \{', block)
    if m and 'proxy_pass https://$supabase_host;' in block:
        block = block.replace('proxy_pass https://$supabase_host;',
            'proxy_pass https://supabase_api;\n        include /etc/nginx/snippets/supabase-keepalive.conf;', 1)
        changed += 1
    out.append(block)
open(path, 'w').write(''.join(out))
print(f'location с keepalive: {changed}')
PY

nginx -t
systemctl reload nginx
trap - ERR

echo "=== Готово. Проверка: ==="
for p in /rest/v1/ /auth/v1/health; do
  curl -s -o /dev/null -w "$p → %{http_code}, первый байт %{time_starttransfer}s\n" "https://api.iskra-study.ru$p" || true
done
echo "Откат вручную: rm -rf /etc/nginx && cp -a $BACKUP /etc/nginx && nginx -t && systemctl reload nginx"
