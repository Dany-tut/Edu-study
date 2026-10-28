# chembio-day — утренняя сводка ХимБио → Таскли

По будням в 07:30 Москвы cron (миграция `0105_chembio_day_summary.sql`) зовёт эту функцию,
она собирает сводку Вадима через `chembio_day_summary()` и делает `PUT` в канал Таскли
`/chembio/day`. Формат канала — `ChemBio_KB/integration/TASKLY.md`, «Канал ХимБио».

## Включение в прод (по шагам, каждый — с ок Дани)

```bash
# 1. Секрет вызова: одно значение и в функцию, и в Vault.
CRON=$(openssl rand -hex 24)

# 2. Секреты функции. CHEMBIO_TOKEN — тот же, что у Таскли на Railway.
TOKEN=$(python3 -c "import json,os;print(json.load(open(os.path.expanduser('~/.config/chembio/server.json')))['token'])")
supabase secrets set --project-ref igsdwvwiqnozgwczzycx CHEMBIO_TOKEN="$TOKEN" CHEMBIO_CRON_SECRET="$CRON"

# 3. Тот же секрет вызова — в Vault, его читает run_chembio_day().
echo "$CRON"   # → SQL Editor: select vault.create_secret('<CRON>', 'chembio_cron_secret');

# 4. Функция, без проверки JWT: cron ходит со своим секретом.
supabase functions deploy chembio-day --project-ref igsdwvwiqnozgwczzycx --no-verify-jwt

# 5. Миграция 0105: функция сводки + задача cron chembio-day-weekdays.
supabase db push   # или применить 0105 через MCP apply_migration
```

## Проверка после включения

```bash
URL=https://igsdwvwiqnozgwczzycx.supabase.co/functions/v1/chembio-day
# Только собрать, в Таскли не слать:
curl -sS -X POST "$URL" -H "x-chembio-secret: $CRON" -H 'Content-Type: application/json' \
  -d '{"teacher_id":"a2857e8b-b11f-45e1-a59e-336466b80db7","dry_run":true}'
# Пробная отправка — только с "sample": true (на телефоне Вадима метка «ПРИМЕР»):
curl -sS -X POST "$URL" -H "x-chembio-secret: $CRON" -H 'Content-Type: application/json' \
  -d '{"teacher_id":"a2857e8b-b11f-45e1-a59e-336466b80db7","sample":true}'
```

Сводку без функции можно собрать прямо в базе:
`select public.chembio_day_summary('a2857e8b-b11f-45e1-a59e-336466b80db7');`

## Выключить

```sql
select cron.unschedule('chembio-day-weekdays');
```
