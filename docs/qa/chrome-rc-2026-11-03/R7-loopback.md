# Chrome R7 — карточка до запуска

SHA `1bca7601d798abe9edd965a3eb20639804e4cfb4`, версия1.0.1952, кандидат `/tmp/iskra-ios-password-rc-r7`; Dist заморожен до запуска, полный manifest-r7.json; TeacherLoginPage-C9qfSbIl.js. Проверяющий homework_cycle, ответственность за продукт — основной агент. Причина повтора: exactSHA после native routing изменения, login по коду идентиченR6.

Изолированный runner `/tmp/iskra-chrome-loopback-r7.11a0uM`, Network listener только iPhone127.0.0.1:18193. Статические public runtimeassets, без listing/source/maps/API; CSP connect-src/form-action none. Testindex только route hash и пассивные scroll/alpha метрики; runtime JS/CSS не изменять. Synthetic `chrome-r7@example.invalid` и пароль только для проверки набора, не отправлять. Никаких аккаунтов/БД/production. Системные Allow/Don't Allow и настройки не трогать.

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


## Результат R7

Физический прогон выполнен в окне, подтверждённом keyboard_gestures; его native E2E не прерывался. Exact SHA `1bca7601d798abe9edd965a3eb20639804e4cfb4`, версия `1.0.1952`, TeacherLoginPage-C9qfSbIl.js. Полный исходный манифест заморожен до сборки; SHA256 compiled teacher chunk в folder resource совпал с кандидатом до запуска. Выбранные hashes и реальные метрики — `r7-loopback/build-result.json`.

`chrome-loopback-r7.xcresult`: единый тест **PASS, 32.601 с**. Продукт, данные и snapshot во время прогона не менялись. Код источника формы не правился. Listener только на iPhone `127.0.0.1:18193`, внешнее открытие Chrome выполнено после READY.

| Проверка | Факт | Доказательство |
|---|---|---|
| Начальная форма | total681 = height681, top0; обе alpha=false; footer виден | compact PNG/JSON |
| Ввод | точный synthetic Email и пароль проверены значениями, без submit | тест + видео |
| Глаз | show дал точный реальный текст, hide вернул маску; клавиатура и Email сохранены | 02b/02c PNG + assertions |
| Цель и keyboard | глаз44×45 pt, поле пароля y341…390, native Hide keyboard y480.67 | native rect log + PNG |
| OTP expansion | второе поле Email и «Отправить код», всего3 input; запрос не отправлен | code-start PNG/JSON |
| Начало | top0 из58, alpha false/true | start JSON |
| Середина | медленный реальный drag с hold: top19 из58, alpha true/true | middle PNG/JSON |
| Конец | top58, alpha true/false, footer y649.625…663.625 внутри681 | end PNG/JSON |
| Достижимость/данные | Send code и обе legal ссылки hittable, исходный Email сохранился после scroll | final assertions + footer PNG |
| Уборка | собственные вкладки count0, listener.stop, runner завершён | итог теста/лога |

После закрытия клавиатуры выполнен отдельный безопасный tap заголовка для снятия фокуса, затем открыт вход по коду. Нативный toolbar coachmark не мешал. Разрешения Allow/Don't Allow и настройки не менялись. Независимый TCP probe к iPhone после stop не выполнялся; подтверждены cancel listener в коде, достижение cleanup-лога и завершение runner.

Видео начинается на локальной странице до первого нажатия поля: первые3с с Home удалены, ранняя нижняя часть кадра закрыта в момент системного автозаполнения, чтобы не сохранять персональное предложение Chrome. Скриншоты содержат только локальную synthetic форму. Просмотрены обзорное видео1fps и контрольные PNG; это не полная покадровая performance-приёмка. Маски на start/middle/end подтверждены и визуально, и фактическими computed alpha-stops.

**PASS** указанной области на exact R7: input/show-hide/keyboard/44pt, compact fit, OTP expansion, начало/середина/конец, alpha, сохранение Email, достижимость и cleanup. **NOT TESTED:** auth/OTP submit/social/reset/полный backend E2E, другие темы/размеры/landscape/zoom/reduced motion, быстрые многократные действия, числовой контраст и полная покадровая performance. Новый native root routing и MobileScreen top-fade подтверждаются отдельной native проверкой ДЗ, этот browser test их не охватывает.

Телефон освобождён и передан keyboard_gestures для native E2E; все свои вкладки закрыты, сервер остановлен. Продакшен не затронут, коммитов и выпуска нет. `git diff --check` артефактов пройден.
