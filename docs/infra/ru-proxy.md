# Российский обратный прокси к Supabase

Статус: **сервер и домен готовы, прокси ещё не поднят.** Код приложения
(`VITE_SUPABASE_URL`) **не менялся** и меняется отдельным поэтапным PR уже после
проверки прокси (§3).

- **VPS:** Timeweb «Wise Raven», Ubuntu 26.04 LTS, x86_64, Москва, `177.177.220.129`.
  SSH по ключу: `ssh -i ~/.ssh/id_onix_livekit root@177.177.220.129` (пароль отключён).
- **Домен:** `api.iskra-study.ru` (и apex `iskra-study.ru`) → `177.177.220.129`, DNS распространился.
- **Готовый скрипт настройки:** [`setup-ru-proxy.sh`](setup-ru-proxy.sh) (идемпотентный,
  ставит nginx+certbot, кладёт конфиг ниже, выпускает TLS, делает health-проверку).
  Запуск: `ssh -i ~/.ssh/id_onix_livekit root@177.177.220.129 'bash -s' < docs/infra/setup-ru-proxy.sh`.

Связанные документы: [сборки и опасные изменения](../builds.md) §4,
[выпуск веба](../releases.md), [четыре платформы](../platforms.md).

---

## 1. Зачем это и что НЕ делает

**Проблема (08.11.2026).** Реальный ученик из России не смог войти — «Сервер не
ответил». По логам Supabase запрос входа (`/auth/v1/token`) из РФ **не приходит
вообще**: домен `*.supabase.co` режется российскими провайдерами. Это сетевая
блокировка на пути к Supabase, а не ошибка приложения или базы.

**Решение.** Поднять в России (Timeweb, Москва) обратный прокси на домене вида
`api.iskra-study.ru`, который прозрачно проксирует **весь** API Supabase на
`https://igsdwvwiqnozgwczzycx.supabase.co`. Российский домен не режется, трафик
доходит.

**Что остаётся как есть.**
- Фронт — на `edu-study-app.vercel.app`. **Не трогаем**: к нему привязан passkey
  RP ID (`edu-study-app.vercel.app`), смена ломает ключи доступа. Прокси касается
  только API Supabase, не фронта.
- База данных — Supabase (проект `igsdwvwiqnozgwczzycx`), регион прежний.
  **Данные не переносим.** Прокси только ретранслирует трафик.

### 1.1. Это НЕ выполнение 152-ФЗ

Прокси **не локализует хранение персональных данных**. По ч. 5 ст. 18 152-ФЗ
сбор и хранение ПДн граждан РФ должны вестись в базах, расположенных в России.
Здесь:

- База остаётся в зарубежном регионе Supabase. Прокси не меняет место хранения.
- Прокси в Москве терминирует TLS и видит **расшифрованный** трафик: токены входа,
  e-mail, имена, содержимое запросов. Это добавляет на российской стороне звено,
  которое обрабатывает ПДн, а не снимает обязанности.
- Формально это может даже усложнить картину (появляется обработчик ПДн на
  территории РФ без договора/оснований), а не упростить.

**Вывод: прокси решает сетевую доступность, но не является юридическим решением
по 152-ФЗ.** Если потребуется соответствие закону — это отдельная задача
(перенос базы/зеркало в РФ-регионе, оформление обработки), не этот прокси.
Фиксируем честно, чтобы прокси не выдавали за «теперь по закону».

### 1.2. Риски, которые надо держать в голове

- **VPS — единственная точка отказа.** Если весь трафик пойдёт через прокси,
  падение одного сервера в Москве кладёт вход **всем** пользователям, не только
  в РФ. См. §3, вариант Б — не делать прокси обязательным для всех.
- **Блокировка IP дата-центра.** Cloudflare/Supabase перед апстримом может
  притормаживать запросы с IP хостинга (бот-защита, rate limit). Проверять на
  живом сервере.
