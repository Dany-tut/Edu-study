// Запрос «Расчёт» — курс «Бухгалтерия» (Искра), проект «Численность сотрудников».
// Вставьте целиком: Данные → Получить данные → Из других источников → Пустой запрос → Главная → Расширенный редактор.
// Меняйте только блок «Параметры». Учебные данные вымышлены. В Excel не запускалось: логика проверена на Python.
let
    // ── Параметры ──
    Корень = "C:\Численность\chislennost\",
    ЛистИсходника = "Лист_1",
    ЗаголовокФИО = "Сотрудник",
    ЗаголовокСтавки = "Количество ставок",
    РежимДекрета = "Из списка декрета",                              // уточняется: "Из списка или по правилу ОСН", "По правилу ОСН"
    ОстальныеДекрет = "СОВ",                                         // уточняется: "Без категории"
    РавныеСтроки = "Подразделение по алфавиту затем первая строка",  // уточняется: "Исключение"

    // ── Помощники ──
    Сжать = (t as any) as text => Text.Combine(List.Select(Text.Split(Text.Replace(if t = null then "" else Text.From(t), "#(00A0)", " "), " "), each _ <> ""), " "),
    Ключ = (t as any) as text => Text.Replace(Text.Upper(Сжать(t)), "Ё", "Е"),
    КлючОрг = (t as any) as text => Text.Trim(Text.Replace(Text.Replace(Ключ(t), ".XLSX", ""), ".XLS", "")),
    Ставка = (v as any) as nullable number =>
        if v is number then v
        else let т = Сжать(v) in
            if т = "" then null
            else try (if Text.Contains(т, "/")
                then Number.From(Text.BeforeDelimiter(т, "/"), "ru-RU") / Number.From(Text.AfterDelimiter(т, "/"), "ru-RU")
                else Number.From(Text.Replace(т, ".", ","), "ru-RU")) otherwise null,
    Список = (имя as text) as table => Table.PromoteHeaders(Excel.Workbook(File.Contents(Корень & "spiski\" & имя), null, true){0}[Data], [PromoteAllScalars = true]),

    // ── Функция: один отчёт «Штатные сотрудники» → строки сотрудников с подразделением ──
    Разобрать = (содержимое as binary) as table =>
        let
            Лист = Excel.Workbook(содержимое, null, true){[Item = ЛистИсходника, Kind = "Sheet"]}[Data],
            Ряды = Table.ToRows(Лист),
            НомерШапки = List.PositionOf(List.Transform(Ряды, each List.Contains(_, ЗаголовокФИО)), true),
            Шапка = Ряды{НомерШапки},
            КолФИО = List.PositionOf(Шапка, ЗаголовокФИО),
            КолСтавки = List.PositionOf(Шапка, ЗаголовокСтавки),
            Ниже = List.Skip(Ряды, НомерШапки + 1),
            Записи = Table.FromRecords(List.Transform(Ниже, (р) => [Первая = Сжать(р{0}), ФИО = Сжать(р{КолФИО}), СтавкаИсх = р{КолСтавки}])),
            СИтогом = Table.AddColumn(Записи, "Итог", each Text.StartsWith(Text.Upper([Первая]), "ИТОГО")),
            СПодзаг = Table.AddColumn(СИтогом, "Подразделение", each if [Первая] <> "" and Сжать([СтавкаИсх]) = "" and not [Итог] then [Первая] else null),
            Вниз = Table.FillDown(СПодзаг, {"Подразделение"}),
            Сотрудники = Table.SelectRows(Вниз, each [ФИО] <> "" and not [Итог] and not Text.StartsWith(Text.Upper([ФИО]), "ИТОГО")
                and (Сжать([СтавкаИсх]) <> "" or КолФИО <> 0)),
            Итог = Table.AddIndexColumn(Table.SelectColumns(Сотрудники, {"Подразделение", "ФИО", "СтавкаИсх"}), "Строка в файле", 1, 1)
        in
            Итог,

    // ── 1. Папка → все отчёты; период — имя подпапки (vygruzki\2026-10\…) ──
    Файлы = Table.SelectRows(Folder.Files(Корень & "vygruzki"), each List.Contains({".xls", ".xlsx"}, Text.Lower([Extension])) and not Text.StartsWith([Name], "~$")),
    СПериодом = Table.AddColumn(Файлы, "Период", each Text.BeforeDelimiter(Text.AfterDelimiter([Folder Path], "vygruzki\"), "\")),
    СТаблицей = Table.AddColumn(СПериодом, "Т", each try Разобрать([Content]) otherwise null),
    Прочитаны = Table.SelectRows(СТаблицей, each [Т] <> null),
    Строки = Table.ExpandTableColumn(Table.SelectColumns(Прочитаны, {"Период", "Name", "Т"}), "Т", {"Подразделение", "ФИО", "СтавкаИсх", "Строка в файле"}),
    СНомером = Table.AddIndexColumn(Строки, "№", 1, 1),

    // ── 2. Ключи: ФИО и подразделение без лишних пробелов, ПРОПИСНЫМИ, Ё → Е; ставка числом ──
    Ключи = Table.AddColumn(Table.AddColumn(Table.AddColumn(Table.AddColumn(СНомером,
        "ОргКлюч", each КлючОрг([Name])), "ПодрКлюч", each Ключ([Подразделение])),
        "ФИОКлюч", each Ключ([ФИО])), "Ставка", each Ставка([СтавкаИсх])),

    // ── 3. Организация по имени файла: псевдоним → согласованное название → ранг по алфавиту ──
    Орг = Table.AddColumn(Table.AddColumn(Список("organizacii.xlsx"), "ОргКлюч", each КлючОрг([Название в выгрузке])), "СортКлюч", each КлючОрг([Согласованное название])),
    Ранги = Table.AddIndexColumn(Table.Sort(Table.Distinct(Table.SelectColumns(Орг, {"СортКлюч"})), {{"СортКлюч", Order.Ascending}}), "Ранг", 1, 1),
    ОргРанг = Table.ExpandTableColumn(Table.NestedJoin(Орг, {"СортКлюч"}, Ранги, {"СортКлюч"}, "Р", JoinKind.LeftOuter), "Р", {"Ранг"}),
    СОрг = Table.ExpandTableColumn(Table.NestedJoin(Ключи, {"ОргКлюч"}, ОргРанг, {"ОргКлюч"}, "О", JoinKind.LeftOuter),
        "О", {"Согласованное название", "Ранг"}, {"Организация", "Ранг"}),

    // ── 4. Сопоставления: однофамильцы и смена фамилии (без записи человек = ФИО) ──
    Соп = Table.Distinct(Table.AddColumn(Table.AddColumn(Список("sopostavleniya.xlsx"),
        "К", each КлючОрг([Организация]) & "|" & Ключ([ФИО]) & "|" & Ключ([Подразделение])), "IDКлюч", each Ключ([ID])), {"К"}),
    СК = Table.AddColumn(Table.AddColumn(СОрг, "К3", each КлючОрг([Организация]) & "|" & [ФИОКлюч] & "|" & [ПодрКлюч]),
        "К2", each КлючОрг([Организация]) & "|" & [ФИОКлюч] & "|"),
    С3 = Table.ExpandTableColumn(Table.NestedJoin(СК, {"К3"}, Соп, {"К"}, "С3", JoinKind.LeftOuter), "С3", {"IDКлюч"}, {"ID3"}),
    С2 = Table.ExpandTableColumn(Table.NestedJoin(С3, {"К2"}, Соп, {"К"}, "С2", JoinKind.LeftOuter), "С2", {"IDКлюч"}, {"ID2"}),
    СЧеловеком = Table.AddColumn(С2, "Человек", each if ([ID3] ?? "") <> "" then [ID3] else if ([ID2] ?? "") <> "" then [ID2] else [ФИОКлюч]),

    // ── 5. Список декрета: по ID, а если его нет — по ФИО; организация декрета → согласованное название ──
    Дек = Table.AddColumn(Table.AddColumn(Список("dekret.xlsx"),
        "Человек", each if Ключ([ID]) <> "" then Ключ([ID]) else Ключ([ФИО])), "ДекОрг", each КлючОрг([Организация декрета])),
    ДекК = Table.ExpandTableColumn(Table.NestedJoin(Дек, {"ДекОрг"}, Орг, {"ОргКлюч"}, "О", JoinKind.LeftOuter), "О", {"Согласованное название"}, {"ДекОрганизация"}),
    ДекОдин = Table.Distinct(ДекК, {"Человек"}),
    СДек = Table.ExpandTableColumn(Table.NestedJoin(СЧеловеком, {"Человек"}, ДекОдин, {"Человек"}, "Д", JoinKind.LeftOuter),
        "Д", {"Человек", "ДекОрганизация"}, {"ДекЧеловек", "ДекОрганизация"}),
    СФлагом = Table.AddColumn(СДек, "Декрет", each [ДекЧеловек] <> null, type logical),

    // ── 6. Проблемы строки и допуск к выбору ──
    Пробл = Table.AddColumn(СФлагом, "Проблема", each
        if [ФИОКлюч] = "" then "Нет ФИО"
        else if [Ранг] = null then "Организации нет в справочнике"
        else if [Ставка] = null then "Ставка не число или пусто"
        else if [Ставка] <= 0 then "Ставка ≤ 0" else null),
    Допуск = Table.AddColumn(Пробл, "Допущена", each [Проблема] = null and (
        not [Декрет] or РежимДекрета = "По правилу ОСН"
        or (([ДекОрганизация] ?? "") = "" and РежимДекрета = "Из списка или по правилу ОСН")
        or (([ДекОрганизация] ?? "") <> "" and [Организация] = [ДекОрганизация]))),

    // ── 7. Выбор по человеку: ставка ↓, организация по алфавиту ↑, подразделение ↑, строка ↑ ──
    Выбрать = (t as table) as table =>
        let
            Декрет = t{0}[Декрет],
            ДекОрг = t{0}[ДекОрганизация] ?? "",
            ЕстьПробл = List.NonNullCount(t[Проблема]) > 0,
            Порядок = Table.Sort(Table.SelectRows(t, each [Допущена]), {{"Ставка", Order.Descending}, {"Ранг", Order.Ascending}, {"ПодрКлюч", Order.Ascending}, {"№", Order.Ascending}}),
            Лучший = if Table.IsEmpty(Порядок) then null else Порядок{0},
            Равных = if Лучший = null then 0 else Table.RowCount(Table.SelectRows(Порядок, each
                Number.Round([Ставка], 4) = Number.Round(Лучший[Ставка], 4) and [Ранг] = Лучший[Ранг])),
            Причина = if ЕстьПробл then "Ошибка в другой строке этого человека"
                else if Лучший = null then (if not Декрет then "Нет строки для выбора"
                    else if ДекОрг = "" then "Организация декрета не указана" else "Организация декрета не найдена среди строк человека")
                else if Равных > 1 and РавныеСтроки = "Исключение" then "Несколько равных строк в выбранной организации"
                else null,
            Категории = Table.AddColumn(t, "Категория", each
                if [Проблема] <> null or Причина <> null then "Проверить"
                else if [№] = Лучший[№] then (if Декрет then "ДЕКРЕТ" else "ОСН")
                else if Декрет and ОстальныеДекрет = "Без категории" then "Без категории"
                else "СОВ"),
            СПричиной = Table.AddColumn(Категории, "Причина", each if [Проблема] <> null then [Проблема] else Причина),
            СПовтором = Table.AddColumn(СПричиной, "Повтор в организации", each List.Count(List.Select(t[Организация], (о) => о = [Организация])) > 1, type logical)
        in
            СПовтором,
    Люди = Table.Group(Допуск, {"Период", "Человек"}, {{"Строки", Выбрать, type table}}),
    Все = Table.Sort(Table.Combine(Люди[Строки]), {{"№", Order.Ascending}}),
    Итог = Table.SelectColumns(Все, {"Период", "№", "Name", "Строка в файле", "Организация", "Подразделение", "ФИО", "СтавкаИсх", "Ставка",
        "Человек", "Декрет", "Категория", "Причина", "Повтор в организации"})
in
    Итог
