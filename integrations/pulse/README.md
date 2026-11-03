# Изменения Пульса для согласования
Пульс в /Users/dany/Cursor/_Архив/Stata не является Git-репозиторием и не имеет найденного Vercel-проекта. Эти исходники — снимок конкретной подготовленной интеграции, а не новая копия всего пульта.

- web/operations.ts → src/lib/operations.ts
- web/IskraOperations.tsx → src/components/IskraOperations.tsx
- ios/IskraMonitor.swift → ios/PulseMobile/Sources/PulseMobile/Models/IskraMonitor.swift
- ios/ProjectsView.swift → ios/PulseMobile/Sources/PulseMobile/Views/ProjectsView.swift

Изменения уже стоят локально; env удалённого источника НЕ включён. Только после согласованного серверного выпуска добавить VITE_ISKRA_SERVER_MONITOR_URL=https://raw.githubusercontent.com/Dany-tut/Edu-study/codex/monitor-status/iskra.json. Для iOS собрать/установить отдельное Pulse Mobile; App Store/TestFlight не публиковался. Само приложение не является push-сервисом; APNs нет.

Типы веба и сборка Pulse Mobile для симулятора проверены. Fixture-веб проверяет удалённый источник, ошибку, сохранение локального approval/release; реальный удалённый снимок ещё не существует. Пульт не выкладывался в интернет; исходный data.json локального сканера нельзя публиковать вместе с открытой статусной страницей.
