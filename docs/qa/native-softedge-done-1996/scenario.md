# QA карточка до запуска: Done и soft edge

- ID: NATIVE-DONE-FADE-1996. Ответственный за фикс: visual_ui; проверка: keyboard_gestures.
- SHA: 3bb818ea5b22ea1a91cea683bc4c928a9ec0731a, версия 1.0.1996, отдельная подписанная QA оболочка. Это fix branch, не финальный release SHA.
- Устройство: физический iPhone 17 Pro, iOS27.2, portrait/light. Точный ID и auth traces приватны. Только QA app; другие приложения и системные настройки не трогаем.
- Backend: изолированный локальный Supabase через прежний pinned mTLS peer/loopback transport. Используем ранее подготовленную, но не использованную пару B7; никаких реальных данных, reset или submit/verdict.
- Независимые IDs A: student=e1bd2148-3b99-4f58-a1ec-5066bef2fd1f, homework=dbc3279e-28ed-4515-a9b5-a0e70c07a974, ref=hw-dbc3279e-28ed-4515-a9b5-a0e70c07a974. B отличается всеми IDs и именами при таком же количестве задач. Ожидается progress0 у обеих сторон до/после.
- Риск: закрытие клавиатуры сбрасывает страницу вверх, ответ теряется; текст остаётся контрастным под нижними progress/nav вместо fade.

| Элемент | Действие и ожидаемый результат | Размер/тема | Факт/доказательство | Статус |
|---|---|---|---|---|
| Обычный вход A | Роль → реальные credentials/eye/exact assert → кабинет, только A | portrait/light/keyboard | | NOT TESTED |
| Длинный ответ | Заполнить6 и уникальный длинный ответ, поле над клавиатурой | overflow/touch | | NOT TESTED |
| Done | До клика recording; после blur длинное поле остаётся видимым, value сохранён | touch/keyboard hide | | NOT TESTED |
| Прокрутка | Начало/середина/конец; сверху и перед progress/nav виден content fade, controls вне маски | portrait/light | | NOT TESTED |
| Cold/reopen | Оба черновика восстановлены без server submit | normal/repeat | | NOT TESTED |
| Logout/границы | Обычный logout, scoped server count0 до/после, listener stop | synthetic only | | NOT TESTED |

- Отрицательный контроль: исходный R10 reset доказан recording и source; новый guard должен его отвергнуть.
- Поздние A→B, save error/retry, double submit и full review cycle: не входят в этот короткий smoke, NOT TESTED. Отдельный полный replay нужен на финальном SHA и свежей паре.
- Dark/landscape/large text/reduced motion/палитры/контраст/все размеры целей: NOT TESTED. Desktop и Escape не применяются к этому физическому smoke.
- Движение: native XCTest recording до Done, screenshots после стабилизации; один screenshot не доказывает отсутствие рывка. Публикуем только проверенные post-auth фрагменты.
- Предварительный итог: до установки и действий все клетки NOT TESTED.

Дополнительная карточка до первого касания: по поручению root проверяем нетронутое B (A уже имеет заполненный локальный draft и другую высоту summary). Без скролла страницы ДЗ: AX tap, физическая точка у верхней строки textarea, центр, повтор верхней точки. Перед каждым действием фиксируем полностью видимый frame и screenshot, после — keyboard presence и собственный Keyboard Focused через0.7 и2с. Между повторами только штатная навигация Diary→B, без изменения ответов. Все четыре состояния до запуска NOT TESTED. Любое различие AX/координатного касания отмечаем отдельно, а не объявляем общий focus PASS.
