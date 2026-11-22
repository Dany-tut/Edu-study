# Приёмка пропуска неизменившихся модулей · 22 ноября 2026

- Область: только записи course_modules в content save. База b7673523, итоговый SHA — в Git/квитанции выпуска.
- Причина: после авторитетного чтения id,label,position редактор отправляет PATCH каждой строки даже при совпадении всех двух записываемых полей.
- Инварианты: UUID не выбирается по позиции; visibility flush завершается до content writes; hidden и другие поля не входят в payload. Ошибка чтения/записи прерывает save, черновик не признаётся сохранённым; новый модуль вставляется, переименование/перестановка обновляют нужный UUID.
- До прогона: 4 unchanged→0PATCH; rename→1PATCH; reorder→2PATCH тех же UUID; insert/delete не подменяют UUID; hidden без изменений; ошибка→false→retry; flush unresolved→0writes; failed flush→0writes.
- Данные: синтетические A/B, реальные production source fragments, in-memory transport. Записей в рабочие production-курсы нет.
- ПК/iPhone/iPad/Android: общий алгоритм. Вёрстка не меняется; физические устройства, темы/движение и полный authenticated production UI не принимаются этим тестом.
- Метрика результата: число запросов, а не обещанное время. Новый production latency без реального актуального save остаётся неизвестным.

## Результат приёмки логики

- PASS `checkCourseModuleWrites.mjs`: исполняет реальный fragment editor с контролируемым transport. 4 неизменившихся модуля→0PATCH; rename→1PATCH нужного UUID; reorder→2PATCH без подмены UUID; новый ID→INSERT даже при совпадении label/position; удаление A не заимствует его ID для B. В payload только label/position (+id/course_id для INSERT), hidden и входные данные не изменены.
- PASS: visibility flush не завершён→0 content writes; ошибка flush→0 content writes; ошибка PATCH прерывает последующие записи и возвращает false; повтор обновляет правильные UUID.
- PASS: `checkLatestSaveQueue.mjs`, `check:chapter-variants`: накопление/ошибка/повтор, главы и барьеры остаются.
- Production latency не измерена. Устранены гарантированно лишние запросы, не заявляется заданное число сэкономленных секунд.

- PASS: visibility logic (stable UUID/hidden projection) и actual production autosave effects в Chrome fixture (late ack, latest draft, failure/retry, metadata loading). Это fixture-приёмка, не замер production.
