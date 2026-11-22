# TEXT-02 — SubjectPicker / MobilePill

База 7f82528c, исполнитель S3, публикация S1. Подписи SubjectPicker во всех
трёх формах используют общий text-only механизм; MobilePill — только primitive
children, rich fallback не меняется. Иконки, размеры, keys, native targets,
обработчики, tactile и скрытие меню не менялись.

Карточка до QA, fixture, результаты и PNG:
`~/.codex/iskra-qa/shared-subject-mobile-optical-20261122/`.
12 сочетаний PC1440/1024, iPhone390, iPad820/1194, Android412 × обе темы.
Headless Chrome/macOS; Android — локальный actual Roboto; нет внешней сети.
Реальные before/after компоненты, local state, options 0/1/3/14, размеры sm/md.
Рамки/SVG geometry совпали; выбор возвращает те же IDs. Длинная строка, выбор
последней строки, меню начало/середина/конец, Escape; MobilePill active toggle,
disabled rejection, rich fallback. JSX handlers AST-идентичны. tsc/check:ui PASS.
Просмотрены Android-dark menu и iPhone-light menu PNG.

Исправления стенда: контейнер пикера ограничен шириной родителя (первый вариант
растягивался по intrinsic long label); скролл к триггеру завершён до открытия,
меню снимается viewport screenshot, не меняющим scroll/viewport полной страницы.
Эти исправления не меняли source или логику компонентов. Подписи мобильных
контролов исходного продукта меньше 16px не увеличивались этим optical-патчем.

Не проверены production E2E, WebKit/реальные устройства, вся анимация покадрово.
Общий TEXT-02 rollout остаётся открытым для custom page controls/native fields.
