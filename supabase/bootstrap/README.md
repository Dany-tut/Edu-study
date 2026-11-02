# Локальная базовая схема Искры

Это **schema-only snapshot из ранее существовавшего локального Docker-тома** `supabase_db_student-release-db`. Содержимое таблиц не выгружалось. Исходный том монтировался read-only для копирования; отдельная копия PostgreSQL стартовала с `--network none`, из неё извлечены только DDL/grants/policies и конфигурация storage buckets. После извлечения копия и её контейнер удалены. Исходный том не изменён.

Время последнего shutdown по метаданным копии: 2026-10-31 00:41:40 UTC. В снимке есть students.created_by и приватные homework-photos, но нет teacher_lesson_sessions/homework_attempts. Это согласуется с миграциями до `20261030225349`; формальная таблица migration history в томе отсутствует. Это не свежая схема production и не доказательство отсутствия drift.

- `20261030_public_schema.sql`: pg_dump 17.11, public schema, `--schema-only --no-owner`, с grants, функциями, constraints, индексами, RLS и триггерами public-таблиц.
- `auth-triggers.sql`: определения пользовательских триггеров auth.users.
- `storage-policies.sql`: политики storage.objects из локального снимка.
- `buckets.sql`: только конфигурация buckets (имя, публичность, лимит, MIME), без объектов и файлов.
- `private-photo-helper.sql`: зависимость storage policy, восстановленная из исходной миграции `20261030140111_homework_photos_storage.sql`.

Для чистой **локальной** среды: `python3 scripts/security/prepareLocalSupabase.py --workdir /tmp/iskra-local-security-fresh`. Скрипт создаёт isolated unlinked config, устанавливает pg_trgm, адаптирует psql meta-commands в baseline и копирует последующие миграции начиная с `20261031070000`. Исторические миграции репозитория не переписаны. Не выполнять старые CREATE/ALTER повторно поверх snapshot.

Этот bootstrap успешно восстановлен и прошёл 16 последующих миграций в локальном Supabase; новая миграция платежей затем проверена отдельно на той же базе. Самый ранний raw migration chain по-прежнему не является самостоятельным bootstrap: 0003 ссылается на отсутствующую без snapshot таблицу.

**Не применять этот snapshot к production.** Полные исходные DDL/grants сохранены для воспроизводимости, включая исторические определения. Перед созданием аккаунтов обязательны все последующие security migrations. Данных Auth, паролей, токенов и секретов сервиса в экспорте нет; автоматический скан JWT/API-secret patterns дал 0 совпадений.
