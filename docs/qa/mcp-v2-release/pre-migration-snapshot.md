# MCP v2, этап 1 — адресный снимок перед миграцией (26.11.2026)

Миграция `mcp_scopes_log_activity` только добавляет таблицы, функции и AFTER-триггер
на `lesson_progress`; строки не меняет. Снимок затронутой таблицы — count + md5
(docs/data-preservation.md, памятка «без полного бэкап-скрипта»):

| Таблица | Время (UTC) | Строк | md5(id:status:md5(comment):md5(attachments):updated_at) |
|---|---|---|---|
| lesson_progress | 2026-11-26 01:00:20 | 1316 | 73d62659dce311426f7f1986a2b0de90 |

Новые таблицы `mcp_grant_scopes`, `mcp_call_log`, `student_activity` до миграции отсутствуют (0 из 3).

## После миграции (Дани применил в SQL Editor, 26.11.2026)

- Созданы `mcp_grant_scopes`, `mcp_call_log`, `student_activity`, функции `mcp_*`, `private.record_student_activity`; триггер `record_student_activity` включён; RLS на всех трёх; у `anon` нет EXECUTE на `mcp_*`; у `anon`/`authenticated` нет прав записи в новые таблицы.
- `lesson_progress`: 1316 строк, md5 `73d62659dce311426f7f1986a2b0de90` — совпадает со снимком.
- Проба под ролью учителя (транзакция с откатом через исключение): старое подключение = прежние права; `events:read` → insufficient_scope; само-выдача прав токеном помощника → отказ; прямая вставка в журнал → отказ; чужих событий 0; выдача из сессии Искры отбрасывает неизвестные права; после отзыва → revoked. После пробы в таблицах 0 строк.
- Функция `iskra-mcp` выложена (`--no-verify-jwt --use-api`): `oauth-protected-resource` отвечает, POST без токена → 401 с `WWW-Authenticate: Bearer resource_metadata=…`.
