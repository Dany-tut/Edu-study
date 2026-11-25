-- ─────────────────────────────────────────────────────────────────────────────
-- Каталог курса «Бухгалтерия: Excel, 1С и закон на практике» (acc-ru).
-- СГЕНЕРИРОВАНО scripts/accounting/build_docs.mjs — не править руками.
--
-- НЕ ПРИМЕНЯЕТСЯ АВТОМАТИЧЕСКИ И НЕ ЛЕЖИТ В supabase/migrations: заводить курс в
-- рабочую базу можно только после согласования Дани. Курс создаётся в статусе
-- draft (ученики его не видят), владелец — как у AP-химии и биологии.
--
-- Идемпотентно: повторный прогон ничего не создаёт заново и не трогает уже
-- существующие строки (в т. ч. lessons.content, отредактированный учителем).
-- Нумерация уроков с НУЛЯ: short_id = 'acc-ru-<lesson_number>'.
-- Конспекты и домашки лежат в коде (src/data/accounting) и подставляются, пока
-- lessons.content пуст. Файлы уроков — в public/courses/accounting (раздаются
-- самим приложением); для мобильных сборок проверить доступность пути.
-- Откат: delete from lessons where short_id like 'acc-ru-%';
--        delete from course_modules where course_id = (select id from courses where short_id = 'acc-ru');
--        delete from courses where short_id = 'acc-ru';
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_course_id uuid;
  v_owner uuid;
  v_mod uuid[] := array[]::uuid[];
  r record;
  v_id uuid;
