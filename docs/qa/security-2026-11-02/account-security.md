# Искра: роли, пароли и граница RLS

Продолжение локального исправления 2 ноября 2026. Ничего не отправлено в Git и не применено к внешней базе. База checkout: `d24b14665d8f791517a4bb3cfbffd5ae5f1031ce`; рабочая папка содержит независимые незавершённые изменения других чатов.

## Что изменено

- Новые пользователи получают student, независимо от user metadata. Серверная app_metadata может назначать staff. Восстановлено явное создание Auth-триггера, которое старая snapshot-миграция подразумевала существующим.
- Прямой INSERT привилегированного профиля, изменение role/id из браузера запрещены. Существующие роли не переписаны: перед выпуском нужен разбор их происхождения.
- apply_teacher_invite блокирует строку приглашения, проверяет срок и соответствие email Auth, назначает teacher и настройки доступа. Повтор принятия тем же аккаунтом идемпотентен. Последняя версия из 0047 потеряла проверку срока, имевшуюся в 0036; проверка восстановлена.
- Claim принимает только token/email (email перечитывается из Auth). Старый трёхаргументный RPC совместим, но игнорирует пароль. Legacy sibling RPC стал no-op. Claim сериализован по person_id и ограничен карточками одного владельца; staff-аккаунт не может стать ученическим через claim.
- Reset и provisioning не записывают пароль в public-таблицы. Provisioning всегда генерирует CSPRNG-пароль и ограничивает привязку sibling-карточек владельцем. Ответы с паролем имеют no-store. Reset дополнительно проверяет, что целевой Auth-аккаунт действительно student, а не staff.
- Клиент не передаёт выбранный пароль в claim RPC, не читает/копирует tempPassword, основные списки выбирают явные колонки без исторического пароля. Новый пароль живёт только в памяти панели до закрытия/смены ученика или двухминутного таймера.
- Триггер БД отвергает новые plaintext credentials, включая запись от service_role. Старые значения пока не удалены. Подготовлен отдельный ручной SQL очистки и ограничения `temp_password is null`.
- Прямое изменение auth_user_id запрещено. Вставка привязанной карточки допустима только как копия существующей собственной карточки того же person_id. Это закрывает использование принадлежащей преподавателю строки как прокси для сброса чужого Auth-пароля.
- Дополнительные restrictive RLS-политики требуют is_staff() для записи ресурсов преподавателя. Существующие owner-политики продолжают действовать вместе с ними; SELECT ученика не меняется. Одного самостоятельно выбранного created_by теперь недостаточно.

Подготовлены миграции `20261102074927_secure_roles_and_password_storage.sql` и `20261102075513_restrict_staff_resource_writes.sql`. Они выполнены только на синтетической схеме во встроенном PostgreSQL PGlite. Полная история Supabase, фактические grants/policies/storage и advisors не проверены.

Решение с выдачей пароля один раз сохранено для synthetic email `@uchenik.iskra`, куда письмо восстановления не доставить. Пароль в Auth остаётся обычным паролем, не истекающим одноразовым кодом. UI-таймер ограничивает видимость, а не срок действия пароля. Полноценные приглашения/восстановление и обязательную смену при первом входе нужно проверить/доработать отдельно; открытого хранения ради функции «показать старый пароль» больше нет в новых путях.

## Воспроизведение и результаты

Зависимости для тестов изолированы в `/tmp`, package.json/lockfile ради них не менялись. PGlite: установка `npm install --prefix /tmp/iskra-security-db --ignore-scripts --no-audit --no-fund @electric-sql/pglite@0.5.14`. Playwright использован из уже имевшейся временной установки. Docker daemon недоступен; Docker/VM не запускались.

| Команда | Фактический результат |
|---|---|
| `ISKRA_PGLITE_MODULE=/tmp/iskra-security-db/node_modules/@electric-sql/pglite/dist/index.js node scripts/checkAccountSecurityDb.mjs` | PASS: 29 PostgreSQL assertions. Миграции, fake signup-admin, trusted app admin, запреты прямого повышения роли, anon, email/expiry/idempotency приглашения, claim/siblings, отсутствие пароля, запрет изменения Auth-связи, actual owner-политики students A/B, restrictive staff-политики, ручной cleanup на синтетических значениях. |
| `node scripts/checkPasswordResetSecurity.mjs` | PASS: 29 случаев реальных handler с mocked Auth/DB. Включая staff target → 409, без смены пароля. |
| `node scripts/checkProvisionSecurity.mjs` | PASS: missing/invalid token, owner-фильтрация при forged metadata, случайный пароль, отсутствие persistence. Mocked API, не подлинная JWT-проверка. |
| `deno check --no-config --no-lock supabase/functions/reset-student-password/index.ts supabase/functions/provision-student-account/index.ts` | PASS. |
| `npm run build` | PASS: Vite 18.80 s, PWA generated. Локальная сборка, не production release-check. |
| `npm run check:ui` | Первый прогон PASS с check:homework-facts. Последний прогон FAIL: scripts/checkOverlayFades.mjs:49, новая проверка геометрии software keyboard. Этот файл изменяется другим чатом; текущий общий checkout не имеет зелёного UI gate. |
| `ISKRA_PLAYWRIGHT_MODULE=/tmp/iskra-icon-qa/node_modules/playwright/index.mjs node scripts/checkCredentialsUi.mjs` | PASS: реальный CredentialsSpoiler в синтетической панели с общим OverlayScrollArea, 390/1280 px, reveal/copy, отсутствие исторического пароля и горизонтального переполнения. Шесть снимков credentials-ui визуально проверены: начало/середина/конец, фейды видимы. Это не авторизованный кабинет. |
| `npx --no-install tsc --noEmit` | FAIL: TeacherSelect.tsx:337 TS2339, поле icon отсутствует в одном из типов options. Это независимое текущее изменение общей рабочей копии. |

## Порядок будущей проверки и выпуска — сейчас не выполнялся

1. Явно выбрать staging, проверить бюджет ресурсов и synthetic dataset. Выполнить read-only `scripts/security/inspectAuthorization.sql`. Не превращать существующий profiles.role в app_metadata автоматически: источник мог быть пользовательским. Подтвердить законных преподавателей по истории приглашений/админских действий.
2. На staging выпустить новые Edge Functions, применить две миграции, затем совместимый клиент. Старые cached clients могут продолжать присылать p_password в legacy RPC: он игнорируется, но сетевой payload старого клиента нельзя исправить серверным патчем. Проверить обновление клиента/кеша.
3. Выполнить полный signup/invite/login → назначение → черновик/сдача → проверка → reload, восстановление и несколько предметных карточек. Проверить реальные Auth JWT, ownership и Storage, cross-account матрицу, timeout после commit и повторную отправку.
4. Только после проверки выполнить ручной `scripts/security/clearHistoricalStudentPasswords.sql` на staging; повторить тесты. На production операция отдельно согласуется. Auth-пароли очистка не меняет. Для старых backup/log/export нужна отдельная политика хранения и удаления; автоматической ротации нет.
5. Проверить полную миграционную цепочку с чистой БД, advisors, восстановление backup и Windows Chrome/Edge. Потом отдельный релиз строго по docs/releases.md, с чистой рабочей копией от main. Никакого production сейчас.

NO-GO для реальной беты остаётся: historical credentials, потенциально загрязнённые существующие роли, полная RLS/Storage-матрица и пользовательский E2E ещё не подтверждены. Локальные проверки не являются заключением о текущем production.

Основание для серверного ограничения доступа: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) — grants и policies проверяются отдельно, owner-проверка сама по себе не выдаёт роль преподавателя.
