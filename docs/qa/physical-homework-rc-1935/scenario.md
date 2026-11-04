# PHYSICAL-HW-RC1935 · карточка до запуска

- Область: полный цикл обычного ДЗ через установленную native QA оболочку: ученик → отправка → преподаватель → возврат → ученик → новая попытка → преподаватель → принятие → свежий вход ученика/история. Отдельно проверка принадлежности A/B и движения. Это не приёмка всех экранов.
- Риск: потеря новой попытки, чужой ответ под выбранным учеником/ДЗ, поздний ответ после смены, несохранённый результат.
- Ответственные: keyboard_gestures — прогон/доказательства; root — кандидат и решение о выпуске.
- Полный SHA: `d716f312cc74a3c7bbf9e0b799be27d9aede861f`, версия `1.0.1935`. QA копия из отдельного /tmp checkout, только environment/backend/bundle ID; хеши App/web/конфигурации фиксируются перед запуском. Изменение исходников запрещает перенос PASS на новую сборку.
- Устройство: только iPhone Dany `00008150-001A31990C23C01C`, после освобождения homework_cycle; iPhone 17 Pro. Версию iOS и размеры снимаем перед запуском. Другие устройства не трогаем.
- Backend: исключительно synthetic local Supabase Mac. QA origin `http://127.0.0.1:18080` внутри iPhone → loopback runner → mutual TLS только на конкретном CoreDevice IPv6 peer → host loopback → local backend. TLS проверяет цепочки с private QA CA и exact client/server cert pins; транспорт не слушает LAN wildcard. Не устанавливаются системные профили/CA, не отключается TLS. Интернет и редиректы upstream запрещены allowlist. До auth обязателен transport smoke; без него BLOCKED.
- Данные: отдельный namespace physical-rc1925; teacherA/teacherB, studentA/studentB с одинаковым числом назначений, разными IDs/именами/маркерами. ID-манифест без реквизитов сохраняется до UI. Ожидания из подготовленных данных, не из продуктового mapper. 0/1/overflow отдельно; статусы submitted/returned/completed, попытки1/2.
- Инварианты: выбранные owner/student/homework/attempt IDs совпадают с сервером; A никогда не выдаётся за B; повтор не создаёт дубликат; опубликованный результат переживает reload/logout/new login и виден только нужному участнику.

| Элемент | Исходное → действие → итог | Ожидаемые IDs/эффект | Размер/тема/ввод | Факт | Доказательство | Статус |
|---|---|---|---|---|---|---|
| Role chooser, ученик, вход | signed out → ученик → новый вход A | studentA, ownerA, без B | physical portrait/light/touch | | | NOT TESTED |
| Поля/пароль/eye/submit/back | focus → ввод → eye → submit; back/reopen | корректная маска, активное поле над keyboard | physical portrait/light; keyboard | | | NOT TESTED |
| Назначение A и соседнее B | список → A → назад → B → A | точные assignment IDs и разные маркеры | touch/normal/repeat/fast | | | NOT TESTED |
| Ответы/черновик/отправка | пусто → ответ1 → submit | studentA/homeworkA/attempt1 submitted один раз | touch/keyboard | | | NOT TESTED |
| Преподаватель, новый вход | logout → teacherA login → Проверка | очередь ownerA, ответ1 ученикаA | physical/light | | | NOT TESTED |
| Строка работы/ответы/скролл | очередь → работаA → начало/середина/конец | правильные prompt/answer/attempt1, controls hittable | touch/overflow | | | NOT TESTED |
| Комментарий/Вернуть/отмена | comment → cancel → reopen → return | returned только attempt1; комментарий сохранён | keyboard/touch | | | NOT TESTED |
| Ученик A после нового входа | fresh login → result/history → retry | returned attempt1 и его comment; новая attempt2 | light/touch | | | NOT TESTED |
| Исправление/повторная сдача | ответ2 → submit → двойное нажатие | один attempt2; attempt1 в истории | touch/keyboard | | | NOT TESTED |
| Преподаватель принятие | fresh login → attempt2 → score90 → принять | completed/90 только attempt2 | touch/keyboard | | | NOT TESTED |
| Финальная свежая сессия ученика | logout/login → result/history |90, accepted attempt2; история attempt1 returned | touch | | | NOT TESTED |
| Другой участник | studentB/teacherB fresh login | нет содержимого/результата A | touch | | | NOT TESTED |
| Закрытие/back/жесты | открытие → close/back → повтор/быстро | выбор/черновик не теряется; нет случайного submit | touch | | | NOT TESTED |

| Время | Управляемое событие | Инвариант | Факт/доказательство |
|---|---|---|---|
| A→B, A поздно | scoped reverse proxy задерживает только GET A, B завершается раньше | B остаётся выбранным, A не показывается под B | NOT TESTED |
| Ошибка/повтор | один synthetic HTTP503 на save, затем восстановление | черновик сохраняется, одна правильная запись | NOT TESTED |
| Обрыв после сохранения | скрыть ответ уже сохранённого запроса, повтор | нет duplicate attempt/result | NOT TESTED |
| Весь переход | recording до клика, через loading до устойчивого состояния | нет старого ответа под новой шапкой/пустых кадров/скачка целей | NOT TESTED |

- Движение: запись XCTest/video до действия, остановка после завершения; screenshots финала не заменяют motion. При невозможности recording движение остаётся NOT TESTED.
- Матрица сверх основного цикла: dark, landscape, increased text/zoom, reduced motion — NOT TESTED до отдельных проходов. 320/390/tablet/desktop — неприменимы к этому физическому устройству, обязательные клетки общего UI закрывает отдельный отчёт; сюда их PASS не переносится. Hover/Escape — отдельный desktop сценарий, не выдаётся за touch.
- Overflow: начало/середина/конец у ответа, списка, истории и горизонтальных фильтров, если достигаются; фактический перечень записать после инвентаризации.
- Читаемость/палитра/контраст: измерения составных цветов и hit targets сохранять отдельно; до измерений NOT TESTED. Увеличение системных настроек устройства без отдельной координации не выполнять.
- Свежая сессия: UI logout/login, серверная сверка отдельным local reader, другая роль/участник. Не считать API-login заменой UI-login.
- Negative control: тест принадлежности обязан отвергнуть намеренно поданный в QA transport чужой ID; offline fixture assertion не принимать за device negative control.
- Ошибки UI/network, изменения данных и неизменность candidate: журналы с удалёнными credentials/tokens, хеши до/после. Все записи только synthetic namespace. Не публиковать auth traces и скриншоты введённого пароля.
- Предварительный статус: BLOCKED для самого прогона до готовности подписанной QA App/USB транспорта и очереди устройства; все действия NOT TESTED. Заключение отдельно: логика / fixture UI / полный UI+backend / движение / physical device.

Подготовка данных использует выделенный namespace physical-rc1925-* (выделен до смены кандидата); эти же неизменяемые A/B IDs предназначены R5. Предыдущие транспортные неуспехи не являются UI/продуктовой приёмкой и не засчитываются. Все UI клетки ещё NOT TESTED.

Предыдущая R4 UI-наладка: первый selector textFields не соответствовал real secureTextField; затем Auth400 объяснён passwordMatch=false (21 из32 символов XCTest-ввода). UI submit не завершён. Для R5 только четыре scoped synthetic passwords заменены на lowercase ASCII без переключения numeric keyboard; проверяется полное значение через глаз булевымassert, без вывода строки. Auth/видеотрейсы остаются приватно. Транспорт отдельно PASS9.255с, отрицательный client-pin контроль отклонён.
