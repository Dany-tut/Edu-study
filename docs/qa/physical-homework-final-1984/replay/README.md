# Исполняемая последовательность, только local synthetic QA

Скрипты не содержат реквизитов. Им нужны приватные status.json/fixture-private.json, подписанный XCUIrunner с secretKey aliases и уже установившийся pinned mTLS reverse bridge (Mac loopback18082). Product source не инструментируется. Root обязан сверить точныйSHA и заполнитьscenario до запуска.

`replay.py STAGE --fixture-root /tmp/iskra-... --candidate-sha FULL_SHA --allow-device`

Порядок stage: student-first, teacher-return, student-retry, teacher-accept, student-final, student-b. Следующий запуск только после успешного предыдущего. Все стадии исполняются под одним continuousXCTest/bridge; stop между ними запрещён. Первый login идёт через NativeEntry; последующие роли открываются штатным UI. Actor берётся из настоящего server Auth200 response из nativeproxy, refs/owner/student проверяются read-only перед verdict. Ни один helper не заполняет прогресс API.

`student-first-resume` существует исключительно для явно записанной отладки после первого реального login; его использование нельзя скрывать как единый чистый автоматический прогон. `prepare_fresh_fixture.mjs` — отдельный opt-in seed только новых namespace/A/B, отказывается перезаписывать fixture. Не запускать на существующих реальных аккаунтах/production.

Полная видимая рамка цели проверяется выше bottomnav; при offscreen движение выбирается поframe. `isHittable` не достаточен. ОбычныйXCUIввод ждётkeyboardsettle/штатное SelectAll и точныйvalueassert, иначеостанавливаетсядоAuth. Скрипт требует frameprobe в отдельномвременномrunner. Все записи/AX с авторизацией остаются приватно. Проверки движения/визуальнойматрицы и негативные late-response/save scenarios выполняются отдельно, не подразумеваются этим replay.

После R10 replay уточнён для следующего кандидата: после Done проверяется сохранение позиции длинного ответа; consent имеет больший таймаут и проверку checkbox; phase reader требует верифицированного actor у фактического REST-запроса. Это подготовленные guards, они не засчитываются задним числом за R10. Модуль actor guard прошёл три изолированных fixture-проверки (valid, foreign, invalid token), без подключения к устройству или backend; см. next-actor-guard-unit.json.
