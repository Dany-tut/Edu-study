# TEXT-02 — ProfileChips / FeedRubricChip

База 24b3d299 (сами компоненты ранее неизменны), S3 / публикация S1.
До QA: `~/.codex/iskra-qa/shared-chips-optical-20261122/scenario.md`.
Изменены только подписи: text-only OpticalText, motion-wrapper рубрики и
selected state/цвета/иконки/обработчики/доступные имена сохранены.

Реальные компоненты до/после в изолированном headless Chrome/macOS.
12 сочетаний PC1440/1024, iPhone390, iPad820/1194, Android412 × обе темы;
Android actual Roboto локально, внешняя сеть заблокирована. Initial → selected →
collapsed → expanded: frame/SVG geometry до/после идентична, callback IDs совпали.
Профиль сохраняет aria-pressed, рубрика сохраняет выбранность при скрытии текста.
Снимки всех финальных состояний; `results.json`, `handlers.json` вне git.
JSX event handlers AST-идентичны. tsc/check:ui PASS.

Не production E2E/WebKit/реальные устройства. Полная плавность раскрытия не
доказывается финальными снимками; сохранён исходный motion-контракт без изменений.
PillText исключён: составная многострочная колонка, не центрируемая подпись кнопки.