- **Доверие к серверу.** Оператор прокси видит расшифрованный трафик. Сервер —
  только под контролем Дани, минимум стороннего софта, свежий TLS, доступ по
  ключу, фаервол.
- **Латентность.** Лишний хоп Москва → регион Supabase добавляет задержку. Для
  не-РФ пользователей это чистый минус (ещё довод за вариант Б).

---

## 2. Nginx: обратный прокси (пример конфига)

Апстрим — `https://igsdwvwiqnozgwczzycx.supabase.co`. Проксируем все пути
Supabase: `/auth/v1`, `/rest/v1`, `/storage/v1`, `/realtime/v1` (websocket!),
`/functions/v1`. Сохраняем заголовки (`apikey`, `Authorization`, `Content-Type`),
CORS, стриминг, таймауты.

Ключевые моменты, без которых не заработает:
- **`Host` = реальный домен Supabase.** Supabase (Cloudflare/Kong) маршрутизирует
  проект по `Host`/SNI. Если прислать `Host: api.iskra-study.ru`, апстрим не найдёт
  проект. Поэтому `proxy_set_header Host igsdwvwiqnozgwczzycx.supabase.co;` и
  `proxy_ssl_server_name on;` + `proxy_ssl_name` на тот же хост.
- **Заголовки клиента (`apikey`, `Authorization`) nginx и так пробрасывает** — мы
  их не очищаем. Явно не переписываем.
- **CORS отдаёт сам Supabase.** Origin запроса — `edu-study-app.vercel.app`,
  апстрим вернёт корректные CORS-заголовки. Мы их **не добавляем** на nginx,
  чтобы не было дублей (`Access-Control-Allow-Origin` дважды → браузер отвергает).
  Если по проверке CORS-заголовков не окажется — включить блок, помеченный ниже.
- **Realtime — websocket.** Нужны `Upgrade`/`Connection` и HTTP/1.1.
- **Стриминг** (Storage, функции, SSE): выключить буферизацию.

```nginx
# /etc/nginx/sites-available/api.iskra-study.ru
# Обратный прокси Искры на Supabase. TLS выдаёт certbot (см. §4).

# Карта для апгрейда websocket (Realtime).
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

# Апстрим-хост резолвится в рантайме через переменную $supabase_host внутри
# server-блока (IP Supabase/Cloudflare меняются), иначе nginx кэширует IP при
# старте. Резолвер задан там же.

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.iskra-study.ru;

    # --- TLS (пути подставит certbot при выпуске, см. §4) ---
    ssl_certificate     /etc/letsencrypt/live/api.iskra-study.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.iskra-study.ru/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;

    # Апстрим Supabase.
    set $supabase_host igsdwvwiqnozgwczzycx.supabase.co;
    resolver 1.1.1.1 8.8.8.8 valid=300s ipv6=off;
    resolver_timeout 5s;

    # Крупные тела (загрузки в Storage, импорт). Подгонять под реальные лимиты.
    client_max_body_size 50m;

    # Общие настройки проксирования для всех location.
    # (дублируются в каждом location через include — см. ниже снипет)

    # --- Auth: вход, токены, настройки (passkeys_enabled и т.п.) ---
    location /auth/v1/ {
        proxy_pass https://$supabase_host;
        include /etc/nginx/snippets/supabase-proxy.conf;
    }

    # --- REST (PostgREST): вся работа с базой под RLS ---
    location /rest/v1/ {
        proxy_pass https://$supabase_host;
        include /etc/nginx/snippets/supabase-proxy.conf;
    }

    # --- Storage: файлы (фото, доска, вложения) ---
    location /storage/v1/ {
        proxy_pass https://$supabase_host;
        include /etc/nginx/snippets/supabase-proxy.conf;
        # Крупные файлы — без буфера, стримом.
        proxy_request_buffering off;
        proxy_buffering off;
    }

    # --- Edge Functions: tts, drive-video, триаж и т.п. (могут стримить) ---
    location /functions/v1/ {
        proxy_pass https://$supabase_host;
        include /etc/nginx/snippets/supabase-proxy.conf;
        proxy_buffering off;              # SSE / потоковые ответы ИИ
        proxy_read_timeout 300s;          # длинные ответы функций
    }

    # --- Realtime: websocket (уведомления, статусы) ---
    location /realtime/v1/ {
        proxy_pass https://$supabase_host;
        include /etc/nginx/snippets/supabase-proxy.conf;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 3600s;         # долгоживущий сокет
        proxy_send_timeout 3600s;
    }

    # Прочее — отбиваем, чтобы прокси не стал открытым релеем.
    location / {
        return 404;
    }
}

# HTTP → HTTPS и ACME-челлендж certbot.
server {
    listen 80;
    listen [::]:80;
    server_name api.iskra-study.ru;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}
```

