# R11 final Chrome — карточка до запуска

Exact SHA `b7f2fb2e82035e9ed63fb8c14765a07dc8a8a453`, версия `1.0.1994`, кандидат `/tmp/iskra-ios-rc11`. Старый R11 b59 отменён и не используется. Dist/stamp ещё ожидаются, до их сверки запуск запрещён. Source HEAD/version подтверждены, relevant auth/ScrollFade diff отR10 пустой.

Harness `/tmp/iskra-chrome-loopback-r11-final.yCqwnS`, отдельные public folder resources. Сервер Network только iPhone127.0.0.1:18193; CSP запрещает API/submit/worker, нет LAN/интернета/listing/maps. Продуктовые JS/CSS только originaldist; testindex задаёт route и passive scroll/alpha sampler. После exactmanifest и compiledhash verification получить свободное окно у keyboard_gestures, native E2E не прерывать.

Устройство: iPhone17Pro/iOS27.2/Chrome157,402×874pt, портрет, светлая тема. Synthetic Email chrome-r11-final@example.invalid и пароль не отправлять. Начать auto video до первого действия; экспорт исключает Home/notifications/autofill. Никаких системных permission/настроек, чужих страниц, данных ДЗ.

| Элемент | Ожидаемый результат | Статус |
|---|---|---|
| Compact | total<=height, overflow N/A, оба края безalpha, footer виден | NOT TESTED |
| Input/eye | точные значения, show→realtext→hide, keyboard/Email сохраняются, цель>=44pt | NOT TESTED |
| Safe-area | поле и глаз выше native accessory | NOT TESTED |
| OTP | второйEmail/Sendcode, безотправки | NOT TESTED |
| Start/middle/end | фактическийtop0/interior/maxScroll, alpha01/11/10 | NOT TESTED |
| Footer/retention | Sendcode+legal hittable, исходныйEmail сохранён | NOT TESTED |
| Cleanup | своиtabs0, listenerstop, немедленно вернутьphone | NOT TESTED |

Матрица ограничена этим staticbrowserUI. Auth/logout/backend/businessE2E, shared nativeMobileScreen, другие темы/размеры/landscape/zoom/reducedmotion, быстрые повторы, числовойконтраст и полнаяпокадроваяperformance остаютсяNOTTESTED. R10 уже пройден, егоPASS не переносить наR11.

## Отменён до устройства

Root остановил b7f2fb2e как устаревший после изменения main (teacher fades). Product dist не получен, productStatic не переносился, на iPhone ничего не установлено/не запущено. Только Mac prebuild программы теста без продуктовых ресурсов. NOT TESTED; ожидается новая exact база от visual_ui. R10 остаётся последним подтверждённым Chrome SHA.
