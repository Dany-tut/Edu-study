# TEXT-02 — SubjectTabs / календарная часть DateTimeField

База f810f3bc (компоненты ранее неизменны); S3 / выпуск S1. Только tab.label,
цифры дней и заголовок месяц/год. Native date/time input, маски, таймзона,
коммит значения, SVG/обработчики/размеры не меняются.

Карточка/fixture/results/handlers/PNG:
`~/.codex/iskra-qa/shared-tabs-date-optical-20261122/`.
12 сочетаний PC1440/1024, iPhone390, iPad820/1194, Android412 × обе темы.
Headless Chrome/macOS; Android actual Roboto, локальный state и фиктивный env
fixture.invalid/sb_publishable_fixture_only, сеть вне localhost запрещена.
SubjectTabs utility-классы воспроизведены в fixture CSS (не полноценный app build).

PASS: общий размер кнопок/input и SVG positions до/после одинаковы;
«Все» → «Биология» возвращает ожидаемые local store IDs; календарь следующий/
предыдущий месяц → 15 ноября 2026; ввод времени 1230 маскируется 12:30 и возвращает
одинаковое ISO 2026-11-15T09:30:00.000Z в Europe/Moscow. Сравнены calendar day
hitbox, callbacks. Все 11 JSX event handlers AST-идентичны. tsc/check:ui PASS.
Просмотрены Android-dark и PC-light calendar PNG. После pick ждём render/effect,
чтобы проверять controlled input после применения результата, а не предыдущий кадр.

Граница: fixture не доказывает server save, полноценную Tailwind page layout,
WebKit, физические устройства или покадровую плавность всего приложения.
Нативный текст полей не включён в эту текстовую коррекцию календарных кнопок.