Общий снипет `/etc/nginx/snippets/supabase-proxy.conf`:

```nginx
# Хост и SNI апстрима — реальный домен Supabase (маршрутизация по Host/SNI).
proxy_set_header Host $supabase_host;
proxy_ssl_server_name on;
proxy_ssl_name $supabase_host;
proxy_ssl_protocols TLSv1.2 TLSv1.3;

# Клиентские заголовки (apikey, Authorization, Content-Type) nginx пробрасывает
# сам. Добавляем только диагностические X-Forwarded-*.
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# Таймаут соединения. proxy_read_timeout/proxy_send_timeout тут НЕ ставим —
# иначе дубль с теми, что заданы в location (functions/realtime). Умолчание
# nginx (60s) годится для auth/rest/storage.
proxy_connect_timeout 10s;

# CORS отдаёт апстрим (Supabase). На nginx НЕ добавляем — иначе дубли заголовков.
# Если проверкой выяснится, что CORS не доходит, включить блок ниже и ОДНОВРЕМЕННО
# скрыть апстримовые заголовки, чтобы не было двойных:
#   proxy_hide_header Access-Control-Allow-Origin;
#   add_header Access-Control-Allow-Origin "https://edu-study-app.vercel.app" always;
#   add_header Access-Control-Allow-Headers "authorization, apikey, content-type, x-client-info" always;
#   add_header Access-Control-Allow-Methods "GET, POST, PATCH, DELETE, OPTIONS" always;
#   if ($request_method = OPTIONS) { return 204; }
```

> Примечание про `proxy_pass https://$supabase_host;` с переменной: nginx тогда
> **не** переносит путь из `location` автоматически так, как при статичном
> `proxy_pass`. Поскольку `location` и апстрим-путь совпадают (`/auth/v1/` →
> `/auth/v1/`), это ок: nginx шлёт исходный URI. Если на тесте пути «съедутся» —
> вернуть статичный `proxy_pass https://igsdwvwiqnozgwczzycx.supabase.co;` без
> переменной (ценой кэширования IP при старте; тогда перезапуск nginx по смене IP).

### 2.1. Проверка прокси (до переключения приложения)

С любой машины вне РФ (чтобы исключить фактор блокировки) и, главное, **из РФ**:

```bash
# Настройки auth (должно вернуть JSON, в т.ч. passkeys_enabled)
curl -sS https://api.iskra-study.ru/auth/v1/settings -H "apikey: <PUBLISHABLE_KEY>" | head

# REST: пустой селект под анонимным ключом (ответ 200/empty или ожидаемый RLS)
curl -sS "https://api.iskra-study.ru/rest/v1/" -H "apikey: <PUBLISHABLE_KEY>" -i | head

# Realtime websocket (upgrade 101)
curl -sS -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZQ==" \
  "https://api.iskra-study.ru/realtime/v1/websocket?apikey=<PUBLISHABLE_KEY>&vsn=1.0.0" | head
```

Критерий: те же ответы, что от `https://igsdwvwiqnozgwczzycx.supabase.co/...`
напрямую, и реальный вход из РФ проходит (`/auth/v1/token` доходит).

