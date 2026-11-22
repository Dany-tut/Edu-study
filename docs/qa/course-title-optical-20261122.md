# Оптический центр названия курса в левом поле

Прямая задача Дани по скриншотам: текст названия курса ниже центра рамки,
как для одной строки, так и для двух. Исполнитель: Стратег 3; интеграция и
выпуск через Стратега 1/единственного владельца editor.

Область: только scoped CSS .editor-course-title + external patch на import и
className у существующего titleRef textarea внутри LeftCourseMeta.
Editor в ветке не меняется, значение/useContentField/onChange/useLayoutEffect
и сохранение не меняются. Общие GrowTextarea и варианты А/Б не затрагиваются.

План до проверки: настоящий JSX поля, FIELD, исходный sizing effect
на изолированном readonly fixture; заглушка только course/setCourse/titleField.
Обе темы, ПК/iPhone/iPad portrait/landscape/Android, 1/2 строки, focus/selection,
ввод/сокращение, независимая оценка центра видимых глифов и размера рамки.
Native Edge и production для проверки не используются.


## Результат

PASS: 12 комбинаций размеров/тем (ПК 1440×900, iPhone 320/390, iPad
820×1180 и 1180×820, Android 412×915 × две темы), headless Chrome.
Actual textarea JSX/FIELD и существующий autosize effect извлечены без изменения
из временной копии editor после git apply --check/apply external patch.
Scope класса — единственное название курса в LeftCourseMeta.

Поправка: верхний padding calc(12px - 0.16em), нижний calc(12px + 0.16em),
сумма прежняя 24px. Размер шрифта, line-height, рамка, ширина и высота не менялись.
Проверено отсутствие изменений рамки и значения при включении/выключении CSS,
фокус/выделение без геометрического сдвига, смена/сокращение значения, placeholder,
1 строка, 2 строки с явным переносом и естественный перенос длинного названия.
Canvas glyph block center отклоняется от центра рамки максимум на 0.786px
(допуск <1px). Runtime errors отсутствуют. ПК дополнительно DPR2, остальные
DPR1; реальные устройства/движок WebKit не проверялись.

npm run check:ui — PASS. Скриншоты preview-title-{1,2}-{light,dark}.png
просмотрены; production не открывался, Native Edge не использовался.
Артефакты: /Users/dany/.codex/iskra-qa/course-title-optical-20261122/
fixture.tsx, check.cjs, preview.cjs, results.json, PNG и check-ui.log.

External patch: /Users/dany/.codex/iskra-qa/course-title-optical-20261122/editor-integration.patch.
SHA-256: `12e43acb9ce3d290a8fe192dacabaed7353644bf3d11583ba7e63e17577ff429`.
В коммите только CSS/QA. Интеграция/общий constructor/server/WebKit/физические
устройства — за владельцем editor перед выпуском. Итог fixture PASS, полный UI PARTIAL.

## Статус интеграции

Runtime-профиль подключён отдельным узким render-патчем после дополнительного
PASS на настоящем Roboto. В QA используется официальный TTF с OFL только
на локальном стенде; runtime-шрифты и зависимости приложения не меняются.
Дополнительные артефакты: check-roboto.cjs и results-roboto.json в указанном
каталоге QA. Проверка повторяет 12 комбинаций размеров/тем и исходные состояния.
Полный production UI, WebKit и физические устройства не проверены этим стендом.
