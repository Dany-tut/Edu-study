# EXP07 «Power Query и автоматизация Excel» — заметка исследования (25.11.2026)

## Открыто и сверено
- support.microsoft.com/ru-ru/excel/import-data-from-a-folder-with-multiple-files-power-query — путь «Данные → Получить данные → Из файла → Из папки»; кнопки «Объединить и загрузить / преобразовать данные / загрузить в»; требования к одинаковой схеме; предупреждение про лишние файлы и вложенные папки. Про Mac на странице ничего нет.
- support.microsoft.com/en-US/excel/power-query-data-sources-in-excel-versions — таблица по версиям: PDF только Microsoft 365 на Windows (.NET 4.5+); папка на Mac «только обновление»; текст/CSV, книга Excel, XML на Mac — импорт и обновление; JSON — Office 2019 и M365; на Mac Power Query только для подписчиков Microsoft 365 через «Данные → Получить данные».
- support.microsoft.com/ru-ru/excel/merge-queries-power-query — «Главная → Объединить запросы», типы соединения (в т. ч. левое антисоединение), «Развернуть».
- learn.microsoft.com/en-us/power-query/: power-query-ui, append-queries, group-by, power-query-query-parameters, dealing-with-errors; powerquery-m: table-group, folder-files, excel-workbook.
- support.microsoft.com/en-US/Excel/where-is-power-pivot — перечислены Excel 365/2024/2021/2019/2016; про Mac и веб нет.
- learn.microsoft.com/en-us/microsoft-365-apps/security/internet-macros-blocked (обновлена 17.07.2026) — блокировка только Office на Windows; Current Channel 2206 (27.07.2022), SAEC 2208 (10.01.2023); «Свойства → Общие → Разблокировать»; Unblock-File; доверенные расположения; подписанные макросы; политики.
- support.microsoft.com/ru-ru/office/включение-и-отключение-макросов-в-файлах-office-12b036fd-… — параметры макросов, путь в Центр управления безопасностью.
- Скачивание учебных выгрузок: скрипт scripts/accounting/build_pq_folder.py.

## Не открылось / только по результатам поиска (status not-checked)
- support.microsoft.com/ru-ru/excel/refresh-an-external-data-connection-in-excel (путь «Свойства → Использование → Обновлять данные при открытии файла»).
- support.microsoft.com/ru-ru/excel/import-and-shape-data-in-excel-for-mac-power-query; страница Microsoft про макросы Excel для Mac.
- Русская официальная страница про импорт PDF: угаданный адрес дал 404, подтверждённого нет. Шаги по PDF помечены «проверьте в своей версии».
- Недоступность Power Pivot на Mac и в Excel для веба — только по поиску, не по открытой странице.

## Спорное / проверить специалистом
- Русские подписи элементов (Примененные шаги, Обрезать, Очистить, Каждое слово с прописной, Использовать локаль…, Из текстового/CSV-файла, Закрыть и загрузить в…) даны по английской документации и опыту.
- DAX-мера и код VBA не запускались в Excel в этой сессии.
- Поддержка Power Query в Excel для веба/Android/iOS не проверялась.
- Доступность Microsoft 365/Excel в РФ не проверялась: везде «уточните у работодателя/ИТ».

## Исправления исходных уроков
- L23: в учебной папке вместо структуры «ID, ФИО, Организация, Ставка, Статус» даны готовые файлы с платежами (ID платежа, Организация, Категория, Сумма, Статус) — чтобы не работать с ФИО. Шаги, текст «Проверяем себя», «Важно» и вопрос Q23 сохранены; в шаге 1 оставлен вариант «свои файлы».
- L24: шаги, ожидаемый результат, промпт и Q24 сохранены без изменений. Добавлены левое антисоединение и добавление запросов.
- Различия версий Excel: PDF — только M365; JSON — не в 2016; Mac — ограничен (см. таблицу).