> Про realtime: `curl` часто не доводит ws-рукопожатие (ALPN тянет HTTP/2, где
> `Upgrade` невалиден; на HTTP/1.1 клиент ждёт кадры и висит). Надёжнее сырой
> запрос через `openssl s_client` — он показывает строку `101 Switching Protocols`.

### 2.2. Результаты боевой проверки (09.11.2026)

Прокси поднят на VPS `177.177.220.129`, домен `api.iskra-study.ru`, TLS Let's
Encrypt (до 2027-02-07). nginx 1.28.3, Ubuntu 26.04. Проверено с машины **вне РФ**
(прозрачность прокси), прокси vs прямой:

| Путь | proxy | direct | итог |
|---|---|---|---|
| `/auth/v1/health` (с apikey) | 200 | 200 | ✅ (критерий оператора) |
| `/auth/v1/settings` | JSON (google/apple/email) | — | ✅ |
| `/rest/v1/` | 401 | 401 | ✅ идентично |
| `/storage/v1/bucket` | 200 | 200 | ✅ идентично |
| `/realtime/v1/websocket` | `101 Switching Protocols` | `101` | ✅ ws работает |

**Осталось непроверенным:** реальная доступность **из России** (я проверял не из
РФ). Это и есть исходная цель — подтвердить должен РФ-клиент (ученик/оператор):
вход на фронте, где Supabase идёт через `api.iskra-study.ru`, либо
`curl https://api.iskra-study.ru/auth/v1/health -H "apikey: …"` с российского
канала. Пока это не подтверждено, задача закрытой не считается.

---

## 3. Смена адреса Supabase в приложении — опасное изменение

Это **опасный выпуск** по [builds.md](../builds.md) §4 пункты 1 и 3:
`VITE_SUPABASE_URL` задаёт endpoint И неявно `storageKey` сессии.

### 3.1. Почему просто переключить URL нельзя

`src/lib/supabase.ts` создаёт клиент:
`createClient(import.meta.env.VITE_SUPABASE_URL, key, …)`. В supabase-js
(проверено на 2.118.0) из URL выводится **ключ хранения сессии**:

```
defaultStorageKey = `sb-${hostname.split(".")[0]}-auth-token`
```

- Сейчас: `https://igsdwvwiqnozgwczzycx.supabase.co` → `sb-igsdwvwiqnozgwczzycx-auth-token`
- Через прокси: `https://api.iskra-study.ru` → `sb-api-iskra-auth-token`

**Ключ другой → клиент не найдёт сохранённую сессию → разлогинит всех разом.**
Плюс из URL выводятся `authUrl/rest/storage/functions/realtimeUrl` — меняются все
эндпоинты сразу, включая websocket Realtime. И имя межвкладочного лока завязано на
`storageKey` (см. комментарий в `supabase.ts` про «Проверяем доступ…»).

Также: **нативные сборки неделями несут вшитый `dist`** со старым URL (см. память
`iOS bundle stale`). Старые iOS/Android до обновления будут ходить на
`*.supabase.co` напрямую — для РФ это значит, что они **останутся без входа**, пока
не обновятся. Web на Vercel получает новый URL сразу при деплое.

### 3.2. Вариант А — полный свап `VITE_SUPABASE_URL` (простой, но дерзкий)

Поменять env на прод на `https://api.iskra-study.ru`, пересобрать и выкатить.

- **Обязательно сначала закрепить `storageKey`**, иначе разлогин всех. Отдельным,
  более ранним выпуском добавить в `createClient` в `src/lib/supabase.ts`:
  ```ts
  auth: { …, storageKey: 'sb-igsdwvwiqnozgwczzycx-auth-token', … }
  ```
  Значение = текущий выводимый ключ, поэтому для живых сессий это **no-op** (ключ
  тот же), но после закрепления смена URL сессию не роняет. Это само по себе
  пункт §4.1 — катить как опасное, с тестом обновления поверх прошлой сборки.
  Выпустить ПЕРВЫМ, на все 4 платформы, дать нативным сборкам разойтись.
