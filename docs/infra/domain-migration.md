# Переезд app на домен iskra-study.ru (доступ из РФ без VPN)

Статус: ПОДГОТОВЛЕНО в ветке, НЕ применено на проде/сервере/дашборде (10.11.2026).
Применять по «да» Дани через оператора пайплайна.

## Зачем

`api.iskra-study.ru` (обратный прокси к Supabase, `ru-proxy.md`) чинит только
**запросы к данным** из РФ. Сам app грузится с `edu-study-app.vercel.app` — если
этот домен в РФ режется, ученик вообще не откроет кабинет. Цель: отдавать app на
`iskra-study.ru`, который из РФ доступен.

Важно: `VITE_SUPABASE_PROXY_URL=https://api.iskra-study.ru` уже выставлен в
Vercel (Production, 09.11) → боевой бандл уходит на прокси сам. Любая сборка для
нового домена ДОЛЖНА собираться с тем же env, иначе данные в РФ не дойдут.

## Ветвление (определяет способ хостинга) — ШАГ 0

Сначала проверить реальным РФ-узлом/учеником: грузится ли
`https://edu-study-app.vercel.app` из РФ без VPN.

- **A — грузится:** `iskra-study.ru` как custom domain в Vercel (DNS → Vercel,
  TLS Vercel). Проще. НО: доступность зависит от Vercel-edge (проверить из РФ
  отдельно), и apex DNS уедет с VPS → ломает SMM-редирект. `api.*` не трогается.
- **B — режется (рекомендовано):** отдавать `dist` с VPS Timeweb (тот же сервер,
  что уже работает из РФ). Надёжно. Скрипт `setup-spa-host.sh`.

## Вариант B: как раскатать (ТОЛЬКО по «да» Дани)

1. DNS: `iskra-study.ru` (apex) и `www` → `177.177.220.129` (apex уже указывает).
   На apex НЕ должно быть SMM-редиректа — согласовать с оператором.
2. На сервере добавить конфиг и TLS, НЕ трогая `api.iskra-study.ru`:
   ```bash
   ssh -i ~/.ssh/id_onix_livekit root@177.177.220.129 'bash -s' < docs/infra/setup-spa-host.sh
   ```
3. Собрать SPA с боевым env и залить в `/var/www/iskra-study` (см. §Деплой dist).
4. Проверить из РФ: открытие app, вход по паролю/коду, загрузка расписания
   (должно идти через прокси), realtime.

### Деплой dist на VPS

Сборка — из чистой копии `origin/main` с тем же env, что в Vercel Production:
```bash
# .env.production.local (НЕ коммитить): VITE_SUPABASE_URL (прямой),
# VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROXY_URL=https://api.iskra-study.ru
npm ci
npm run build
rsync -az --delete -e "ssh -i ~/.ssh/id_onix_livekit" \
  dist/ root@177.177.220.129:/var/www/iskra-study/
```
Это **зеркало** прода для РФ, а не канонический релиз. Канон остаётся Vercel из
`main` (AGENTS.md). Обновлять зеркало тем же билдом после каждого прод-деплоя,
иначе РФ отстанет по версии (ломает ленивые чанки — `stale chunk after deploy`).
Долгий срок: привязать шаг rsync к CI после зелёного прод-деплоя.

## Passkey (ключи доступа) при смене домена

WebAuthn-ключ привязан к RP ID (домену) и на другом домене НЕ работает.
- Вход по паролю/коду — ОСНОВНОЙ на переход, никого не запирает.
- `src/lib/passkey.ts`: `PASSKEY_HOSTS` теперь включает оба домена — кнопка ключа
  видна и на `iskra-study.ru`, второй деплой при переключении RP не нужен.
  Реально сработает тот домен, что выставлен RP ID в Supabase.
- `public/.well-known/webauthn` (Related Origin Requests) перечисляет оба origin
  как МОСТ для старых ключей. Поддержка браузеров неполная — НЕ закладываемся;
  у кого ключ не сработал, входит паролем и пересоздаёт ключ в «Способах входа».
- Переключать RP ID в Supabase на `iskra-study.ru` — только когда домен стабилен.

## Что делает Дани в дашбордах (точные строки — в чеклисте оператору)

- Supabase → Authentication → URL Configuration: добавить `https://iskra-study.ru`
  в Site URL и в Redirect URLs (`https://iskra-study.ru/**`). `VITE_SUPABASE_URL`
  НЕ менять (storageKey/сессии).
- Google Cloud → OAuth client: Authorized JavaScript origins += `https://iskra-study.ru`.
  Authorized redirect URI остаётся `https://igsdwvwiqnozgwczzycx.supabase.co/auth/v1/callback`.
- Apple (если web-поток) — аналогично домен в Service ID / Return URLs.
- Passkey RP ID — переключать позже (см. выше).

## Нативка (iOS/Android) — ОТДЕЛЬНО, через чат сборок

НЕ в этой веб-ветке. При переключении RP на новый домен:
- iOS: entitlement `webcredentials:iskra-study.ru`, Associated Domains, AASA с
  `https://iskra-study.ru/.well-known/apple-app-site-association`, `PASSKEY_HOST`.
- Android: Digital Asset Links (`assetlinks.json`) для passkey.
- Пересборка TF/APK.

## Переход без обрыва и откат

Оба домена живут параллельно. РФ → `iskra-study.ru`, vercel.app запасной.
Новый домен = новый origin → на нём логин заново (по паролю/коду — ок).
Откат: перестать слать РФ-трафик на новый домен; `api.*` и Vercel не трогаются.
