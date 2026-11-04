# R11 Chrome — карточка подготовки

До запуска, 2026-11-03. Exact SHA `b59bcebc3988cd0444ddc24f1aa3ebd1c4654c0d`, версия `1.0.1985`, кандидат `/tmp/iskra-ios-rc11`. Exact dist/release.json и chunk ещё ожидаются. Placeholder не разрешает запуск. Проверяющий homework_cycle; физический телефон сейчас занят приоритетным native E2E коллеги.

Отдельная программа: `/tmp/iskra-chrome-loopback-r11.ZRhlv2`. В ней только test sources и project config, без старых Static assets. После получения exact R11: freeze публичного dist → полный SHA256 manifest → сборка folder resource → сверка compiled teacher chunk → отдельное согласование межсессионного окна с keyboard_gestures.

Статический сервер слушает только iPhone `127.0.0.1:18193`, CSP блокирует API/submit/worker. Продукт не изменяется; test index задаёт route и пассивные реальные scroll/alpha метрики. Synthetic Email `chrome-r11@example.invalid` и пароль не отправляются. Разрешения/настройки не выбирать. Другие вкладки не трогать, свои закрыть; listener.stop после теста.

| Элемент | Независимое ожидание | Статус |
|---|---|---|
| Compact | все элементы/footer видны; при total<=height overflow N/A, оба края opaque | NOT TESTED |
| Email | точное значение после реального ввода | NOT TESTED |
| Password/eye | show точный текст → hide, оба значения и keyboard сохранены, цель>=44pt | NOT TESTED |
| Safe-area | поле/глаз выше native accessory | NOT TESTED |
| OTP | второй Email и Sendcode, без отправки | NOT TESTED |
| Start/middle/end | top0/interior/maxScroll; alpha01/11/10 при overflow | NOT TESTED |
| Reachability | Sendcode+обе legal ссылки hittable, исходный Email сохранён | NOT TESTED |
| Cleanup | own tabs0, listenerstop, сразу вернуть телефон коллеге | NOT TESTED |

Auto video начинается до tap; сохранение на PASS. Raw только в temp, экспорт исключает Home/notifications/autofill. JSON содержит настоящие scrollHeight/clientHeight/top и computed alpha, не заранее ожидаемые значения. Записать фактический maxScroll и длительность.

Границы: без Auth/backend/business E2E, submit, social/reset, native MobileScreen; другие темы/размеры/landscape/zoom/reduced motion, быстрые повторы, числовой контраст и полная покадровая performance не покрыты.

Итог на этапе подготовки: NOT TESTED. R10 уже полностью завершён PASS; его результат на R11 не переносится.

## Отменён до устройства

Root отменил R11 как устаревший до release:check. Exact dist не был получен, Chrome не запускался, устройство/данные/bridge не затронуты. Выполнялась только подготовительная Mac build-for-testing без Static продукта. R11 остаётся NOT TESTED и не допускает переноса PASS сR10. Следующее окно — только после завершения текущего R10nativeE2E и новой финальной базы.