- Плюсы: один env, минимум кода.
- Минусы: **московский VPS становится глобальной точкой отказа и видит весь
  трафик всех пользователей**, +латентность не-РФ. Падение VPS = вход лёг у всех.

### 3.3. Вариант Б — прокси как резерв на уровне fetch (рекомендуется)

Оставить `createClient(DIRECT_URL, …)` как сейчас (значит `storageKey`, Realtime,
все дефолты **не меняются** — не опасно по хранению сессии). Прокси подключить
только в транспорте fetch, который уже обёрнут цепочкой
(`withRequestTiming(diagnosticFetch(authTransport(withRestDeadline(teacherViewFetch, url), url), url))`
в `src/lib/supabase.ts:74`).

**Логика фейловера (уточнено оператором 09.11.2026):**

1. **Короткий таймаут на прямой путь.** Прямой запрос к
   `igsdwvwiqnozgwczzycx.supabase.co` оборачиваем в быстрый таймаут (~2–3 с,
   отдельный `AbortController`, не 60-секундный REST-дедлайн). Если он падает по
   сети (`TypeError`/`Failed to fetch`) или по таймауту — повторяем, переписав
   origin на `https://api.iskra-study.ru`.
2. **Кэш рабочего эндпоинта на сессию.** Как только прокси сработал — запоминаем
   выбор (модульная переменная + `sessionStorage`, напр. `iskra:supabase-endpoint`),
   и дальше **все** запросы идут сразу на прокси, без повторной пробы прямого
   пути. Иначе РФ-пользователь ел бы 2–3 с таймаута на КАЖДОМ запросе. При старте
   сессии читаем кэш; если прокси вдруг отвалится — сбрасываем кэш и пробуем
   прямой снова (самолечение).
3. **Realtime (websocket) — тоже покрываем.** Он не идёт через fetch, поэтому
   обёртка его не ловит. Но `storageKey` завязан на URL **auth-хранилища**, а не
   на endpoint Realtime — значит endpoint Realtime можно переназначить, **не
   трогая** `createClient(DIRECT_URL)` и `storageKey`. Когда выбран прокси,
   переставляем endpoint realtime-клиента на
   `wss://api.iskra-study.ru/realtime/v1/websocket` до первого `channel()` (точка:
   `supabase.realtime.endPoint`/реконнект в realtime-js 2.x — сверить с внутренним
   API при реализации, при необходимости тонкая обёртка). Так websocket РФ идёт
   через прокси, а ключ сессии остаётся `sb-igsdwvwiqnozgwczzycx-auth-token`.
4. **Прямой `*.supabase.co` НЕ отключаем никогда.**

- Чинит вход и REST/Storage/Functions (всё через fetch; `/auth/v1/token` — тоже
  fetch) **и** Realtime (отдельным переназначением endpoint).
- Плюсы: `storageKey` и сессии не трогаются (НЕ опасно по §4.1 — `createClient`
  по-прежнему получает прямой URL), не-РФ пользователи и падение VPS их не
  задевают, старые нативные сборки при сетевом сбое сами уйдут на резерв.
- Минусы: больше кода в транспорте + отдельная ветка для endpoint Realtime.

**Рекомендация (утверждено оператором):** Вариант Б. Не разлогинивает, не делает
VPS глобальным SPOF, покрывает вход и Realtime. Вариант А — только если нужно
быстро и строго с закреплением `storageKey` первым выпуском.

### 3.4. Поэтапный план выката (для рекомендованного варианта Б)

1. **Этап 0 — прокси готов и проверен** (§2.1), адрес приложения не тронут.
2. **Этап 1 — код резерва.** Отдельный PR: fetch-обёртка с фейловером на
   `api.iskra-study.ru` (короткий таймаут прямого пути + кэш эндпоинта на сессию +
   переназначение endpoint Realtime), за флагом (дефолт — direct). Проверка:
   тесты, `tsc`, сборка, QA по [протоколу](../qa/interaction-acceptance.md), обе
   темы, 4 платформы; отдельно проверить, что Realtime РФ идёт через прокси, а
   сессия не сбрасывается. Слияние — только с «да» Дани через оператора.
