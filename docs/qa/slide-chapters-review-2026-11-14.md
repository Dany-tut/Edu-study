# Главы записи — проверка 2026-11-14

Область: существующий конструктор ПК, транскрипция/главы. База 1f6c157, ветка codex/slide-chapters-review. Проверяющий и исполнитель — Codex. QA начинается на локальной fixture-сборке из текущего diff, затем release:check и production read-only.

Инварианты: текущие задания Mac не трогаем; слева реплики, в центре существующий плеер, справа существующие поля Главы, крайний рейл уроков без изменений. Переключение наборов не уничтожает правки. Save глав не отправляет transcript/content/media/course/access/schedule. Старые уроки без variants читают timecodes. Ошибки/неопределённый результат не дают ложного успеха, черновик остаётся.

План: оба набора/пустой/5/overflow, seek и двойной клик редактирования времени, title/add/remove, ошибка+retry+reload, A/B и поздний ответ; светлая/тёмная 1440×900, 1024×768, 390×844, 412×915. Плеер: файл и Drive transport, настоящий сетевой Drive при доступе. Секундомеры/поля не добавляем. Нативные устройства и физический Mac преподавателя не считаются проверенными fixture.

Результаты и замеры будут заполнены после прогона; пока NOT TESTED.


## Результаты

- `check:chapter-variants`: PASS. 5 глав → 838 байт, только timecodes/chapter_variants; 2 запроса helper (SELECT+PATCH с RETURNING), 3 при потерянном ответе; дополнительно editor читает stamp курса/других уроков. RLS-empty, конкурентная запись/CAS, lost-response reconciliation, idempotent retry, source mismatch. Общая очередь + просроченное ожидание не запускается позже. Rebasing сохраняет transcript/materials/theory, другой урок и более новую правку.
- Browser fixture с реальными TranscriptionAction/TimecodeRail/RecordingLines/LessonVideoPlayer, Chrome, Tailwind/PostCSS как в приложении: PASS. Seek8s, двойной клик по времени/правка04→05/Enter, названия/переключение обоих наборов/возврат/reload, failed save+retry,5глав, add/remove,30глав и начало/середина/конец overflow. 804–822мс от клика до подтверждения при искусственной задержке transport300мс. Это НЕ production latency. Данные/ответ save подменены.
- ПК1440×900 светлая/тёмная: прежняя композиция. Панель отдельно на1024/390/412×844 обе темы: поля/сегменты помещаются. Это проверка компонента; полный адаптивный конструктор и физические iPhone/iPad/Android здесь не проверены.
- Реальный Google Drive ролик «№32. Простейшие» (36:04,128679617байт): Range206, декодирование и seek8s/19:21 в существующем player PASS. Прямой Google browserURL отвергнут CORS; повтор через локальный прозрачный Range proxy прошёл. Mint авторизованного production ticket подменён, production auth/RLS E2E не заявляется. Локальный MP4 также прошёл.
- Python `test_slide_chapters test_slide_frames`:15 тестов PASS,1 отдельный FFmpeg integration skipped по opt-in. Нечитаемые примеры пользователя не выигрывают у нормального заголовка, но не удаляются безвозвратно; pH/Na/Ёж/ДНК/РНК сохраняются. Предыдущая проверка FFmpeg/VFR не заменяется этим отчётом.
- `npm run check:ui`: PASS (включает новые chapter regression tests). TypeScript локально PASS после итоговых правок.
- Read-only SQL: в исходном курсе47уроков; сумма content/timecodes/materials/homework/test_tasks JSON97408байт. Нельзя приписывать задержку «мегабайтам»: подтверждён лишний общий путь course→modules→all lessons→access/schedule. Теперь главы не проходят через него.
- Миграция20261114162259 additive, применена до клиента. SQL после: прежние14timecodes сохранены, chapter_variantsNULL. Auth/RLS не менялись.
- Артефакты: `.build/qa/1440-{light,dark}.png`, `panel-{1024,390,412}-{light,dark}.png`, `real-drive-19m21.png`, `browser-review.log`. Воспроизведение UI: `CHAPTER_QA_VIDEO=/path/to/18-second.mp4 node scripts/checkChapterReviewBrowser.mjs`. Native launch заглушён, реальный работающий модуль/задания не трогались.

Граница: логика и fixture UI PASS, production authenticated E2E/physical devices NOT TESTED. Нет замера реальной записи пяти глав в пользовательский урок — данные преподавателя ради теста не изменялись. Подмена authenticated ticket и тестового save явно отделена от реальных Drive media/seek.