begin
  select created_by into v_owner from courses where short_id = 'apchem-ru' limit 1;

  insert into courses (short_id, kind, title, subject, level, description, status, color, bg, created_by)
  values ('acc-ru', 'course', 'Бухгалтерия: Excel, 1С и закон на практике', 'Бухгалтерия', 'Практикующий бухгалтер',
    'Практический курс для бухгалтера, который ведёт несколько организаций: Excel и Power Query, сверки, 1С, самозанятые, зарплата и численность, налоги, закрытие месяца, ИИ, безопасность и переход на ФСБУ 2027. 187 уроков, справочник по рабочим вопросам, учебные файлы.',
    'draft', '#2E6FD8', '#E3EDFB', v_owner)
  on conflict (short_id) do nothing;

  select id into v_course_id from courses where short_id = 'acc-ru';

  for r in
    select * from (values
      ('Введение', 0),
      ('1. Организация рабочего пространства', 1),
      ('2. Excel с самых основ', 2),
      ('3. Очистка и обработка Excel', 3),
      ('4. Формулы Excel для бухгалтера', 4),
      ('5. Сверки', 5),
      ('6. Отчётность и аналитика', 6),
      ('7. Power Query и автоматизация Excel', 7),
      ('8. Google Таблицы', 8),
      ('9. Основы российского бухучёта', 9),
      ('10. 1С — повседневная работа', 10),
      ('11. Первичные документы и хозяйственные операции', 11),
      ('12. Банк и расчёты', 12),
      ('13. Самозанятые — подробный практикум', 13),
      ('14. Зарплата и кадры', 14),
      ('15. Налоги и отчётность РФ', 15),
      ('16. Закрытие месяца и контроль', 16),
      ('21. Переход на 2027 год — ФСБУ и иные изменения', 17),
      ('17. Искусственный интеллект', 18),
      ('18. Продвинутая автоматизация', 19),
      ('19. Информационная безопасность', 20),
      ('20. Итоговые проекты', 21)
    ) as t(label, pos) order by pos
  loop
    select id into v_id from course_modules where course_id = v_course_id and label = r.label limit 1;
    if v_id is null then
      insert into course_modules (course_id, label, position) values (v_course_id, r.label, r.pos) returning id into v_id;
    end if;
    v_mod := v_mod || v_id;
  end loop;

  insert into lessons (course_id, module_id, short_id, title, lesson_number, position, kind, shape, materials)
  select v_course_id, v_mod[d.block], 'acc-ru-' || d.n, d.title, d.n, d.n, 'lesson',
         case when d.n in (0, 186) then 'diamond' else 'circle' end, d.materials::jsonb
  from (values
    (0, 1, 'Как устроен курс и как им пользоваться на работе', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},{"id":"acc-chislennost-shablon.xlsx","name":"chislennost-shablon.xlsx","path":"/courses/accounting/chislennost-shablon.xlsx","url":"/courses/accounting/chislennost-shablon.xlsx","size":1256955,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},{"id":"acc-sverka-shablon.xlsx","name":"sverka-shablon.xlsx","path":"/courses/accounting/sverka-shablon.xlsx","url":"/courses/accounting/sverka-shablon.xlsx","size":14832,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},{"id":"acc-samozanyatye-kontrol.xlsx","name":"samozanyatye-kontrol.xlsx","path":"/courses/accounting/samozanyatye-kontrol.xlsx","url":"/courses/accounting/samozanyatye-kontrol.xlsx","size":21558,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},{"id":"acc-vygruzki-dlya-power-query.zip","name":"vygruzki-dlya-power-query.zip","path":"/courses/accounting/vygruzki-dlya-power-query.zip","url":"/courses/accounting/vygruzki-dlya-power-query.zip","size":16011,"mime":"application/zip"}]}'),
    (1, 1, 'Справочник: найти урок по рабочему вопросу', '{}'),
    (2, 2, 'Папки и документы: одна схема для всех организаций', '{}'),
    (3, 2, 'Правила именования файлов', '{}'),
    (4, 2, 'Месячные отчёты: пакет документов за месяц', '{}'),
    (5, 2, 'Шаблоны и справочники', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (6, 2, 'Резервное копирование', '{}'),
    (7, 2, 'История изменений и версии файла', '{}'),
    (8, 2, 'Горячие клавиши Windows и работа с несколькими окнами', '{}'),
    (9, 2, 'Поиск файлов в Windows', '{}'),
    (10, 2, 'Пакетное переименование файлов', '{}'),
    (11, 2, 'PDF и архивы: как сохранить и отправить', '{}'),
    (12, 3, 'Откройте копию, а не оригинал: интерфейс, ячейки, строки, столбцы, диапазоны', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (13, 3, 'Введите формулу и протяните её вниз: автозаполнение', '{}'),
    (14, 3, 'Форматы чисел и дат', '{}'),
    (15, 3, 'Копирование и специальная вставка', '{}'),
    (16, 3, 'Закрепление областей и сортировка', '{}'),
    (17, 3, 'Покажите только неоплаченные документы: фильтры', '{}'),
    (18, 3, 'Сделайте обычную таблицу «умной»', '{}'),
    (19, 3, 'Выпадающие списки и проверка данных', '{}'),
    (20, 3, 'Защита формул от случайной правки', '{}'),
    (21, 3, 'Условное форматирование: подсветка по правилам', '{}'),
    (22, 3, 'Горячие клавиши Excel', '{}'),
    (23, 4, 'Уберите всё до первой запятой', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (24, 4, 'Разделить текст по столбцам и объединить столбцы', '{}'),
    (25, 4, 'Уберите лишние пробелы, невидимые символы и выровняйте регистр', '{}'),
    (26, 4, 'Извлеките фамилию, имя, отчество и инициалы', '{}'),
    (27, 4, 'Превратите суммы-текст в числа', '{}'),
    (28, 4, 'Преобразуйте ставки 1/4 и 1/2', '{}'),
    (29, 4, 'Даты из текста: превратить в настоящие даты', '{}'),
    (30, 4, 'Найдите повторяющиеся записи и пустые ячейки', '{}'),
    (31, 4, 'Поиск и замена в Excel', '{}'),
    (32, 4, 'Мгновенное заполнение: Excel учится на вашем примере', '{}'),
    (33, 5, 'Ссылки со знаком $ и сумма столбца', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (34, 5, 'Сумма и количество по одному условию', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (35, 5, 'Сумма и количество по нескольким условиям', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (36, 5, 'Условия и ошибки: ЕСЛИ, ЕСЛИОШИБКА, вложенные формулы', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (37, 5, 'Подтяните название организации по коду (ВПР)', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (38, 5, 'Находите данные независимо от порядка столбцов (ИНДЕКС и ПОИСКПОЗ)', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (39, 5, 'ПРОСМОТРX (XLOOKUP): современная замена ВПР', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (40, 5, 'ФИЛЬТР, УНИК, СОРТ и замена для старых версий', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (41, 5, 'Округление, текст и даты в формулах', '{}'),
    (42, 5, 'Формулы с помощью ИИ: как просить и как проверять', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (43, 6, 'Как устроена сверка двух таблиц и зачем нужны контрольные суммы', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},{"id":"acc-sverka-shablon.xlsx","name":"sverka-shablon.xlsx","path":"/courses/accounting/sverka-shablon.xlsx","url":"/courses/accounting/sverka-shablon.xlsx","size":14832,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (44, 6, 'Сверьте реестр платежей с банковской выпиской', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (45, 6, 'Проверьте банк в обратном направлении: пропущенные и повторные оплаты', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},{"id":"acc-sverka-shablon.xlsx","name":"sverka-shablon.xlsx","path":"/courses/accounting/sverka-shablon.xlsx","url":"/courses/accounting/sverka-shablon.xlsx","size":14832,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (46, 6, 'Сопоставление по нескольким признакам и выделение ошибок цветом', '{"materials":[{"id":"acc-sverka-shablon.xlsx","name":"sverka-shablon.xlsx","path":"/courses/accounting/sverka-shablon.xlsx","url":"/courses/accounting/sverka-shablon.xlsx","size":14832,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (47, 6, 'Сверка с контрагентом: договоры, начисления и задолженность', '{"materials":[{"id":"acc-sverka-shablon.xlsx","name":"sverka-shablon.xlsx","path":"/courses/accounting/sverka-shablon.xlsx","url":"/courses/accounting/sverka-shablon.xlsx","size":14832,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (48, 6, 'Сверка книг покупок и продаж с учётом: общая методика', '{}'),
    (49, 7, 'Соберите сводную таблицу', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (50, 7, 'Группировка: отчёт по организациям и месяцам', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (51, 7, 'Сделайте отчёт наглядным: диаграмма и срез', '{}'),
    (52, 7, 'Обновите отчёт и убедитесь, что ничего не потерялось', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (53, 7, 'Управленческий отчёт руководителю: расходы и движение денег', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (54, 7, 'Задолженность и план-факт', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (55, 7, 'Управленческая, бухгалтерская, налоговая и статистическая отчётность: чем отличаются', '{}'),
    (56, 8, 'Что такое Power Query и где он есть', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (57, 8, 'Импорт XLS, XLSX, CSV и PDF', '{"materials":[{"id":"acc-vygruzki-dlya-power-query.zip","name":"vygruzki-dlya-power-query.zip","path":"/courses/accounting/vygruzki-dlya-power-query.zip","url":"/courses/accounting/vygruzki-dlya-power-query.zip","size":16011,"mime":"application/zip"},{"id":"acc-03.xlsx","name":"03.xlsx","path":"/courses/accounting/03.xlsx","url":"/courses/accounting/03.xlsx","size":0,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},{"id":"acc--01.xlsx","name":"-01.xlsx","path":"/courses/accounting/-01.xlsx","url":"/courses/accounting/-01.xlsx","size":0,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (58, 8, 'Объедините ежемесячные выгрузки из папки', '{"materials":[{"id":"acc-vygruzki-dlya-power-query.zip","name":"vygruzki-dlya-power-query.zip","path":"/courses/accounting/vygruzki-dlya-power-query.zip","url":"/courses/accounting/vygruzki-dlya-power-query.zip","size":16011,"mime":"application/zip"},{"id":"acc-03.xlsx","name":"03.xlsx","path":"/courses/accounting/03.xlsx","url":"/courses/accounting/03.xlsx","size":0,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (59, 8, 'Подтяните справочник, добавьте записи и найдите несовпадения', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (60, 8, 'Очистка, преобразование и группировка', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (61, 8, 'Параметры, обновление и ошибки импорта', '{}'),
    (62, 8, 'Power Pivot и модель данных', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (63, 8, 'VBA и локальные скрипты', '{}'),
    (64, 8, 'Безопасность макросов: что делать с предупреждением', '{}'),
    (65, 9, 'Можно ли вам Google Таблицы: доступность и персональные данные', '{}'),
    (66, 9, 'Чем Google Таблицы отличаются от Excel: доступ, формулы', '{}'),
    (67, 9, 'Свяжите листы и используйте FILTER / UNIQUE', '{}'),
    (68, 9, 'QUERY: запрос к таблице как к базе', '{}'),
    (69, 9, 'IMPORTRANGE: связать две книги и обновление', '{}'),
    (70, 9, 'Сводная таблица в Google Таблицах', '{}'),
    (71, 9, 'Apps Script: короткий скрипт и его риски', '{}'),
    (72, 10, 'Активы, обязательства и двойная запись за 15 минут', '{}'),
    (73, 10, 'План счетов, субсчета и субконто', '{}'),
    (74, 10, 'Первичка и регистры: что требует закон', '{}'),
    (75, 10, 'ОСВ, карточка и анализ счёта: что показывает каждый', '{}'),
    (76, 10, 'Учётная политика и закрытие периода', '{}'),
    (77, 10, 'Исправление ошибок и существенность', '{}'),
    (78, 10, 'Оценочные значения и бухучёт против налогового', '{}'),
    (79, 11, 'Узнайте свою версию и сделайте безопасное место для опыта', '{}'),
    (80, 11, 'Интерфейс, поиск, справочники и несколько организаций', '{}'),
    (81, 11, 'Поймите, какой документ создаёт проводку', '{}'),
    (82, 11, 'Проверьте операцию через ОСВ и карточку счёта', '{}'),
    (83, 11, 'Поиск причин ошибок, отмена проведения и корректировки', '{}'),
    (84, 11, 'Экспорт в Excel и импорт из файла', '{}'),
    (85, 11, 'Обработки и групповые операции', '{}'),
    (86, 11, 'Права, копирование и резервная копия', '{}'),
    (87, 12, 'Первичный документ: семь реквизитов, договор и закрывающие документы', '{}'),
    (88, 12, 'Поступление и реализация: акт, УПД, счёт-фактура — без НДС и с НДС', '{}'),
    (89, 12, 'Авансы, возвраты и корректировки — без НДС и с НДС (22/122)', '{}'),
    (90, 12, 'Основные средства и капвложения: от 08 до 01 и амортизация', '{}'),
    (91, 12, 'Запасы и НМА; резерв под обесценение и оценочные обязательства', '{}'),
    (92, 12, 'Аренда по ФСБУ 25/2018: когда можно учитывать по-простому', '{}'),
    (93, 12, 'Подотчёт и командировки: авансовый отчёт за 3 рабочих дня и суточные', '{}'),
    (94, 12, 'Инвентаризация по ФСБУ 28/2023, акт сверки и ЭДО', '{}'),
    (95, 13, 'Платёжное поручение поставщику: пять проверок до отправки', '{}'),
    (96, 13, 'Банковская выписка: загрузка, разнесение и сверка остатка', '{}'),
    (97, 13, 'Обмен 1С и банка не работает: диагностика по шагам', '{}'),
    (98, 13, 'Эквайринг и комиссии банка — без НДС и с НДС (с 2026 года)', '{}'),
    (99, 13, 'Возвраты денег и зарплатные реестры: что чем оформлять', '{}'),
    (100, 13, 'Контроль банковских операций и защита от двойной оплаты', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (101, 14, 'Кто может быть самозанятым и почему это важно заказчику', '{}'),
    (102, 14, 'Статус НПД на дату выплаты и утрата статуса', '{"materials":[{"id":"acc-samozanyatye-kontrol.xlsx","name":"samozanyatye-kontrol.xlsx","path":"/courses/accounting/samozanyatye-kontrol.xlsx","url":"/courses/accounting/samozanyatye-kontrol.xlsx","size":21558,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (103, 14, 'Договор, акт, реквизиты и справочники самозанятого в 1С', '{}'),
    (104, 14, 'Учёт услуг самозанятого: проводки, расходы, взносы', '{}'),
    (105, 14, 'Реестр выплат самозанятым: создать, заполнить, записать, провести, отправить', '{}'),
    (106, 14, 'Реестр не проводится: найдите этап и ветку диагностики', '{}'),
    (107, 14, 'Подтвердите оплату и получите чеки самозанятых', '{"materials":[{"id":"acc-samozanyatye-kontrol.xlsx","name":"samozanyatye-kontrol.xlsx","path":"/courses/accounting/samozanyatye-kontrol.xlsx","url":"/courses/accounting/samozanyatye-kontrol.xlsx","size":21558,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (108, 14, 'Повторная оплата и возврат: как не заплатить дважды', '{"materials":[{"id":"acc-samozanyatye-kontrol.xlsx","name":"samozanyatye-kontrol.xlsx","path":"/courses/accounting/samozanyatye-kontrol.xlsx","url":"/courses/accounting/samozanyatye-kontrol.xlsx","size":21558,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (109, 14, 'Бывшие работники и налоговые риски: журнал контроля выплат', '{"materials":[{"id":"acc-samozanyatye-kontrol.xlsx","name":"samozanyatye-kontrol.xlsx","path":"/courses/accounting/samozanyatye-kontrol.xlsx","url":"/courses/accounting/samozanyatye-kontrol.xlsx","size":21558,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (110, 14, 'Тренажёр: пять учебных ситуаций с реестром самозанятых', '{}'),
    (111, 15, 'Человек, запись и ставка — три разных числа', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},{"id":"acc-chislennost-shablon.xlsx","name":"chislennost-shablon.xlsx","path":"/courses/accounting/chislennost-shablon.xlsx","url":"/courses/accounting/chislennost-shablon.xlsx","size":1256955,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (112, 15, 'ОСН, СОВ и ДЕКРЕТ: кого считать в какой организации', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (113, 15, 'Единицы без ручного ввода и контроль «на проверке»', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},{"id":"acc-chislennost-shablon.xlsx","name":"chislennost-shablon.xlsx","path":"/courses/accounting/chislennost-shablon.xlsx","url":"/courses/accounting/chislennost-shablon.xlsx","size":1256955,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (114, 15, 'Итоги по организациям и по группе', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},{"id":"acc-chislennost-shablon.xlsx","name":"chislennost-shablon.xlsx","path":"/courses/accounting/chislennost-shablon.xlsx","url":"/courses/accounting/chislennost-shablon.xlsx","size":1256955,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (115, 15, 'Показатели, которые нельзя смешивать: от записей до среднесписочной', '{}'),
    (116, 15, 'Организации только с итогом: отдельно и с предупреждением', '{"materials":[{"id":"acc-chislennost-shablon.xlsx","name":"chislennost-shablon.xlsx","path":"/courses/accounting/chislennost-shablon.xlsx","url":"/courses/accounting/chislennost-shablon.xlsx","size":1256955,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (117, 15, 'Шаблон «численность»: месяц за 15 минут и десять ловушек', '{"materials":[{"id":"acc-chislennost-shablon.xlsx","name":"chislennost-shablon.xlsx","path":"/courses/accounting/chislennost-shablon.xlsx","url":"/courses/accounting/chislennost-shablon.xlsx","size":1256955,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (118, 15, 'Power Query: папка выгрузок → «Обновить все» и журнал ошибок', '{"materials":[{"id":"acc-chislennost-shablon.xlsx","name":"chislennost-shablon.xlsx","path":"/courses/accounting/chislennost-shablon.xlsx","url":"/courses/accounting/chislennost-shablon.xlsx","size":1256955,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (119, 15, 'Как объяснить задачу ИИ и проверить его ответ', '{"materials":[{"id":"acc-chislennost-shablon.xlsx","name":"chislennost-shablon.xlsx","path":"/courses/accounting/chislennost-shablon.xlsx","url":"/courses/accounting/chislennost-shablon.xlsx","size":1256955,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (120, 15, 'Основное место, совместительство, совмещение, неполное время и штатное расписание', '{}'),
    (121, 15, 'Табель и зарплата за месяц', '{}'),
    (122, 15, 'Отпускные и расчёт при увольнении', '{}'),
    (123, 15, 'Больничные, беременность и роды, уход за ребёнком', '{}'),
    (124, 15, 'НДФЛ, страховые взносы и удержания из зарплаты', '{}'),
    (125, 15, 'Кадровая и зарплатная отчётность, 1С:ЗУП 3.1', '{}'),
    (126, 16, 'Налоговые режимы 2026: ОСНО, УСН, ПСН, АУСН, НПД', '{}'),
    (127, 16, 'НДС в 2026 году: 22 %, УСН с НДС и порог 20 млн', '{}'),
    (128, 16, 'Налог на прибыль и налоги на имущество, транспорт, землю', '{}'),
    (129, 16, 'НДФЛ и взносы: что платит и сдаёт работодатель', '{}'),
    (130, 16, 'ЕНС, ЕНП и уведомления', '{}'),
    (131, 16, 'Декларации, расчёты и налоговый календарь в Excel', '{}'),
    (132, 16, 'Бухгалтерская отчётность и кто что принимает: ФНС, СФР, Росстат', '{}'),
    (133, 16, 'Электронная подпись и машиночитаемая доверенность', '{}'),
    (134, 16, 'Требования ФНС и уточнённые декларации', '{}'),
    (135, 16, 'Изменения 2026–2027: что уже принято, а что только проект', '{}'),
    (136, 17, 'Все документы и выписки на месте, взаиморасчёты сверены', '{}'),
    (137, 17, 'ОСВ перед закрытием: отрицательные остатки', '{}'),
    (138, 17, 'Регламентные операции и амортизация в «Закрытии месяца»', '{}'),
    (139, 17, 'Себестоимость, закрытие счетов и финансовый результат', '{}'),
    (140, 17, 'Диагностика закрытия: когда помощник показывает ошибки', '{}'),
    (141, 17, 'Исправление прошлых периодов в закрытой базе', '{}'),
    (142, 17, 'Контрольный чек-лист закрытия месяца', '{"materials":[{"id":"acc-zakrytie-mesyaca-cheklist.xlsx","name":"zakrytie-mesyaca-cheklist.xlsx","path":"/courses/accounting/zakrytie-mesyaca-cheklist.xlsx","url":"/courses/accounting/zakrytie-mesyaca-cheklist.xlsx","size":10840,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (143, 18, 'С 2027 года: ФСБУ 9/2025 и ФСБУ 10/2026 вместо ПБУ 9/99, ПБУ 2/2008, ПБУ 10/99', '{}'),
    (144, 18, 'Кого касаются новые стандарты и можно ли перейти раньше', '{}'),
    (145, 18, 'Выручка по ФСБУ 9/2025: пять условий, передача контроля, оценка', '{}'),
    (146, 18, 'Выручка по степени готовности: расчёт и проводки', '{}'),
    (147, 18, 'Скидки, бонусы, отсрочка и рассрочка: оценка выручки и расходов', '{}'),
    (148, 18, 'Доходы, отличные от выручки: что это и как оценить', '{}'),
    (149, 18, 'Расходы по ФСБУ 10/2026: классификация, признание, оценка', '{}'),
    (150, 18, 'Отчётность и раскрытие доходов и расходов с 2027 года', '{}'),
    (151, 18, 'Учётная политика на 2027 год и переходные положения', '{}'),
    (152, 18, 'Договоры, документы и входящие данные: реестр и чек-лист перехода', '{}'),
    (153, 18, '1С:Бухгалтерия и новые стандарты: что подтверждено по релизам', '{}'),
    (154, 18, 'Другие изменения 2027: налоги, взносы, формы, сроки — принятые акты и проекты', '{}'),
    (155, 19, 'Спросите нейросеть так же просто, как Алису', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (156, 19, 'Обезличить таблицу и исправить формулу ИИ', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (157, 19, 'Скрипт от ИИ: только на копиях и с журналом', '{}'),
    (158, 19, 'Ошибка 1С и инструкция: что отдать ИИ и как проверить', '{}'),
    (159, 19, 'Достать данные из PDF и не доверять слепо', '{}'),
    (160, 19, 'Проверка ответа ИИ: галлюцинации и ссылки на нормы', '{}'),
    (161, 19, 'Письма, пояснения и чек-листы с помощью ИИ', '{}'),
    (162, 19, 'Библиотека промптов бухгалтера', '{}'),
    (163, 20, 'Какой инструмент автоматизации выбрать', '{}'),
    (164, 20, 'Python и pandas: объединить выгрузки, сверить, сделать отчёт', '{"materials":[{"id":"acc-vygruzki-dlya-power-query.zip","name":"vygruzki-dlya-power-query.zip","path":"/courses/accounting/vygruzki-dlya-power-query.zip","url":"/courses/accounting/vygruzki-dlya-power-query.zip","size":16011,"mime":"application/zip"},{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (165, 20, 'Напоминания и календарь сроков', '{}'),
    (166, 20, 'OCR: распознавание сканов под контролем человека', '{}'),
    (167, 20, 'Официальные интерфейсы 1С: OData только на чтение', '{}'),
    (168, 20, 'Проверки, журналы, тесты и восстановление', '{"materials":[{"id":"acc-vygruzki-dlya-power-query.zip","name":"vygruzki-dlya-power-query.zip","path":"/courses/accounting/vygruzki-dlya-power-query.zip","url":"/courses/accounting/vygruzki-dlya-power-query.zip","size":16011,"mime":"application/zip"}]}'),
    (169, 20, 'Безопасное внедрение: что нельзя автоматизировать без человека', '{}'),
    (170, 21, 'Персональные данные в работе бухгалтера: 152-ФЗ', '{}'),
    (171, 21, 'Обезличивание: как убрать личность из данных', '{}'),
    (172, 21, 'Зарубежные ИИ, локализация и трансграничная передача', '{}'),
    (173, 21, 'Коммерческая тайна и требования работодателя', '{}'),
    (174, 21, 'Фишинг, поддельные счета и подмена реквизитов', '{}'),
    (175, 21, 'Макросы: когда включать, когда нет', '{}'),
    (176, 21, 'Электронная подпись: ключ — это ваша подпись', '{}'),
    (177, 21, 'Пароли, копии и права доступа', '{}'),
    (178, 21, 'Как безопасно передавать документы', '{}'),
    (179, 22, 'Проект 1. Численность без двойного учёта', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},{"id":"acc-chislennost-shablon.xlsx","name":"chislennost-shablon.xlsx","path":"/courses/accounting/chislennost-shablon.xlsx","url":"/courses/accounting/chislennost-shablon.xlsx","size":1256955,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (180, 22, 'Проект 2. Объединение выгрузок в один файл', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},{"id":"acc-vygruzki-dlya-power-query.zip","name":"vygruzki-dlya-power-query.zip","path":"/courses/accounting/vygruzki-dlya-power-query.zip","url":"/courses/accounting/vygruzki-dlya-power-query.zip","size":16011,"mime":"application/zip"}]}'),
    (181, 22, 'Проект 3. Сверка реестра платежей с банком', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},{"id":"acc-sverka-shablon.xlsx","name":"sverka-shablon.xlsx","path":"/courses/accounting/sverka-shablon.xlsx","url":"/courses/accounting/sverka-shablon.xlsx","size":14832,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (182, 22, 'Проект 4. Дубли платежей', '{}'),
    (183, 22, 'Проект 5. Контроль выплат самозанятым и диагностика реестра', '{"materials":[{"id":"acc-samozanyatye-kontrol.xlsx","name":"samozanyatye-kontrol.xlsx","path":"/courses/accounting/samozanyatye-kontrol.xlsx","url":"/courses/accounting/samozanyatye-kontrol.xlsx","size":21558,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (184, 22, 'Проект 6. Управленческий отчёт по платежам', '{"materials":[{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}'),
    (185, 22, 'Проект 7. Комплектность документов', '{}'),
    (186, 22, 'Проект 8. Моя библиотека автоматизаций и итоговый проект', '{"materials":[{"id":"acc-chislennost-shablon.xlsx","name":"chislennost-shablon.xlsx","path":"/courses/accounting/chislennost-shablon.xlsx","url":"/courses/accounting/chislennost-shablon.xlsx","size":1256955,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},{"id":"acc-praktikum-ishodnyj.xlsx","name":"praktikum-ishodnyj.xlsx","path":"/courses/accounting/praktikum-ishodnyj.xlsx","url":"/courses/accounting/praktikum-ishodnyj.xlsx","size":14769,"mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}')
  ) as d(n, block, title, materials)
  where not exists (select 1 from lessons l where l.short_id = 'acc-ru-' || d.n);
end $$;
