# Искра: MCP и настройки интеграций

Кандидат объединяет серверную настройку полного QA и UI чата «Профили Искры, друзья и совместные квизы». До публикации ниже указаны слой и patch hashes; точный production SHA и повтор добавляются отдельно.

- Настройки → Интеграции на ПК, Ещё → Интеграции на телефоне. Используется одна TeacherModules/ClaudeAccessCard.
- Статус сервиса проверяет стандартный metadata endpoint и совпадение resource/authorization_servers. Выданные приложениям OAuth grants показаны отдельно, с ID. Имя приложения не используется для определения доверия/принадлежности Claude.
- Подтверждение и отзыв привязаны к показанному аккаунту и захваченному bearer. Смена owner, обновление, закрытие, late success/error не переадресуют новую сессию и не перезаписывают её список.
- Consent показывает реальное имя приложения и аккаунт. При ошибке есть повтор. Шапка/действия фиксированы вне масок прокрутки. Исправлен контраст CTA/пояснения в тёмной теме и расположение значка отказа.
- Подключение использует существующий ES256, OAuth server/DCR включены отдельным минимальным config push только трёх auth.oauth_server свойств. Site URL, социальные входы, email/SMTP и остальные21 свойство не менялись. MCP endpoint развёрнут с собственной проверкой user JWT; metadata доступен без входа.

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

Настоящий Claude Desktop добавил коннектор и открыл production OAuth consent. Фактическая выдача разрешения через управляемый браузер ожидает action-time confirmation пользователя: mcp__cua_repl.js → Computer/Browser Use Confirmation Policy → Safety Floor → «Create or materially expand persistent access». Отказа auto-review не было. Второй запрос пользователю не создаётся; ожидающий находится в чате настроек. Для внешнего теста подготовлен отдельный QA-преподаватель; его файл с credentials приватный и в отчёт не входит.

9/9 собственного клиента и UI/API выше не выдаются за завершённый обмен настоящего Claude. Финальный внешний тест: approve QA в Claude → создать отдельный draft → подтвердить ID/owner в Искре → revoke конкретного client_id → подтвердить запрет повторного вызова. После него удалить только QA данные/аккаунт.

OAuth-токен приложения наследует существующие RLS-права владельца. Указанные ограничения draft/published относятся к четырём MCP-инструментам, а не к заявлению о полном запрете всех прочих Supabase API для такого bearer. Каждый новый tool требует собственного ownership review. Каждый самостоятельный вызов create создаёт новый черновик; автоматический повтор после неопределённого сетевого результата не выполняется. Историю/список нужно проверить перед новым запросом создания.

Физические устройства, полная screen reader/zoom/движение матрица и сторонние MCP-клиенты не приняты этим прогоном. Программный регресс scripts/security/checkProductionMcp.mjs запускается только с ISKRA_PRODUCTION_TEST=approved-isolated-fixture и очищает свои записи.
