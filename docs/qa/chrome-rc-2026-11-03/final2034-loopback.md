# Chrome final 2034 — карточка до запуска

- SHA: `6d0722d28375d5d7c6ebbbe9a47d7b43a0753c45`, версия `1.0.2034`, кандидат `/tmp/iskra-ios-final-post-ai`.
- Проверяющий: homework_cycle; продукт/интеграция: root. Риск: exact повтор актуальной сборки после post-AI main и исправления поведения клавиатуры.
- Уровень: физический Chrome, статический UI, без Auth/API/БД/submit. Это не бизнес E2E.
- iPhone17Pro, iOS27.2, Chrome157, портрет402×874pt, светлая тема.
- Synthetic Email `chrome-final2034@example.invalid` и тестовый пароль только для локального ввода. A/B, 401/503, late responses неприменимы: сервер данных отключён CSP.
- Изолированный NWListener только iPhone127.0.0.1:18193. CSP connect-src/form-action none; публичные runtime assets, без listing, source maps и сетевых данных. Index изменён только для route и пассивных DOM metrics; runtime immutable.
- Manifest полного dist и SHA256 compiled teacher chunk фиксируются до запуска. До dist ready и явной передачи окна root + keyboard device actions запрещены.

| Элемент | Действие → независимый ожидаемый итог | Факт | Статус |
|---|---|---|---|
| Compact | Закрытая keyboard, все действия/footer помещаются; no overflow → no fades | | NOT TESTED |
| Email | focus→type, точное значение сохранено | | NOT TESTED |
| Password/eye | type→show exact value→hide; keyboard/Email сохранены, глаз>=44pt, поле выше accessory | | NOT TESTED |
| OTP | hide keyboard→вход по коду, второй Email и Send code без submit | | NOT TESTED |
| Start | top0, при overflow alpha только снизу | | NOT TESTED |
| Middle | короткий slow drag+hold; 0<top<max, обе alpha | | NOT TESTED |
| End | top=max, alpha только сверху, Send code/legal hittable, Email сохранён | | NOT TESTED |
| Cleanup | Закрыть только свои tabs, listener.stop, передать телефон keyboard | | NOT TESTED |

Движение: autoXCTest screen recording keepAlways от кадра до actions; реальные scrollHeight/clientHeight/top/computed mask JSON. Экспорт исключает notifications, autofill и чужие страницы. Наблюдаем переходы, не заявляем полноценную покадровую performance приёмку.

Непроверено этим узким повтором: backend/auth/logout/reset/social/OTPsend, shared native MobileScreen и ДЗ, другие темы/размеры/landscape/zoom/reduced motion, быстрые повторы и числовой контраст. Системные разрешения не выбирать; настройки не менять. Исходники/fixture данные во время теста не менять. Состояние: PREPARED, NOT RUN.

Mac build-for-testing PASS; compiled `assets/TeacherLoginPage-CqG0nUr0.js` SHA256 совпал с frozen manifest. Harness `/var/folders/3_/gqk3mxz91979gjvx68gl3h1m0000gn/T/iskra-chrome-loopback-final2034.ky2ejjwp`. Device actions ещё не выполнялись, ожидание явной передачи окна.
