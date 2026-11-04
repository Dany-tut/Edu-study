# Chrome R9 /8b411eaa — карточка до запуска

SHA `8b411eaa707fa62405244f469f96876df334ca35`, версия1.0.1978, кандидат `/tmp/iskra-ios-final-candidate`; Dist заморожен до запуска, полный manifest-final.json; TeacherLoginPage-CgFBjLFh.js. Проверяющий homework_cycle, ответственность за продукт — основной агент. Причина повтора: exact final после исправлений logout, staff guard, восстановления standalone и native routing.

Изолированный runner `/tmp/iskra-chrome-loopback-final.YSuN5S`, Network listener только iPhone127.0.0.1:18193. Статические public runtimeassets, без listing/source/maps/API; CSP connect-src/form-action none. Testindex только route hash и пассивные scroll/alpha метрики; runtime JS/CSS не изменять. Synthetic `chrome-final@example.invalid` и пароль только для проверки набора, не отправлять. Никаких аккаунтов/БД/production. Системные Allow/Don't Allow и настройки не трогать.

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



Перед запуском exact manifest заморожен. keyboard_gestures подтвердил безопасное окно ДО свежего native E2E, пока собирается его App. После Chrome cleanup сразу вернуть телефон, не прерывать backend bridge текущего native пути.


## Результат R9 (8b411eaa)

Exact SHA `8b411eaa707fa62405244f469f96876df334ca35`, версия `1.0.1978`. Dist заморожен до запуска, compiled folderresource teacher chunk `TeacherLoginPage-CgFBjLFh.js` сверён с исходным SHA256. Полный манифест в temp, выбранные runtime hashes — `final-loopback/build-result.json`.

Единый физический Chrome тест **PASS,32.634с**. Начало передпервым tap записано видео; процесс открытия через devicectl запущен после READY listener на iPhone127.0.0.1:18193. Ни LAN, ни запросов в API/submit, ни изменения разрешений.

| Элемент | Фактический результат |
|---|---|
| Compact | scrollHeight681=clientHeight681,top0,alpha false/false; форма/footer помещаются |
| Email/пароль | реальные synthetic значения проверены точно; после scroll Email сохранён |
| Глаз/keyboard | show→точный текст→hide; клавиатура сохранена; глаз44×45pt |
| Safe-area поля | пароль y337…386, native Hidekeyboard top480.67; поле/глаз вышеaccessory |
| OTP expansion | второйEmail+Sendcode, всего3inputs, безотправки |
| Реальный maxScroll | **58px =739−681** |
| Начало | top0/58,alpha false/true |
| Середина | top14/58,alpha true/true |
| Конец | top58/58,alpha true/false; обеlegal y649.625…663.625 внутри681 |
| Достижимость | Sendcode и обеlegal ссылки hittable |
| Cleanup | собственные вкладки count0, listener.stop выполнен, runner завершён |

После cleanup телефон сразу передан keyboard_gestures на свежий непрерывный native E2E; его bridge и данные ДЗ не трогались. Только Mac артефакты после этого. Другие пользовательские вкладки не открывались/не закрывались.

Сохранены PNG, реальные JSON scroll/alpha и безопасное видео. Первые4с с переходом между приложениями удалены; earlyнижнийблок видео закрыт при nativeautofill предложении. Последующие поля/фейды видны, контрольные PNG чистые. Просмотрены обзор1fps и контрольные start/mid/end/keyboard PNG; полную покадровую performance приёмку не заявляем. Отдельный TCP probe iPhone после stop не выполнялся — подтверждены вызовcancel/listenerstop,cleanup лог и завершениеrunner.

PASS толькоперечисленной области наR9. NOT TESTED: auth/logout/teacherstaffsubmit/OTPsend/social/reset/backendE2E, другие темы/размеры/landscape/zoom/reducedmotion/быстрые повторы/числовойконтраст. Shared native MobileScreen mask и student/teacherbusinessпуть принимает отдельный nativeцикл. Указанный R9 не является доказательством нового R10(84dea078), подготовка которого началась уже после этого прогона.

`git diff --check` артефактов PASS. Коммитов/публикации/production операций нет.
