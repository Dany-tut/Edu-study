# R5 Chrome loopback — карточка до запуска

Дата2026-11-03. Проверяющий homework_cycle. SHA `d716f312cc74a3c7bbf9e0b799be27d9aede861f`, версия1.0.1935, замороженный snapshot R5 ранее зафиксирован в manifest-r5.json; TeacherLoginPage-DAzXzdQ0.js. Отдельный runner `/tmp/iskra-chrome-loopback-r5.kgQfIh`, ресурсы copied до запуска. Только статические JS/CSS, index, четыре публичные PNG; test shell задаёт hash и пассивный sampler scroll geometry/parent alpha mask. Сервер Network.NWListener **только127.0.0.1:18193 на iPhone**, без Mac/LAN/интернета, no listing/source/maps/API. CSP connect-src/form-action/worker-src none. Submit не нажимается.

Среда: физический iPhone17Pro, iOS27.2, Chrome157, портрет402×874pt, светлая тема. Рольteacher, без аккаунта и ввода/отправки данных. Риск: предыдущий LAN прогон остановило системное разрешение Chrome; ни Allow, ни Don't Allow не выбирать. Окно устройства предварительно согласовать с keyboard_gestures. Изменения продукта/данных во время прогона запрещены.

| Элемент | Исходное→действие→итог | Независимый ожидаемый результат | Факт/доказательство | Статус |
|---|---|---|---|---|
| Начальная компактная форма | свежая localhost страница, keyboard closed | все поля/действия/footer помещаются; overflow N/A при total<=height+2; alpha с обоих краёв отсутствует | | NOT TESTED |
| Войти по коду из письма | collapsed→tap→expanded | второй Email и «Отправить код», без отправки | | NOT TESTED |
| Expanded start | finger down до верха | scrollTop0, alpha только снизу при overflow | | NOT TESTED |
| Expanded middle/end | жесты к середине/концу | top/end соответствуют scrollheight; alpha с нужных сторон; все действия и legal достижимы | | NOT TESTED |
| Если expanded fits | expanded без overflow | все элементы/ссылки hittable, нет лишних фейдов; scroll N/A | | NOT TESTED |
| Уборка | закрыть только свои localhost/предыдущуюLAN вкладки | свои count0, listener остановлен | | NOT TESTED |

Движение: автоматическое XCTest video включено с сохранением на PASS, начинается до открытия; sampler читает real scrollTop/clientHeight/scrollHeight и computed mask. Визуальная альфа оценивается по PNG/видео отдельно от CSS-assertions. Если системный prompt мешает, остановить тест без выбора, не считать шаги PASS.

Границы: не auth/backend E2E; не повторяем ввод/глаз (на R5 ранний этап уже доказан), не submitOTP/social/legal навигация. Другие темы/размеры/landscape/reduced motion/zoom/числовой контраст не покрыты. Полная performance и покадровая motion-приёмка не заявляются. Исходный статус: NOT TESTED.
