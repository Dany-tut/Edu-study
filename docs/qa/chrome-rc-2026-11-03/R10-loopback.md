# Chrome R10 /84dea078 — карточка до запуска

SHA `84dea0784d0f162529077753da45908ab0121be6`, версия1.0.1984, кандидат `/tmp/iskra-ios-device-release-check`; Dist заморожен до запуска, полный manifest-r10.json; TeacherLoginPage-CH-vm3Ch.js. Проверяющий homework_cycle, ответственность за продукт — основной агент. Причина повтора: exact final после исправлений logout, staff guard, восстановления standalone и native routing.

Изолированный runner `/tmp/iskra-chrome-loopback-r10.ntNDV2`, Network listener только iPhone127.0.0.1:18193. Статические public runtimeassets, без listing/source/maps/API; CSP connect-src/form-action none. Testindex только route hash и пассивные scroll/alpha метрики; runtime JS/CSS не изменять. Synthetic `chrome-r10@example.invalid` и пароль только для проверки набора, не отправлять. Никаких аккаунтов/БД/production. Системные Allow/Don't Allow и настройки не трогать.

Устройство: iPhone17Pro, iOS27.2, Chrome157, портрет402×874pt, светлая тема. Запуск только в согласованное с keyboard_gestures окно после приоритетного nativeДЗ; сейчас устройство не используется.

| Элемент | Действие/ожидаемый результат | Факт/доказательство | Статус |
|---|---|---|---|
| Compact | initial closed keyboard; total<=height+2 → overflow N/A, alpha none; все действия/footer видны | | NOT TESTED |
| Email | focus→type→точное значение | | NOT TESTED |
| Пароль/глаз | type→show exact text→hide; прежние значения и keyboard; target>=44pt и поле над accessory | | NOT TESTED |
| OTP | hidekeyboard→tap вход по коду→второйEmail+Sendcode, безsubmit | | NOT TESTED |
| Expanded start | жест до top0, alpha только снизу приoverflow | | NOT TESTED |
| Expanded middle | медленный короткий drag сhold, фиксировать реальный top; обеalpha толькоесли достигнута середина | | NOT TESTED |
| Expanded end | top=maxScroll, alpha только сверху; Sendcode/legal hittable; Emailсохранён | | NOT TESTED |
| Cleanup | закрыть только свои тестовые вкладки, listenerstop | | NOT TESTED |

Наблюдение начинается до actions: autoXCTestvideo keepAlways; реальные scrollHeight/clientHeight/top и computed parentmask сохраняются вJSON. До публикации артефактов исключить notifications/чужие страницы. Не выдавать bootstrap/состояние послеожидания за полную motionприёмку.

Отказы/гонки серверных данных неприменимы — нетsubmit и API; все переходы принадлежат локальной форме. Непокрытая матрица: auth/social/reset/OTPsubmit/E2E, другие темы/ширины/landscape/zoom/reducedmotion, числовойконтраст и полная покадроваяperformance. Native routing и MobileScreenмаска относятся к отдельному nativeДЗ тесту.

Исходный статус: NOT TESTED. Исходники/fixtureданные во времяпрогона не менять. Отчёт только для exactфайлов, прошедшихhashсверку.



Перед запуском exact manifest заморожен. Текущий native E2E не прерывать: для R10 нужно новое согласованное межсессионное окно, пока его нет. После Chrome cleanup сразу вернуть телефон, не прерывать backend bridge текущего native пути.



R10: подготовка и exactmanifest до запуска. Никаких deviceactions на этой сборке пока не выполнялось; общий повтор conditional по решениюroot и actualfinalSHA.

Перед запуском keyboard_gestures подтвердил новое безопасное межсессионное окно: его R9 native session завершён до сдачи, R10 App/runner собираются на Mac. Build-for-testing Chrome PASS; compiledteacherchunk SHA256 совпал с manifest R10. Послеcleanup немедленно вернуть устройство.


## Результат R10

Exact SHA `84dea0784d0f162529077753da45908ab0121be6`, версия `1.0.1984`. Frozen manifest сохранён до запуска, compiled `TeacherLoginPage-CH-vm3Ch.js` совпал с исходным SHA256. Детальные hashes/JSON — `r10-loopback/build-result.json`.

Единый Chrome iPhone loopback тест **PASS,33.659с**. Окно подтверждено keyboard_gestures между сессиями: его R9 прогон завершён до сдачи, R10 ещё собирался на Mac. Ни нативное приложение, ни backend bridge, ни данные ДЗ в этом браузерном прогоне не использовались.

| Элемент | Факт |
|---|---|
| Компактная форма | scrollHeight681=clientHeight681,top0,alpha false/false; overflow N/A |
| Input/eye | точные synthetic Email/пароль, show→realtext→hide, keyboard и значения сохранены |
| Цель/safe-area | глаз44×45pt, пароль y337…386, native accessoryHidekeyboard y480.67 |
| OTP | второйEmail+Sendcode; всего3inputs, безотправки |
| Реальный maxScroll | **58px =739−681** |
| Start/middle/end | top0/14/58; alpha false/true → true/true → true/false |
| Footer | Sendcode и обеlegal ссылки hittable; legal y649.625…663.625 внутри681 |
| Retention | исходный Email сохранился после прокрутки |
| Cleanup | own tabs count0, listener.stop и завершение runner подтверждены |

Сохранены чистые PNG, реальные computed mask/scroll JSON и безопасное видео. Экспорт начинает локальную страницу после первых4с перехода; earlyнижняя часть закрыта в момент системного autofill, чтобы не сохранять персональное предложение браузера. Control PNG содержат только synthetic форму. Просмотрены обзор1fps и start/middle/end/eye PNG; полную покадровую performance приёмку не заявляем.

Разрешения и настройки не изменялись. После cleanup сразу передан телефон keyboard_gestures на непрерывный R10 native E2E; повторных deviceactions не было. Server только iPhone127.0.0.1, listenerstop вызван; отдельный TCPprobe после остановки не выполнялся. Никакого submit, авторизации, API, production, миграций, коммитов или fixturewrites.

PASS ограничен input/show-hide/keyboard/44pt, compactfit, OTPexpansion,3 scroll положения/alpha, reachability иcleanup на exactR10. NOT TESTED этим прогоном: backend/auth/logout/social/reset/OTPsend/businessE2E и shared native MobileScreen, другие темы/размеры/landscape/zoom/reducedmotion, быстрые повторы, числовойконтраст и полная покадровая performance. Native ДЗ принимает отдельный агент.

`git diff --check` артефактов PASS. Сборка кандидата не изменена.
