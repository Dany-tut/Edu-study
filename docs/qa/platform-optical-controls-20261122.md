# Общие оптические подписи — первый готовый контракт и NativeSelect

Прямое поручение Дани: довести оптическое выравнивание по всей платформе в обеих
темах; готовые изменения публикует Стратег 1. База fc12c57c (main3564).
Это отдельный shared-family этап; он не заменяет приёмку всей платформы.

## Реализация

- OpticalText принимает только строку/число. Соседние SVG, badge, действия,
  корпус и hitbox остаются вне текстового сдвига.
- Поправка определяется фактическим шрифтом/размером/весом через Canvas font/glyph
  bounds контрольного русского/латинского набора. Общая baseline одинакова для
  всех подписей одного шрифта: смена слова/цифр её не прыгает. Ограничение ±0.15em.
- Один observer на набор opt-in refs, read→write разнесены по пакетам, cache256
  хранит только шрифты/числа, не пользовательские строки. Не происходит DOM
  wrapping/reparenting, чтения/записи input.value, вызовов save/auth/API/хранилища.
- Текст за экраном не измеряется по шрифту до приближения к viewport.
- Недоступный Canvas/неполные метрики возвращают 0 — сохраняется обычный текст.
- FadeText получает optical=false по умолчанию. Его прежний DOM без opt-in
  сравнивается с зафиксированным markup до изменений; rich children не двигаются.
  Title и fade атрибуты сохраняются и при opt-in.
- Первая интеграция: только NativeSelectField displayValue (строка) через
  FadeText optical. Native select/option/props/onChange, область нажатия и стрелка
  не меняются. Existing btn/helper и его call-sites этим этапом не переписываются.

Ранее проверенный фиксированный -0.08em отклонён: с настоящим Roboto цифры2026
уходили вверх на1.45px. Адаптивный контракт прошёл SF/Arial/Roboto и сохраняет
baseline группы. Шрифты Google Fonts Roboto+OFL скачаны только в приватный QA;
в runtime нет новых font-файлов, пакетов, запросов или внешних зависимостей.
API font metrics описан в HTML Standard (canvas/TextMetrics); при отсутствии
нужных свойств измерение безопасно отключается.
https://html.spec.whatwg.org/multipage/canvas.html#textmetrics

## Проверки

1. NativeSelect before/after настоящих компонентов:12 размеров/тем ×3 формы
   ('Другая группа','QA','2026'), включая реально загруженный Roboto для Android.
   Рамка/width/height/hitbox/chevron совпали, onChange сохранился. После поправки
   отклонение ink center <0.9px для всех проверенных значений.
2. Actual btn(S/M/L), raw caption до и OpticalText после: SF/Arial/Roboto,
   кириллица/латиница/uppercase/цифры, обе темы. Максимальный ink error:
   SF0.705px, Arial0.804px, Roboto0.788px. Icon/frame размеры и позиции совпали.
   Click по подписи/currentTarget и disabled-подавление клика сохранены.
3.500 отдельных labels за экраном: нет отдельных font measurements для них;
   стартовый сценарий сделал максимум18 Canvas calls (шрифты/размеры кешируются).
4. Node-сторож scripts/checkOpticalText.mjs включён в check:ui: прежний markup
   FadeText побайтно совпадает в4 сценариях, opt-in сохраняет title/fade, rich
   children исключены, NaN/отсутствующие метрики дают0, максимальный сдвиг ограничен.
5. tsc --noEmit, npm run check:ui — PASS. React-чеклист: hooks без условий,
   observers очищают refs, нет state-перерендеров при измерении, нет запросов,
   handlers и доступные имена не менялись. Default FadeText не создаёт observers.

Исправления тестов: normal line-height кнопки измеряется по её line box;
React disabled ждём в DOM перед попыткой клика. Это не изменения продукта.

## Артефакты / границы

/Users/dany/.codex/iskra-qa/native-select-optical-20261122/ — compare.cjs,
comparison.json, BeforeNativeSelectField.tsx, fixture.tsx, PNG12комбинаций.
/Users/dany/.codex/iskra-qa/optical-label-contract-20261122/ — check.cjs,
fixture.tsx, results.json, PNG SF/Arial/Roboto.
/Users/dany/.codex/iskra-qa/platform-optical-rule-20261122/ — логи типов/сторожей,
fonts/Roboto.ttf+OFL.txt (официальный google/fonts, только QA).

Это headless Chrome fixture настоящих компонентов; реальный production constructor,
WebKit/физические iPhone/iPad/Android и полная карта экранов NOT TESTED.
Native Edge не использовался. Shared TeacherSelect/Segmented/MultiSelect и прямые
контролы ещё не мигрированы этим коммитом: широкий scope остаётся OPEN, владелец S3.
Main/version/production исполнитель не меняет; готовые коммиты передаются S1.
