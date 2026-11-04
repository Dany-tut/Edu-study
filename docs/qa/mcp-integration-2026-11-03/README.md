# Искра: MCP и настройки интеграций

Кандидат объединяет серверную настройку полного QA и UI чата «Профили Искры, друзья и совместные квизы». **Выпущено в production 1.0.2014, SHA 0c8861014c6f844655c1c96c2a3617b2c7c06125.** [Точный CI](ci-final.json) зелёный, [release до](release-production-before.json)/[после](release-production-after.json) и [version](version-production-after.json) совпали. Vercel dpl_55dncuNCjjB7x2HMimjk17fvFJbG READY; MCP Edge v2. Ниже исторические локальные слои отделены от окончательного production-повтора.

- Настройки → Интеграции на ПК, Ещё → Интеграции на телефоне. Используется одна TeacherModules/ClaudeAccessCard.
- Статус сервиса проверяет стандартный metadata endpoint и совпадение resource/authorization_servers. Выданные приложениям OAuth grants показаны отдельно, с ID. Имя приложения не используется для определения доверия/принадлежности Claude.
- Подтверждение и отзыв привязаны к показанному аккаунту и захваченному bearer. Смена owner, обновление, закрытие, late success/error не переадресуют новую сессию и не перезаписывают её список.
- Consent показывает реальное имя приложения и аккаунт. При ошибке есть повтор. Шапка/действия фиксированы вне масок прокрутки. Исправлен контраст CTA/пояснения в тёмной теме и расположение значка отказа.
- Подключение использует существующий ES256, OAuth server/DCR включены отдельным минимальным config push только трёх auth.oauth_server свойств. Site URL, социальные входы, email/SMTP и остальные21 свойство не менялись. MCP endpoint развёрнут с собственной проверкой user JWT; metadata доступен без входа.

## Финальная приёмка production

**PASS 9/9 групп на точной 1.0.2014**, включая шесть сочетаний320/390/1440 × light/dark, реальный вход/consent/PKCE, четыре MCP-инструмента, ownership/student/published, настоящий путь Настройки→Интеграции с реальными grants, отменой/подтверждением конкретного отзыва и reload. После отзыва bearer и refresh не работают. [Results](production/results.json),[log](production/results.log),[карточка](production/screens/settings-revoked.png). Контраст CTA/пояснения измерен; фейды начала/середины/конца и закреплённые действия просмотрены на телефоне/desktop.

[Очистка](production-cleanup.json):7 таблиц —0 своих записей,3 Auth-аккаунта и6 OAuth-клиентов отсутствуют. [Неиспользованный резервный QAteacher](unused-qa-cleanup.json) также проверен, его сессии отозваны и аккаунт удалён; личный пользователь и клиент Claude не удалялись. У собственных автоматических fixtures не осталось учебных записей или действующих grants.

**Настоящий Claude Desktop:** пользователь лично выдал доступ. В клиенте появились Disconnect и4 реальных инструмента с Needs approval. На финальной1.0.2014 отозван точный выданный grant через UI Искры; Auth подтвердил active 0/revoked 1, Claude показал Connect и отсутствие подключения. [Сводка](native-client-observed.json),[отчёт владельца UI](real-claude/scenario.md). В личном кабинете tools/call не посылались и материалы не создавались; пишущие операции доказаны на отдельном синтетическом tenant собственным MCP-клиентом.

Локальная попытка дополнительного пути настроек после объединения main не стартовала из-за отсутствующего в общей установленной папке @sentry/capacitor. Это ошибка окружения стенда; CI/npmci, production-сборка и последующий полный production-путь выше прошли.

## Доказательства

| Слой | Факт | Evidence |
|---|---|---|
| Реальный OAuth/MCP |9/9: DCR/S256 PKCE, initialize/list4tools, свой draft+module, lesson+notes, test+link/no overwrite, чужой teacher, student, published guard, revoke+access/refresh denial |[protocol](protocol-results.json)|
| Полный UI с настоящим backend |320/390/1440 × light/dark, реальный UI-вход, имя/собственный нормализованный email, deny/approve, PKCE token, те же4tools/ownership/revoke. Все9 групп PASS, автоматические fixture cleanup0 |[results](ui-backend-results.json),[log](ui-backend.log),[320dark](consent/320-dark-0.png),[конец](consent/320-dark-1.png)|
| Контраст consent |CTA≥8.84:1, пояснение≥7.75:1 в light;13.20:1/9.32:1 в dark. Измерены составные цвета с альфой |[log](ui-backend.log)|
| Реальный React lifecycle |Старый confirm/смена owner до auth event, refresh, late DELETE success/error, unmount/remount, clipboard |[card races](card-races.log), scripts/checkClaudeAccessRaces.mjs|
| Реальный consent component/helper |Подмена сессии перед действием, захваченный bearerA, owner change, unmount/remount, поздний ответA, deny redirect |[consent races](consent-races.log), scripts/checkOAuthConsentRaces.mjs|
| UI карточки |Владелец UI:1440/1000/390/320, обе темы, controlled grants/discovery, копирование/retry/конкретный revoke и фейды |/tmp/iskra-mcp-settings-qa/test.mjs и result.json; fixture, не обмен с Claude|

Первый вспомогательный протокольный драйвер пытался разобрать HTML-redirect как JSON даже при наличии Location; исправлен драйвер, не продукт. Первый UI-драйвер сравнивал email с uppercaseA, Auth нормализует адрес в lowercase; исправлено ожидаемое значение. Успешные результаты выше получены заново, свои данные не оставлены этими прогонами.

## Границы и внешняя приёмка

Реальный Claude и отзыв приняты в явно указанной области выше. Браузер требовал action-time подтверждение создания OAuth grant (mcp__cua_repl.js → Computer/Browser Use Confirmation Policy → Safety Floor → «Create or materially expand persistent access»); пользователь выполнил его лично. Auto-review не отклонял выпуск, подтверждение больше не ожидается. Новое подключение после отзыва не выполнялось.

OAuth-токен приложения наследует существующие RLS-права владельца. Указанные ограничения draft/published относятся к четырём MCP-инструментам, а не к заявлению о полном запрете всех прочих Supabase API для такого bearer. Каждый новый tool требует собственного ownership review. Каждый самостоятельный вызов create создаёт новый черновик; автоматический повтор после неопределённого сетевого результата не выполняется. Историю/список нужно проверить перед новым запросом создания.

Физические устройства, полная screen reader/zoom/движение матрица и сторонние MCP-клиенты не приняты этим прогоном. Программный регресс scripts/security/checkProductionMcp.mjs запускается только с ISKRA_PRODUCTION_TEST=approved-isolated-fixture и очищает свои записи.

## Дальнейшая очередь

MCP-окно завершено. Согласована передача очереди: виджеты → исправление3AI-сервисов → аппаратный iPhone. Это отдельные релизы с собственным точнымCI/проверкойSHA. Внешние phrase-help/ielts-grade/cards-extract сейчас имеют отдельно подтверждённый старый upstream401; их готовый фикс ведёт QA, не включён и не объявляется исправленным MCP-релизом. Сданный MCP не означает приёмку всех остальных интеграций.

После завершения этой приёмки main обновлён d45d7bdb другой toolbar-правкой. Доказательства выше остаются привязаны к0c886101/1.0.2014 и не объявляются повтором новогоSHA. Очередь публикаций передана координатору виджетов; он включает новыйmain и повторяет собственныйCI.
