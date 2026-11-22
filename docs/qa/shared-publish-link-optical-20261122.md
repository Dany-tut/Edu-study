# TEXT-02 — DraftPublishToggle / LessonLinkAttach

База 0f0a4445, S3 / выпуск S1. Только видимые подписи переключателя и двух
кнопок «Добавить» используют OpticalText. Скрытый width-reserve, действия,
native input, URL parsing, цвета, таймер сообщения, SVG не менялись.

Карточка/fixture/results/handlers/PNG:
`~/.codex/iskra-qa/shared-publish-link-optical-20261122/`.
12 сочетаний PC1440/1024, iPhone390, iPad820/1194, Android412 × обе темы,
headless Chrome/macOS; Android actual Roboto из приватного QA font-face.
Реальные before/after компоненты с локальными callback, сеть запрещена.
Render import lessonFiles требует init клиента: в bundle только заведомо
фиктивные fixture.invalid/sb_publishable_fixture_only, без production env/ключей.

PASS: frame/SVG geometry до/после совпадает; нажатие активного черновика
показывает локальное сообщение без публикации; publish→draft сохраняет callback
порядок. Панель: invalid URL сохраняет введённое и показывает ошибку, valid+Enter
вызывает onAdd/onCancel; обычный/compact attach добавляет ту же URL, Escape
закрывает без onAdd. Все 10 JSX event handlers AST-идентичны. tsc/check:ui PASS.
Просмотрены Android-dark/iPhone-light PNG. Callback fixture не доказывает
реальное сохранение/публикацию курса в сервере. WebKit/устройства/production E2E
не проверены; массовая приёмка всех page controls не заявляется.
