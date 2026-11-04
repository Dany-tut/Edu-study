# Standalone ДЗ: сохранение при временном отказе

Карточка до UI повтора исправления, 2026-11-03. База R7 `1bca7601d798abe9edd965a3eb20639804e4cfb4`, отдельная чистая рабочая копия `/tmp/iskra-standalone-fix-r7`; исходный hash-манифест фиксируется до сборки. Проверяющий homework_cycle. Production-style Vite build с локальной API и synthetic A/B. Никаких миграций, правок данных A/B, телефона и production.

Область: главный read active standalone homework; необязательные group subject и bank tasks сохраняют прежнюю деградацию. Кэш — один memory slot сырых определений того же student/group/auth контекста, без progress/grades. Сеть/API/RLS остаются реальными в baseline/recovery; controlled 503/200[]/denied responses явно отмечаются как fault injection, а не реальный backend E2E.

Ожидания до запуска: R7 red теряет A после временного отказа, fix green сохраняет A и свежий progress. Recovery replaces definitions; 200[] removes; subsequent failure does not resurrect. 401/403 fail closed. A/B, group/auth/permission changes and late responses do not transfer a snapshot. Pure loader tests exercise the actual store with controlled dependencies; desktop browser checks rendering with true local data and response fault injection. Time advances only the foreground sync threshold in isolated browser, not data/сервер.

План: baseline A visible → transient503 late refresh → A remains → recovery real200 → A remains →200[] → A disappears →503 → remains absent. Independent B session reads B only. Все submit/write paths blocked by readonly proxy, кроме synthetic auth session creation. Consent local key set only in isolated browser, no consent API write. WebSocket and external Testly sync unsupported/blocked, explicitly outside acceptance. Own static servers loopback only and stop after tests.

До выполнения browser green: NOT TESTED. Предварительно red loader onR7 failed expected at503 retention assertion; fix loader green including0/408/429/timeout,200[],401/403, ownership/group/auth/session changes, lateA/B and optional metadata/bank degradation. Никакой UI fixture не выдаётся за аппаратный E2E. Остальная матрица тем/размеров/движения не затронута этим data fix.


## Результат

Подтверждённый R7 red: после настоящего локального чтения A видна. Контролируемый503 только основного запроса standalone при позднем foreground refresh после SDK retries (~7с на загрузку) даёт `courses:0,lessons:0`; A исчезает. Ровно тот же regression loader на R7 падает на `status503 must retain same-context definitions`.

Исправление сохраняет один in-memory snapshot сырых определений standalone. Контекст содержит studentId,groupId,Auth user/role/app_metadata и входную сессию; прогресс и оценки каждый раз приходят из текущего track. Используется existing loadSequence/isCurrent с проверкой groupId. Auth-снимок перепроверяется после чтений, никаких новых подписок/таймеров нет. Только основной homework read теперь сохраняет статус ошибки вместо превращения ошибки в200[]. Group subject и bank tasks сохраняют прежнюю необязательную деградацию; inline работы не пропадают при отказе банка.

Desktop green на production-style сборке исправления и реальном локальном API:

| Сценарий | Факт |
|---|---|
| Настоящий baseline A | A видна, B отсутствует |
| Поздний controlled503 | A остаётся после обеих загрузок/SDK retries; courses1/lessons1 |
| Recovery real200 | A остаётся, актуальные определения получены заново |
| Controlled200[] | A удалена; courses0/lessons0 |
| Следующий503 | Удалённая A не воскресает |
| Recovery→401 | A очищается |
| Recovery→403 | A очищается |
| Настоящая независимая B session | B видна, A отсутствует |

Actual store loader tests дополнительно прошли0/408/429/TimeoutError, новую редакцию после recovery, свежий score90 поверх cached raw definitions, sibling student при одинаковом Auth/group, смену группы, Auth identity/прав/входной сессии, поздние A после B, поздние старые группы, смену прав в полёте и сохранение деградации group metadata/partialbank. Это controlled-dependency regression actual loader, не замена аппаратному E2E.

Проверки: `node scripts/checkStandaloneHomeworkRecovery.mjs` GREEN; тот же файл с `STANDALONE_SOURCE_ROOT=<R7>` RED; `npx tsc --noEmit`, production Vite build, `npm run check:ui`, `git diff --check` PASS. Guard подключён к check:mobile/check:ui через package script.

Точные desktop переходы для исходного A: Дневник→Задания→кнопка с составным текстом «1 Домашка · Химия QA Physical Homework A К выполнению До10нояб». Для просмотра всех состояний: Журнал работ; нельзя считать отсутствие pending работы в фильтре «Нужно сделать» пропажей каталога. Курс добавлять не требуется.

Вся сеть baseline/recovery/B — настоящая localSupabase с синтетическими сессиями и RLS; только явно перечисленные negative responses внедрены на browser route, без DB mutations. Proxy запрещал все application writes и externalTestly; auth создание synthetic сессий разрешено. Consent local key установлен только в отдельном контексте. WebSocket и ServiceWorker не поддержаны этим static стендом. В процессе native агент мог обновить progress параллельно — наш стенд его не писал и не кэшировал. Нет production доступа, миграций, fixture edits или действий на телефоне.

Граница: desktop data recovery/ownership в указанных случаях PASS; аппаратный auth→submit→teacher→student E2E, темы/размеры/полная motion матрица этим не принимаются. Live Native transport root cause остаётся отдельной диагностикой; воспроизведён сам failure-path и показано, что остановка bridge между тестами может его инициировать. Стендовый транспорт должен жить непрерывно до конца native цикла.
