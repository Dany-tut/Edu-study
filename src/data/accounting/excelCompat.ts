// Матрица совместимости Excel для курса «Бухгалтерия» (Искра). Проверено по документации Microsoft 27.11.2026;
// в самом Excel НЕ проверялось. Версия Excel учащейся не подтверждена: не выбирать маршрут по предположению.
// Источник данных — docs/courses/accounting/excel-compatibility.md (держать в синхроне).
export type ExcelVersion = '2007'|'2010'|'2013'|'2016'|'2019'|'2021'|'2024'|'365'|'mac'|'web';
export type ExcelAvailability = 'yes'|'no'|'addin'|'partial';
export type ExcelFeature = {
  id: string; ru: string; en: string; kind: 'function'|'tool';
  since: Partial<Record<ExcelVersion, ExcelAvailability>>;
  note?: string; source: string;
  /** совместимый аналог для старых версий */
  fallback?: string;
  /** лицензия / надстройка */
  addin?: string;
  /** doc — сверено со страницей Microsoft; partial — частично; unverified — источник не открыт */
  checked?: 'doc'|'partial'|'unverified';
};
export const EXCEL_CHECKED_ON = '27.11.2026';
export const EXCEL_FEATURES: ExcelFeature[] = [
  {
    id: "power-query", ru: "Power Query («Получить и преобразовать данные»)", en: "Power Query / Get & Transform", kind: "tool",
    since: { '2007': 'no', '2010': 'addin', '2013': 'addin', '2016': 'yes', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "В 2010 и 2013 это бесплатная надстройка; Microsoft официально признала её устаревшей летом 2019 (может работать, но не гарантировано; ссылка на загрузку может не открываться). 2016 и 2019 (Windows): встроено. 2021/2024: страница PQA перечисляет их в «Применяется к», но отдельно не описывает; считать встроенным по семейству «2016 и новее» (PQS). Mac: 365 для Mac — есть; 2016 и 2019 для Mac — нет (прямая цитата PQA); 2021/2024 для Mac — не подтверждено. Web: ограниченный набор источников (PQS).",
    fallback: "Универсальный путь без Power Query: ручной импорт (Данные → Из текста/Из Web в 2007), вспомогательные столбцы, СУММЕСЛИМН, сводные.",
    addin: "«Надстройка Power Query: загрузка по ссылке со страницы PQA; нужны права администратора».",
    source: "https://support.microsoft.com/en-us/office/about-power-query-in-excel-7104fbee-9e62-4cb9-a02e-5bfb1a6c536a", checked: "doc",
  },
  {
    id: "get-data", ru: "«Получить данные» (Данные → Получить данные / Get Data)", en: "Data → Get Data", kind: "tool",
    since: { '2007': 'no', '2010': 'addin', '2013': 'addin', '2016': 'partial', '2019': 'partial', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Название «Получить данные» — интерфейс современных сборок; в 2016/2019 группа называется «Получить и преобразовать данные» (Get & Transform Data, PQA). В 2007 есть только старые «Данные → Из Access/Web/Текста». Прямой источник на названия кнопок по версиям не найден.",
    fallback: "Данные → Из текста / Из Web (классический импорт, 2007+).",
    source: "https://support.microsoft.com/office/power-query-data-sources-in-excel-versions-e9332067-8e49-46fc-97ff-f2e1bfa0cb16", checked: "partial",
  },
  {
    id: "power-query-folder", ru: "Power Query: «Из папки» (коннектор Folder)", en: "Get Data → From File → From Folder", kind: "tool",
    since: { '2007': 'no', '2010': 'addin', '2013': 'addin', '2016': 'yes', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'no' },
    note: "PQS: «Local folder» есть в колонках Office 2016/2019/365; «SharePoint Folder» — только Office 2019 Professional Plus Standalone и Microsoft 365 Apps for Enterprise. Mac: только обновление, не импорт. Web: только SharePoint-папки. Коннектор Folder: Excel, GA (FOLD). Для 2010/2013 состав коннекторов надстройки не проверялся.",
    fallback: "Ручное объединение файлов копированием; макрос VBA (только с разрешения ИТ).",
    source: "https://support.microsoft.com/office/power-query-data-sources-in-excel-versions-e9332067-8e49-46fc-97ff-f2e1bfa0cb16", checked: "doc",
  },
  {
    id: "power-pivot", ru: "Power Pivot и модель данных", en: "Power Pivot / Data Model", kind: "tool",
    since: { '2007': 'no', '2010': 'addin', '2013': 'partial', '2016': 'partial', '2019': 'partial', '2021': 'partial', '2024': 'partial', '365': 'partial', 'mac': 'no', 'web': 'no' },
    note: "Зависит от редакции. Выдача поиска по PP (страница обновлена 08.01.2019): есть в Office 2013 Professional Plus и отдельном Excel 2013, Office 2016 Professional Plus (только корпоративное лицензирование), Office Professional 2019/2021 и Home&Business/Student 2019/2021 (по списку страницы), нет в Office 2016 Professional, Home&Student/Home&Business 2013 и 2016, Office 2013 Standard и Professional, для Mac. Для 2010 отдельная бесплатная надстройка — по ответам Microsoft Q&A (не официальная страница). 2024 и Microsoft 365: PP говорит «надстройка Excel и встроено в модель данных в современных версиях», редакции не перечислены. Страница при повторном открытии отдавала только вводный текст — список редакций сверять с ИТ.",
    fallback: "Несколько таблиц: ВПР/ИНДЕКС+ПОИСКПОЗ + сводная по одной плоской таблице.",
    addin: "Редакция Professional Plus / Microsoft 365 Apps; в 2010 надстройка Power Pivot.",
    source: "https://support.microsoft.com/en-us/office/where-is-power-pivot-aa64e217-4b6e-410b-8337-20b87e1c2a4b", checked: "partial",
  },
  {
    id: "vba", ru: "VBA и макросы (.xlsm)", en: "VBA / macros", kind: "tool",
    since: { '2007': 'yes', '2010': 'yes', '2013': 'yes', '2016': 'yes', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'yes', 'web': 'no' },
    note: "Наличие VBA в версиях отдельной страницей Microsoft не проверялось (в Applies To источника — только политики блокировки). Только если разрешат работодатель и ИТ.",
    fallback: "Формулы + сводные + Power Query без макросов.",
    source: "https://learn.microsoft.com/en-us/microsoft-365-apps/security/internet-macros-blocked", checked: "unverified",
  },
  {
    id: "internet-macro-block", ru: "Блокировка макросов из интернета (Mark of the Web)", en: "Macros from the internet blocked by default", kind: "tool",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'partial', '2021': 'partial', '2024': 'partial', '365': 'yes', 'mac': 'no', 'web': 'no' },
    note: "Microsoft 365 Apps: по умолчанию с версии 2203 (Current Preview) / 2206 (Current Channel) / 2208 (Monthly Enterprise, Semi-Annual) на Windows. Для постоянных версий (Office LTSC 2021, Office 2019) страница описывает иной порядок проверки; значения по 2024 страница не называет. Mac, Android, iOS, веб не затронуты. Для 2007–2016 страница не говорит — в 2007–2016 действует обычная панель «Включить содержимое» (не источник, оценка). Файл из интернета: ПКМ → Свойства → «Разблокировать» либо доверенное расположение.",
    fallback: "Не открывать xlsm из почты; получать xlsx без макросов.",
    source: "https://learn.microsoft.com/en-us/microsoft-365-apps/security/internet-macros-blocked", checked: "doc",
  },
  {
    id: "smart-tables", ru: "Умные таблицы («Форматировать как таблицу», Ctrl+T)", en: "Excel tables", kind: "tool",
    since: { '2007': 'yes', '2010': 'yes', '2013': 'yes', '2016': 'yes', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'yes', 'web': 'yes' },
    note: "Наличие таблиц с 2007 отдельной страницей Microsoft не проверено (косвенно: SL описывает срезы «для таблиц»).",
    source: "https://support.microsoft.com/en-us/office/use-slicers-to-filter-data-249f966b-a9d5-4b0f-b31a-12651785d29d", checked: "unverified",
  },
  {
    id: "table-to-range", ru: "«Преобразовать в диапазон»", en: "Convert to Range", kind: "tool",
    since: { '2007': 'yes', '2010': 'yes', '2013': 'yes', '2016': 'yes', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'yes', 'web': 'yes' },
    note: "Отдельная страница Microsoft не открыта; считать доступным везде, где есть умные таблицы (не проверено).",
    source: "https://support.microsoft.com/en-us/office/use-slicers-to-filter-data-249f966b-a9d5-4b0f-b31a-12651785d29d", checked: "unverified",
  },
  {
    id: "slicer-pivot", ru: "Срезы для сводных таблиц", en: "Slicers (PivotTable)", kind: "tool",
    since: { '2007': 'no', '2010': 'yes', '2013': 'yes', '2016': 'yes', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'yes', 'web': 'partial' },
    note: "SL: Applies To — 365, 365 Mac, web, 2024, 2024 Mac, 2021, 2021 Mac. Версия, в которой срезы появились (2010), страницей не названа. Web: только локальные сводные (SL).",
    fallback: "Фильтры сводной таблицы (поле фильтра).",
    source: "https://support.microsoft.com/en-us/office/use-slicers-to-filter-data-249f966b-a9d5-4b0f-b31a-12651785d29d", checked: "partial",
  },
  {
    id: "slicer-table", ru: "Срезы для умных таблиц", en: "Slicers (Table)", kind: "tool",
    since: { '2007': 'no', '2010': 'no', '2013': 'yes', '2016': 'yes', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'yes', 'web': 'no' },
    note: "W13 («Что нового в Excel 2013») — срезы для таблиц; в вебе срезы таблиц недоступны (SL).",
    fallback: "Автофильтр таблицы.",
    source: "https://support.microsoft.com/en-us/office/what-s-new-in-excel-2013-1cbc42cd-bfaf-43d7-9031-5688ef1392fd", checked: "doc",
  },
  {
    id: "timeline", ru: "Временная шкала для сводных", en: "Timeline", kind: "tool",
    since: { '2007': 'no', '2010': 'no', '2013': 'yes', '2016': 'yes', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'no' },
    note: "Версия 2013 как первая — по выдаче поиска к W13, страница целиком не перепроверялась. Mac и web не проверены.",
    fallback: "Фильтр по дате в сводной / группировка дат.",
    source: "https://support.microsoft.com/en-us/office/what-s-new-in-excel-2013-1cbc42cd-bfaf-43d7-9031-5688ef1392fd", checked: "partial",
  },
  {
    id: "dynamic-arrays", ru: "Динамические массивы и ошибка #ПЕРЕНОС! (#SPILL!)", en: "Dynamic arrays, #SPILL!", kind: "tool",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'yes' },
    note: "DY перечисляет в Applies To и 2016/2019, но сама не называет версии; по FILTER/UNIQUE (FI, UN) 2019 и 2016 исключены, по алфавитному списку маркер (2021). Страницы Microsoft здесь расходятся — осторожный вывод: нет в 2019 и ранее. Русское имя ошибки #ПЕРЕНОС! — в источниках не проверено.",
    fallback: "Формулы с Ctrl+Shift+Enter (массивные) или вспомогательные столбцы.",
    source: "https://support.microsoft.com/en-us/office/dynamic-array-formulas-and-spilled-array-behavior-205c6b06-03ba-4151-89a1-87a7eb36e531", checked: "doc",
  },
  {
    id: "flash-fill", ru: "Мгновенное заполнение (Ctrl+E)", en: "Flash Fill", kind: "tool",
    since: { '2007': 'no', '2010': 'no', '2013': 'yes', '2016': 'yes', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "W13 называет Flash Fill функцией Excel 2013. Mac/web не проверены.",
    fallback: "Текст по столбцам, ЛЕВСИМВ/ПСТР/НАЙТИ.",
    source: "https://support.microsoft.com/en-us/office/what-s-new-in-excel-2013-1cbc42cd-bfaf-43d7-9031-5688ef1392fd", checked: "partial",
  },
  {
    id: "python", ru: "Python в Excel", en: "Python in Excel", kind: "tool",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'no', '2024': 'no', '365': 'partial', 'mac': 'partial', 'web': 'partial' },
    note: "Только Microsoft 365: Windows — Enterprise/Business с версии 2408 (Current Channel, сборка 17928.20114) и далее по каналам; Mac — 16.96; web — Business. Постоянные потребительские лицензии не поддерживаются; Excel 2021/2024 страница отдельно не называет (в Applies To их нет). Выполняется в облаке Microsoft — для рабочих данных бухгалтерии не использовать без решения работодателя.",
    fallback: "Power Query / формулы.",
    source: "https://support.microsoft.com/en-us/excel/python/python-in-excel-availability", checked: "doc",
  },
  {
    id: "copilot-fn", ru: "Copilot в Excel: функция COPILOT", en: "COPILOT function", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'no', '2024': 'no', '365': 'no', 'mac': 'no', 'web': 'no' },
    note: "Была в предварительной версии только для Microsoft 365; с 14.09.2026 функция недоступна (после пересчёта #ИМЯ?/#NAME?). Microsoft рекомендует панель Copilot. Облачный ИИ; не для рабочих данных без решения работодателя.",
    source: "https://support.microsoft.com/en-us/excel/functions/copilot-function", checked: "doc",
  },
  {
    id: "sumifs", ru: "СУММЕСЛИМН", en: "SUMIFS", kind: "function",
    since: { '2007': 'yes', '2010': 'yes', '2013': 'yes', '2016': 'yes', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркера на странице нет (функция ранее 2010); введена в 2007 — по самой странице не проверялось. Аналог в 2003: СУММПРОИЗВ.",
    fallback: "СУММПРОИЗВ (в 2003)",
    source: "https://support.microsoft.com/en-us/office/excel-functions-alphabetical-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "countifs", ru: "СЧЁТЕСЛИМН", en: "COUNTIFS", kind: "function",
    since: { '2007': 'yes', '2010': 'yes', '2013': 'yes', '2016': 'yes', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркера нет; см. SUMIFS. На странице ru — «СЧЁТЕСЛИМН» (с Ё).",
    source: "https://support.microsoft.com/en-us/office/excel-functions-alphabetical-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "averageifs", ru: "СРЗНАЧЕСЛИМН", en: "AVERAGEIFS", kind: "function",
    since: { '2007': 'yes', '2010': 'yes', '2013': 'yes', '2016': 'yes', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркера нет; см. SUMIFS.",
    source: "https://support.microsoft.com/en-us/office/excel-functions-alphabetical-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "iferror", ru: "ЕСЛИОШИБКА", en: "IFERROR", kind: "function",
    since: { '2007': 'yes', '2010': 'yes', '2013': 'yes', '2016': 'yes', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркера нет; введена в 2007 (не проверялось страницей).",
    source: "https://support.microsoft.com/en-us/office/excel-functions-alphabetical-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "ifna", ru: "ЕСНД (на ru-странице: «ИСНД»)", en: "IFNA", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'yes', '2016': 'yes', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2013). РАСХОЖДЕНИЕ: ru-страница Microsoft пишет ИСНД, в русском интерфейсе Excel известна форма ЕСНД — написание в программе не проверено, сверить в «Мастере функций». Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "ЕСЛИ(ЕНД(...);...)",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "ifs", ru: "ЕСЛИМН", en: "IFS", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2019). Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "вложенные ЕСЛИ",
    source: "https://support.microsoft.com/en-us/office/excel-functions-alphabetical-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "switch", ru: "ПЕРЕКЛЮЧ (на ru-странице: «ПЕРЕКЛЮЧАТЕЛЬ»)", en: "SWITCH", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2019). РАСХОЖДЕНИЕ: на странице «ПЕРЕКЛЮЧАТЕЛЬ»; в Excel ru-интерфейса форма ПЕРЕКЛЮЧ не подтверждена источником. Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "ВЫБОР/ИНДЕКС+ПОИСКПОЗ или ЕСЛИ",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "maxifs", ru: "МАКСЕСЛИ (на ru-странице: «МАКСЕСЛИМН»)", en: "MAXIFS", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2019). В брифе была «МАКСЕСЛИ» — на странице «МАКСЕСЛИМН». Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "МАКС(ЕСЛИ(...)) массивной формулой Ctrl+Shift+Enter или СУММПРОИЗВ/АГРЕГАТ(14;6;…)",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "minifs", ru: "МИНЕСЛИ (на ru-странице: «МИНЕСЛИМН»)", en: "MINIFS", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2019). Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "МИН(ЕСЛИ(...)) массивной или АГРЕГАТ(15;6;…)",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "textjoin", ru: "ОБЪЕДИНИТЬ", en: "TEXTJOIN", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2019). Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "СЦЕПИТЬ + вспомогательные столбцы",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "concat", ru: "СЦЕП", en: "CONCAT", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2019). СЦЕПИТЬ (CONCATENATE) остаётся в старых версиях. Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "СЦЕПИТЬ или &",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "xlookup", ru: "ПРОСМОТРX (латинская X)", en: "XLOOKUP", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'yes' },
    note: "Алфавитный список: (2021). Страница XLOOKUP заявляет «недоступна в 2016 и 2019», хотя 2016/2019 есть в Applies To — расхождение внутри страницы. Написание: в заголовке и списке латинская X, в примере синтаксиса на той же странице кириллическая Х — вводить в Excel имя из Мастера функций. Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "ВПР (точное) или ИНДЕКС+ПОИСКПОЗ",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D1%8F-%D0%BF%D1%80%D0%BE%D1%81%D0%BC%D0%BE%D1%82%D1%80x-b7fd680e-6d10-43e6-84f9-88eae8bf5929", checked: "doc",
  },
  {
    id: "xmatch", ru: "ПОИСКПОЗX (латинская X)", en: "XMATCH", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2021); в списке латинская X. Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "ПОИСКПОЗ",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "filter", ru: "ФИЛЬТР", en: "FILTER", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'yes' },
    note: "Applies To: 365, 365 Mac, web, 2024, 2024 Mac, 2021, 2021 Mac (2019 и 2016 нет). Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "Автофильтр / расширенный фильтр / вспомогательный столбец + сводная",
    source: "https://support.microsoft.com/en-us/office/filter-function-f4f7cb66-82eb-4767-8f7c-4877ad80c759", checked: "doc",
  },
  {
    id: "unique", ru: "УНИК (на ru-странице имя не указано: «UNIQUE»)", en: "UNIQUE", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'yes' },
    note: "Applies To как у FILTER плюс Microsoft365.com. Русское имя УНИК в проверенном списке не дано — подтвердить в Excel. Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "Данные → Удалить дубликаты на копии / сводная",
    source: "https://support.microsoft.com/en-us/office/unique-function-c5ab87fd-30a3-4ce9-9d1a-40204fb85e1e", checked: "doc",
  },
  {
    id: "sort", ru: "СОРТ", en: "SORT", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2021). Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "Данные → Сортировка",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "sortby", ru: "СОРТПО", en: "SORTBY", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2021). Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "Данные → Сортировка",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "sequence", ru: "ПОСЛЕД", en: "SEQUENCE", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2021). Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "ПОСЛЕД заменить заполнением ряда (Главная → Заполнить → Прогрессия)",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "let", ru: "LET (русское имя на странице не указано)", en: "LET", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2021); на ru-странице строка LET без перевода — имя в русском Excel подтвердить в программе. Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "вспомогательные ячейки",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "lambda", ru: "ЛЯМБДА", en: "LAMBDA", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'no', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2024). Возможна доступность в 365 раньше; в постоянных версиях — с 2024. Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "именованные формулы / вспомогательные столбцы",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "textbefore", ru: "ТЕКСТДО", en: "TEXTBEFORE", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'no', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2024). Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "ЛЕВСИМВ+НАЙТИ",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "textafter", ru: "ТЕКСТПОСЛЕ", en: "TEXTAFTER", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'no', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2024). Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "ПСТР+НАЙТИ",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "textsplit", ru: "ТЕКСТРАЗД", en: "TEXTSPLIT", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'no', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2024). Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "Данные → Текст по столбцам",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "numbervalue", ru: "ЧЗНАЧ (на ru-странице: «ЧИСЛОЗНАЧЬТЕ»)", en: "NUMBERVALUE", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'yes', '2016': 'yes', '2019': 'yes', '2021': 'yes', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2013). Написание ЧЗНАЧ в источнике не найдено; страница даёт «ЧИСЛОЗНАЧЬТЕ» — сверить в Excel. Для 2007/2010 совместимый аналог: ПОДСТАВИТЬ + ЗНАЧЕН.",
    fallback: "ПОДСТАВИТЬ+ЗНАЧЕН",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "vstack", ru: "ВСТОЛБИК", en: "VSTACK", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'no', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2024). Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "копирование диапазонов",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "hstack", ru: "ГСТОЛБИК", en: "HSTACK", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'no', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2024). Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "копирование диапазонов",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "take", ru: "ВЗЯТЬ", en: "TAKE", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'no', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2024). Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "ссылка на диапазон / ИНДЕКС",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "drop", ru: "СБРОСИТЬ", en: "DROP", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'no', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2024). Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "ссылка на диапазон / ИНДЕКС",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "choosecols", ru: "ВЫБОРСТОЛБЦ", en: "CHOOSECOLS", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'no', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2024). Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "ИНДЕКС / копирование столбцов",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "groupby", ru: "ГРУПППО (три П — как на странице)", en: "GROUPBY", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'no', '2024': 'no', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер «Microsoft 365». Написание страницы ГРУПППО. Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "сводная таблица",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "pivotby", ru: "СВОДПО", en: "PIVOTBY", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'no', '2024': 'no', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер «Microsoft 365». Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "сводная таблица",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "image", ru: "ИЗОБРАЖЕНИЕ", en: "IMAGE", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'no', '2024': 'yes', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер (2024). Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "Вставка → Рисунок",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "regextest", ru: "РЕГТЕСТ", en: "REGEXTEST", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'no', '2024': 'no', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер «Microsoft 365». Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "ПОИСК/НАЙТИ; Power Query",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "regexextract", ru: "РЕГИЗВЛЕЧЬ", en: "REGEXEXTRACT", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'no', '2024': 'no', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер «Microsoft 365». Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "ПСТР+НАЙТИ; Power Query",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
  {
    id: "regexreplace", ru: "РЕГЗАМЕНИТЬ", en: "REGEXREPLACE", kind: "function",
    since: { '2007': 'no', '2010': 'no', '2013': 'no', '2016': 'no', '2019': 'no', '2021': 'no', '2024': 'no', '365': 'yes', 'mac': 'partial', 'web': 'partial' },
    note: "Маркер «Microsoft 365». Mac: функции с маркером года есть в Mac-версии того же года и новее (Microsoft: Applies To включает 2021/2024 для Mac и Microsoft 365 для Mac); точную сборку Mac проверять по «О программе».",
    fallback: "ПОДСТАВИТЬ; Power Query",
    source: "https://support.microsoft.com/ru-ru/office/%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-excel-%D0%BF%D0%BE-%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83-b3944572-255d-4efb-bb96-c6d90033e188", checked: "doc",
  },
];

/** 'unknown' — версия в since не указана (источник не подтвердил). */
export function availableIn(featureId: string, version: ExcelVersion): ExcelAvailability | 'unknown' {
  const f = EXCEL_FEATURES.find(x => x.id === featureId);
  if (!f) return 'unknown';
  return f.since[version] ?? 'unknown';
}