3. **Этап 2 — web.** Включить флаг/резерв на Vercel (деплой из `main`). Проверить
   вход из РФ и не-РФ. Откат — мгновенный: выключить флаг / откатить деплой.
4. **Этап 3 — нативные сборки.** Новые TF/APK с включённым резервом (чат
   сборок, builds.md §5, тест обновления поверх прошлой сборки S3, совместимость
   S9). Старые установленные сборки продолжают работать: вне РФ — напрямую, в РФ —
   уйдут на резерв по сетевому сбою (если резерв уже в их сборке; если сборка
   совсем старая, без резерва — только обновление).
5. **Старый прямой адрес `*.supabase.co` НЕ отключать никогда** — им пользуются
   живые вкладки и установленные сборки (builds.md §4.3: «новый рядом со старым»).

### 3.5. План отката

- **Web (вариант Б):** выключить флаг резерва или откатить деплой на Vercel —
  мгновенно, сессии целы (URL клиента не менялся).
- **Web (вариант А):** вернуть `VITE_SUPABASE_URL` на `*.supabase.co`, редеплой.
  Так как `storageKey` закреплён — разлогина при откате тоже нет.
- **Натив:** откат = выпуск сборки с прежним поведением (builds.md). Старые сборки
  уже в руках — поэтому прямой адрес и держим живым.
- **Прокси/сервер:** падение VPS в варианте Б не ломает не-РФ (direct по
  умолчанию); в варианте А ломает всех — ещё довод за Б.

---

## 4. TLS: certbot / Let's Encrypt на домене

После того как домен `api.iskra-study.ru` куплен и его A/AAAA-запись указывает на IP
VPS, и nginx отвечает на :80 по `/.well-known/acme-challenge/` (см. server :80
в §2):

```bash
# Ubuntu
sudo apt update && sudo apt install -y certbot python3-certbot-nginx nginx

# Каталог для webroot-челленджа (используется блоком :80 из §2)
sudo mkdir -p /var/www/certbot

# Снипет и сайт на месте:
sudo mkdir -p /etc/nginx/snippets
# (положить supabase-proxy.conf и sites-available/api.iskra-study.ru из §2)
sudo ln -s /etc/nginx/sites-available/api.iskra-study.ru /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Выпуск сертификата (webroot — не трогает конфиг автоматически)
sudo certbot certonly --webroot -w /var/www/certbot \
  -d api.iskra-study.ru \
  --email <admin-email> --agree-tos --no-eff-email

# Пути сертификата уже прописаны в server-блоке (ssl_certificate …live/api.iskra-study.ru/).
sudo nginx -t && sudo systemctl reload nginx

# Автопродление (certbot ставит systemd-таймер; проверить сухим прогоном)
sudo certbot renew --dry-run
```

Хуки продления: после `renew` nginx перечитывает сертификаты сам (deploy-hook
`systemctl reload nginx`), если ставился плагин `--nginx`; при `certonly --webroot`
добавить `--deploy-hook "systemctl reload nginx"`.

---

## 5. Порядок проведения (когда будут сервер и домен)

Это уже с «да» Дани и через оператора «Оператор · пайплайн Искры».

1. Дани даёт доступ к VPS (ssh по ключу) и подтверждает домен.
2. Поднять nginx + конфиг (§2), выпустить TLS (§4).
3. Проверить все эндпоинты с сервера и из РФ (§2.1).
4. Код резерва (§3.3, вариант Б) — отдельный PR, слияние только с «да» Дани.
5. Поэтапный выкат (§3.4), сверяясь с builds.md §4–§5 на каждом нативном шаге.
6. Отчёт оператору: что поднято, что проверено (web/натив/РФ), что осталось.

Чего **не** делаем: не выдаём прокси за 152-ФЗ (§1.1), не отключаем прямой адрес
Supabase, не трогаем `edu-study-app.vercel.app` и passkey RP.
