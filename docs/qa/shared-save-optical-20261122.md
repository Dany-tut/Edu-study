# TEXT-02 — TeacherSaveButton

База 52cde907, исполнитель S3, выпуск S1. Карточка до QA и артефакты:
`~/.codex/iskra-qa/shared-save-optical-20261122/`.

Только видимые string/number подписи normal/saving/saved получают OpticalText.
ReactNode-подписи сохраняются. Скрытые width-reserve копии, SVG, анимации,
обработчик onClick и блокировка действий сохранены без изменения.

Chrome headless/macOS, изолированные before/after реальные компоненты.
12 сочетаний: PC1440/1024, iPhone390, iPad820/1194, Android412 × обе темы;
Android использует фактический Roboto из локального QA font-face.
Normal → saving → saved → normal: размеры кнопок и центры SVG до/после совпали;
ширина не меняется между состояниями, включая fullWidth и custom captions.
Click вызывает callback, saving/disabled блокируют; rich fallback не оборачивается.
AST JSX onClick идентичен. Внешние запросы запрещены; никакого сохранения в БД.
Сняты PNG всех состояний. Просмотрены Android-dark normal и iPhone-light saved.

Результат fixture PASS (`results.json`, `handlers.json`). tsc/check:ui PASS.
Это не production E2E, не WebKit и не физические устройства; плавность всего
перехода покадрово не принимается по финальным снимкам. Иконковые
WidgetOpenButton/CourseVisibilityButton исключены: видимых букв у них нет.
