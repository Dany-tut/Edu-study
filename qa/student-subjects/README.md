# Рабочая форма выбора предметов

В этой папке используются настоящие компоненты приложения и `useGroups`. Единственная подмена — транспорт Supabase: он пишет fixture-данные в localStorage текущего origin, без подключения к удалённому проекту. Не является новым продуктовым маршрутом или заменой production E2E.

Запуск из корня репозитория:

```sh
npx vite --config qa/student-subjects/vite.config.ts
node qa/student-subjects/check.mjs
node qa/student-subjects/group-check.mjs
node scripts/checkStudentSubject.mjs
PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node scripts/checkStudentSubjectsDb.mjs
```

Открыть `/qa/student-subjects/?theme=dark`. Для мобильной формы добавить `&mobile=1`, платформу определяет штатный `platform.ts` по UA/touch. Карточка сценария, границы и итог — в `scenario.md`; точная база и манифест проверенного патча — в `results.json`; скриншоты — в `evidence/`.

Перед выпуском требуется применить **только миграцию этой задачи** `20261122085928_student_subjects.sql` (после сверки remote/local истории и очереди релизов). Затем выпуск веба из актуального `main` по `docs/releases.md`. Старые приложения продолжают читать/писать scalar `subject`; триггер сохраняет остальные элементы массива при legacy-правке первого предмета. Новая форма не маскирует отсутствие миграции сохранением лишь первого предмета: ошибка остаётся в форме с сохранённым выбором.
