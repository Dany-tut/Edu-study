# Транзакционное сохранение существующего курса · 22 ноября 2026

- Область: существующий курс с UUID модулей; общая логика ПК/iPhone/iPad/Android. База `940c88563023b79015e593a1d29225e56a7472d9`, patch/SHA — в итоговом коммите выпуска.
- Причина: последовательные browser→DB обращения занимали 6,651 секунды даже на пустом отдельном черновике. Это ранее измеренный сетевой цикл, не время выполнения SQL.
- Исправление: один `save_course_content` проверяет текущую версию под блокировкой курса и его уроков, пишет поля курса/модулей/уроков и применяет только явные access intents в одной транзакции. Неизменившиеся уроки не обновляются. UUID уроков возвращаются для существующего календарного алгоритма без дополнительного course lookup.
- Отдельные пути: создание курса и восстановленные локальные module IDs сохраняют прежний защищённый алгоритм. Курсы с назначениями могут по-прежнему выполнять дополнительные full-access/schedule запросы. Изменения видимости ждут отдельный существующий flush. Публикация после успешного расписания сохраняется. Нельзя описывать весь save как атомарный: **атомарны content + access**, календарь остаётся последующим этапом.
- Инварианты: auth/ownership/MFA/RLS, append-only history и nonempty guards не ослабляются; версия неизвестна/изменилась → записи нет; ошибка последнего access этапа откатывает content; чужие UUID/refs нельзя перехватить; course/lesson/module payload не пишет ownership, audience arrays, progress или visibility; сохранены manual/publication/chapter barriers и latest-draft acknowledgements.
- Среда: actual SQL в PGlite, контролируемый transport actual `syncCourseNow` source; это не production UI и не физические устройства. Внешний вид не меняется. Темы/жесты/движение здесь неприменимы, полный серверный UI и устройства требуют отдельного прогона.
- Данные: отдельные синтетические A/B course IDs; 0/1/20 уроков. Наполненный SQL snapshot: 3 модуля, 20 уроков, 5 заданий на урок, около 240KB конспектного текста; без production data writes. Production замер/переоткрытие выполняет владелец общего выпуска отдельно.

| Сценарий | Независимое ожидание | Результат/доказательство |
|---|---|---|
| Существующий полный снимок | Один content/access RPC после visibility flush, без preflight GET | PASS actual editor function `qa/course-atomic-save/client.mjs` |
| 0/1/20 уроков | Новый serializer полностью совпадает с baseline serializer | PASS independent execution baseline `940c8856` |
| Metadata/heavy pending | Ноль запросов записи | PASS actual editor function |
| Чужой владелец / anon / MFA не подтверждена | Отказ, данные не меняются | PASS actual SQL + fixture RLS |
| Missing/stale version; direct old-client lesson edit | Отказ до записи; структурированный конфликт | PASS SQL + actual editor |
| Дубликаты UUID/ref, чужой модуль/ref, ownership field injection | Отказ с полным rollback | PASS SQL |
| Ошибка access после content update | Полный rollback курса/уроков/модулей/enrollments | PASS actual access function, snapshot comparison |
| Попытка стереть непустой конспект | Реальный preservation trigger останавливает всю транзакцию | PASS actual production guard function |
| Повтор без изменений, 20 наполненных уроков | UUID/stamps уроков не меняются, новых history entries нет | PASS SQL |
| Контент изменён; module reorder; intentional lesson removal | UUID выживших уроков, progress и visibility сохраняются | PASS SQL |
| Старый snapshot без chapter_variants | Сохранённые главы не стираются | PASS SQL |
| Поздний ACK после новой правки | Последний черновик остаётся новым, stamp ACK не считается edit | PASS actual editor function |
| Ошибка RPC | `false`, прежний baseline и черновик, нет обходного legacy write | PASS actual editor function |
| Manual/publication/chapter, pending collapse | Прежние барьеры и 1 active + 1 latest pending | PASS `checkLatestSaveQueue.mjs`, `check:chapter-variants` |
| Старый module-save loop | Stable UUID, no-op/failure/flush/retry сохранены | PASS `checkCourseModuleWrites.mjs` |

Команды:

```sh
node qa/course-atomic-save/database.mjs
node_modules/.bin/esbuild qa/course-atomic-save/client.mjs --bundle --packages=external --platform=node --format=esm --outfile=node_modules/.cache/course-atomic-client.mjs --log-level=error
node node_modules/.cache/course-atomic-client.mjs
node scripts/checkCourseModuleWrites.mjs
node scripts/checkLatestSaveQueue.mjs
node scripts/checkCourseSaveProvenance.mjs
npm run check:chapter-variants
```

`database.mjs` принимает `PGLITE_MODULE`; по умолчанию использует отдельную QA установку `/tmp/iskra-visibility-test-deps/node_modules/@electric-sql/pglite/dist/index.js`. Зависимость не добавляется в продукт.

Пределы: SQL стенд односессионный, не доказывает нагрузочную конкуренцию реального сервера. RLS матрица моделируется локально, существующие политики production не меняются. Потеря ответа после commit оставляет черновик: повтор с прежним stamp безопасно выдаёт конфликт вместо безусловной перезаписи. Достижение ~1 секунды не заявляется до реального замера наполненного QA курса на опубликованном SHA. Этот документ фиксирует выполненную logic/SQL приёмку; production acceptance остаётся PENDING у владельца выпуска.
