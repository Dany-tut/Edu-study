import type { Subject, Lesson, TestTask, ScheduleDay } from './mockData';
import type { ProgressMap } from '../lib/db';
import { personalDemoRows } from '../lib/personalStudentDemo';
import { homeworkResult } from '../lib/homeworkResult';
/** Fictional content generated only after an explicit personal-preview activation. */
export function buildPersonalStudentDemo(owner: string) {
    const date = (offset: number) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const banks: Array<{
        id: string;
        name: string;
        modules: string[];
        topics: string[];
        questions: Array<[
            string,
            string[],
            number
        ]>;
        fills: Array<[
            string,
            string
        ]>;
    }> = [
        { id: 'chemistry', name: 'Химия', modules: ['Строение вещества', 'Химические реакции', 'Неорганическая химия', 'Органическая химия'], topics: ['Строение атома', 'Периодический закон', 'Химическая связь', 'Валентность', 'Степени окисления', 'Кристаллические решётки', 'Расчёты по формулам'], questions: [['Какой заряд имеет ядро атома?', ['Положительный', 'Отрицательный', 'Нулевой'], 0], ['Какое вещество является кислотой?', ['NaOH', 'HCl', 'NaCl'], 1], ['Какой газ поддерживает горение?', ['Азот', 'Кислород', 'Углекислый газ'], 1], ['Какая связь образуется между Na и Cl?', ['Ионная', 'Металлическая', 'Ковалентная неполярная'], 0]], fills: [['Впиши формулу воды.', 'H2O'], ['Как называется частица с отрицательным зарядом?', 'электрон']] },
        { id: 'biology', name: 'Биология', modules: ['Клетка', 'Организм', 'Генетика', 'Экология'], topics: ['Строение клетки', 'Клеточная мембрана', 'Обмен веществ', 'Фотосинтез', 'Клеточное дыхание', 'Деление клетки', 'Биосинтез белка'], questions: [['Какая органелла отвечает за синтез белка?', ['Рибосома', 'Лизосома', 'Вакуоль'], 0], ['Где протекает фотосинтез?', ['В митохондриях', 'В хлоропластах', 'В ядре'], 1], ['Что является единицей наследственности?', ['Ген', 'Ткань', 'Орган'], 0], ['Какой газ выделяется при фотосинтезе?', ['Кислород', 'Азот', 'Водород'], 0]], fills: [['Как называется основная структурная единица живого?', 'клетка'], ['Как называется деление соматической клетки?', 'митоз']] },
        { id: 'physics', name: 'Физика', modules: ['Механика', 'Молекулярная физика', 'Электричество', 'Оптика'], topics: ['Равномерное движение', 'Ускорение', 'Законы Ньютона', 'Силы в природе', 'Импульс', 'Работа и энергия', 'Закон сохранения энергии'], questions: [['В каких единицах измеряют силу?', ['Ньютон', 'Джоуль', 'Ватт'], 0], ['Как найти скорость равномерного движения?', ['Путь разделить на время', 'Время разделить на путь', 'Путь умножить на время'], 0], ['Какой прибор измеряет силу тока?', ['Вольтметр', 'Амперметр', 'Термометр'], 1], ['Как изменится сила тока при удвоении напряжения и постоянном сопротивлении?', ['Увеличится вдвое', 'Не изменится', 'Уменьшится вдвое'], 0]], fills: [['Тело прошло 120 м за 20 с. Впиши скорость в м/с.', '6'], ['При силе 10 Н и массе 2 кг впиши ускорение в м/с².', '5']] },
        { id: 'math', name: 'Математика', modules: ['Алгебра', 'Функции', 'Геометрия', 'Вероятность'], topics: ['Линейные уравнения', 'Квадратные уравнения', 'Неравенства', 'Системы уравнений', 'Степени и корни', 'Прогрессии', 'Текстовые задачи'], questions: [['Реши уравнение: 2x + 6 = 14.', ['2', '4', '8'], 1], ['Чему равен квадратный корень из 81?', ['8', '9', '18'], 1], ['Какова сумма углов треугольника?', ['90°', '180°', '360°'], 1], ['Какова вероятность орла при одном броске честной монеты?', ['0,25', '0,5', '1'], 1]], fills: [['Реши уравнение: 3x = 21. Впиши x.', '7'], ['Впиши площадь квадрата со стороной 6.', '36']] },
    ];
    function tasks(bank: typeof banks[number], prefix: string): TestTask[] {
        return [
            ...bank.questions.map(([question, choices, correct], i) => ({ id: `${prefix}-q${i}`, label: `Задание ${i + 1}`, type: 'single' as const, isHard: false, question, choices, correctChoices: [correct] })),
            ...bank.fills.map(([question, answer], i) => ({ id: `${prefix}-f${i}`, label: `Задание ${i + 5}`, type: 'fill' as const, isHard: false, question, answer })),
            { id: `${prefix}-multi`, label: 'Задание 7', type: 'multi', isHard: false, question: 'Выбери полезные шаги при решении учебной задачи.', choices: ['Выделить известные данные', 'Проверить единицы измерения', 'Угадать ответ без проверки', 'Проверить результат'], correctChoices: [0, 1, 3] },
            { id: `${prefix}-seq`, label: 'Задание 8', type: 'sequence', isHard: false, question: 'Расположи этапы решения задачи в правильном порядке.', sequenceItems: ['Прочитать условие', 'Выбрать способ решения', 'Выполнить решение', 'Проверить ответ'] },
        ];
    }
    const subjects: Subject[] = banks.map(bank => ({ id: bank.id, name: `${bank.name} · подготовка к экзамену`, subject: bank.name, progress: 25, activeModuleId: 1, accessMode: 'full', modules: bank.modules.map((label, mi) => ({ id: mi + 1, label, lessons: Array.from({ length: 8 }, (_, li): Lesson => {
                const number = mi * 8 + li + 1, id = `personal-demo-${bank.id}-${number}`, test = li === 7;
                const title = test ? `Контрольная работа · ${label}` : mi === 0 ? bank.topics[li] : `${label}: ${['основные понятия', 'разбор примеров', 'практикум', 'решение задач', 'сложные случаи', 'подготовка к экзамену', 'закрепление'][li]}`;
                const status: Lesson['status'] = li < 2 ? 'completed' : li === 2 ? 'returned' : li === 3 ? 'submitted' : 'current';
                return { id, subject: bank.id, number: number - 1, title, status, kind: test ? 'test' : 'lesson', shape: test ? 'square' : 'circle', points: li < 2 ? 92 - li * 7 : li === 2 ? 48 : undefined, comment: li === 2 ? 'Проверь обоснование ответа и повтори расчёт. Затем отправь исправленную работу.' : li < 2 ? 'Отличная работа! Основные понятия усвоены.' : undefined, scheduledDate: date(number - 10), scheduledTime: '18:00', description: `${title}. Теория, примеры и самостоятельная практика.`, testTasks: test ? tasks(bank, id) : undefined, hasHard: !test, heavyPending: false, homework: test ? undefined : { hwTitle: `Домашняя работа · ${title}`, hwDate: date(number - 7), hwTasks: [...tasks(bank, id), { id: `${id}-hard`, label: 'Задание 9 · с объяснением', type: 'extended', isHard: true, question: `Выбери одно из заданий по теме «${title}», запиши подробное решение и объясни каждый шаг. Укажи, как можно проверить результат.` }], extraHw: [{ id: 'practice', date: date(number - 5), tasks: tasks(bank, `${id}-extra`).slice(0, 4) }] } };
            }) })) }));
    const all = subjects.flatMap(s => s.modules.flatMap(m => m.lessons));
    const schedule: ScheduleDay[] = Array.from({ length: 61 }, (_, i) => { const offset = i - 21; return { date: date(offset), label: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(date(offset) + 'T12:00:00')), isToday: offset === 0, lessons: Array.from({ length: 3 }, (_, j) => { const subject = subjects[(i + j) % 4], lessons = subject.modules.flatMap(m => m.lessons), lesson = lessons[(i + j) % lessons.length]; return { id: lesson.id, subject: subject.subject!, lessonTitle: lesson.title, lessonNumber: lesson.number, time: ['16:00', '18:00', '19:30'][j], endTime: ['17:00', '19:00', '20:30'][j], kind: 'lesson' as const, passed: offset < 0, attendance: offset < 0 ? true : undefined }; }) }; });
    const progress: ProgressMap = Object.fromEntries(all.map(l => [l.id, { status: l.status, score: l.points ?? null, comment: '', reviewComment: l.comment ?? '', reviewAttachments: { photos: [], board: null }, hardSubmitted: false, hardTaskBlocks: [], hardReviewBlocks: [] }]));
    for (const row of personalDemoRows(owner)) {
        const lesson = all.find(l => l.id === row.lesson_ref);
        if (!lesson)
            continue;
        const status = row.status as Lesson['status'];
        const result = homeworkResult(row.attachments, row.score, status);
        progress[lesson.id] = { ...progress[lesson.id], status, score: row.score ?? null, result };
        Object.assign(lesson, { status, points: row.score ?? undefined, result });
    }
    const quizQuestions = banks.flatMap(b => b.questions.map(([title, options, correct], i) => ({ id: `personal-quiz-${b.id}-${i}`, title, subject: b.name, answers: options.map((text, n) => ({ id: `a${n}`, text, correct: n === correct })) })));
    return { subjects, scheduleDays: schedule, scheduleTodayIndex: 21, progress, quizQuestions,
        stats: { performance: 25, completedTasks: all.filter(l => l.status === 'completed').length, totalTasks: all.length, avgScore: Math.round(all.reduce((sum,l)=>sum+(l.points??0),0)/Math.max(1,all.filter(l=>l.points!=null).length)), streak: 7, totalPoints: all.reduce((sum,l)=>sum+(l.points??0),0), stars: 0 } };
}
