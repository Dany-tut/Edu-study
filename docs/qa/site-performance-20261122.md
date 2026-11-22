# Производительность Искры · 2026-11-22

База: 940c88563023b79015e593a1d29225e56a7472d9 / 1.0.3539.
Ветка: codex/course-save-fast-20261122. Отдельная рабочая копия; чужой WIP исключён.

Поручение: десять направлений анализа всего сайта, реализация проверенных оптимизаций, выпуск, реальный замер наполненного курса с целью около секунды. Лимит исполнения: три вспомогательных агента одновременно; задания идут очередями.

## Границы и ожидаемый результат до проверки

- Сохранение: подтверждённая запись, проверка серверной версии, авторизация/RLS/MFA, история и защита непустого содержимого сохраняются. Очередь, главы, поздние ACK и независимая видимость не меняют смысл.
- Наполненный QA: отдельный черновик без назначений и уведомлений, известные числа модулей/уроков/глав и размер payload. Рабочие курсы не изменяются.
- Время сохранения: первый сетевой запрос → последний успешный ACK; debounce и задержки инструмента отдельно. Проверка содержимого после повторного открытия обязательна.
- Вкладки/загрузка: сокращение лишнего кода/запросов подтверждается соответствующими тестами и сборкой. Байты и число запросов не выдаются за измеренные пользовательские секунды.
- ПК/iPhone/iPad/Android: общая логика; физические устройства не проверены этим чатом. Сборки приложений не выпускаются.

## Карточка сценариев

| Сценарий | Независимое ожидание | Результат |
|---|---|---|
| Успешное сохранение наполненного курса, затем открыть заново | Полное содержимое, модули, главы, IDs сохранены | NOT TESTED |
| Другая вкладка изменила данные | Устаревшая запись отклонена без частичной записи | NOT TESTED |
| Ошибка в середине записи | Откат транзакции, черновик остаётся | NOT TESTED |
| Чужой курс/урок/module ID | Запрет без изменений другого курса | NOT TESTED |
| Новая правка во время ACK | Поздний ответ не стирает новую правку | NOT TESTED |
| Старый клиент после миграции | Прежние пути продолжают работать | NOT TESTED |
| Быстрое повторное открытие вкладки | Нет повторной загрузки одинакового кода/запроса | NOT TESTED |
| Смена аккаунта во время загрузки | Ответ прошлого пользователя не применяется | NOT TESTED |

## Аудит: подтверждено исходниками, без заявления о времени

1. Startup: decoded начальная оболочка 1189685 B; entry 497810 B на проде3539. Отложить стикеры; тяжёлая оболочка преподавателя требует отдельной декомпозиции.
2. Навигация: ленивые Supabase builders каталогов конструктора не запускаются до await; расписание перечитывается из-за гидратации групп/учеников.
3. Интернет-исследование: PostgREST один запрос = одна транзакция; invoker RPC и существующий sharedQuery предпочтительнее смены стека. Источники: https://docs.postgrest.org/en/v13/references/transactions.html ; https://supabase.com/docs/guides/database/functions ; https://vite.dev/guide/features.html#async-chunk-loading-optimization ; https://web.dev/articles/optimize-long-tasks .
4. Ученик: обычный урок ждёт три чужих конспектных чанка; календарь и трек повторяют каталог, realtime может запускать полную загрузку пачками.
5. Сохранения: ДЗ ждёт двух чтений полного списка после ACK, затем UI держит ещё1600мс. Изменения roster/предметов заняты другим исполнителем и не входят в этот патч.

## Реализовано и проверено до выпуска

6. Rendering: serializer курса использует Map уроков вместо повторных find; синхронный durable draft не отключён. Более крупная виртуализация и разбиение shell требуют отдельных измерений.
7. Network: focus+visibility объединяют фоновый refresh, explicit mutation reload сохраняет барьер. REST mutation не прерывается пробным таймаутом2500мс и не повторяется вслепую на proxy; первый неизвестный маршрут выбирается безопасным HEAD.
8. Content/access: actual SQL/RLS/preservation и actual editor tests PASS, см. course-atomic-save-20261122.md. Существующий курс с UUID modules:1RPC; расписание/full-access после него сохраняют прежние отдельные этапы. Старые/новые локальные module IDs остаются на legacy path.
9. Navigation: actual schedule hook и constructor loader tests PASS, см. qa/site-performance/navigation-report.md.
10. Startup: lazy sticker gate/modal, per-subject authored chunks helper; tests PASS. Caller studentDataStore **исключён до освобождения файла владельцем multisubject**, поэтому предметное сокращение загрузки пока не активировано. Предложение отдельным patch.

Домашки: подтверждённые create/update/close сразу публикуются в shared snapshot; полный reload работает фоном. Чтение, начатое до ACK, не может восстановить старую строку. Auth scope и server updated_at (включая микросекунды) отсекают поздние ACK. Убран искусственный1600мс переход после публикации ДЗ. Tests shared-ack/homework-ack/failover/navigation/chunks PASS; сценарии actual source с controlled network, не реальный prod E2E ДЗ.

React review: lazy на уровне модуля, hook order стабилен, suspense ограничен необязательным gate, raw week и локальная проекция разделены, side effects имеют cleanup, чужой auth response скрывается до применения.

## Подготовленный наполненный production QA

UI duplicate создал независимый draft `00e3a0efbf` (`d3a1201a-1caf-47ce-9c17-7c980e151fcf`), название «QA скорость · 80 уроков · 2026-11-22», без назначений.4модуля,80уроков,599788 B JSON content/homework/test_tasks/materials,0 timecode глав. Контентный fingerprint с UUID/refs: b8892f9d1dd65fc517b1400f7ba9ea93.

Baseline:1.0.3539/940c8856, session a67ce2b3-3c63-4219-93f3-ffc042e9010f. Одно изменение названия09:08:48.487–48.677Z. Network09:08:49.611→09:09:00.426Z =10.815с.7success requests: GETcourses602, GETlessons1122, POSTcourses697, GETmodules1150, POSTlessons4396, DELETElessons1591, accessRPC1227ms. Desktop_people excluded. После readback title подтверждён, fingerprint/599788B/80lessons/4modules не изменились. Это один прогон, не p50/p95. Debounce/CUA время не включены. Postfix реальный замер PENDING.

Непроверенные/отложенные направления не выдаём за готовые: student calendar/track aggregate, realtime full-load coalescing, homework-review transaction, lesson-publication transaction, task-bank auth/inflight, shell decomposition, полная матрица вкладок на физических устройствах. Аудиты выявили кандидатов, но безопасный выпуск включает только перечисленные правки.

Backend migration `20261122091224_course_content_atomic_save` применена через Supabase MCP после локальной actualSQL проверки. Remote history соответствует. SECURITY INVOKER, empty search_path, anon EXECUTE=false/authenticated=true подтверждены read-only metadata. Новых security advisor, связанных с функцией, нет; старые unrelated advisors сохранены до/после, политики не изменены.
