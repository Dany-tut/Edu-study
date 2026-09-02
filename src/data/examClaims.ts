// ─────────────────────────────────────────────────────────────────────────────
// Заявления курсов об экзаменах — что мы утверждаем и когда это в последний раз
// сверяли с официальным источником
//
// ЗАЧЕМ ЭТОТ ФАЙЛ. Курс, готовящий к экзамену, содержит утверждения о внешнем
// мире: «Reading — 60 минут», «말하기 сдаётся отдельным тестом», «бумажный
// формат». Мир их не согласовывает: в 2026 IELTS перестал существовать на
// бумаге, и курс полгода учил переносить ответы в бланк, которого больше нет.
//
// ЧЕМ ЭТО ОТЛИЧАЕТСЯ ОТ ОСТАЛЬНЫХ ПРОВЕРОК. checkVideos ловит мёртвую ссылку,
// checkLesson — нарушенный стандарт урока: обе смотрят ВНУТРЬ репозитория и
// дают точный ответ. Устаревшее заявление изнутри не видно вообще — файл
// компилируется, ссылка жива, урок проходит стандарт, а написанное в нём
// неправда. Единственный способ это поймать — сходить к первоисточнику
// глазами, и единственное, что можно автоматизировать, — напоминание сходить.
//
// ПОЭТОМУ ЗДЕСЬ ДАТА, А НЕ ПРОВЕРКА. `checked` — день, когда человек открыл
// `source` и убедился, что `claim` всё ещё верен. Скрипт (scripts/checkExamClaims.mjs)
// не умеет читать сайт экзамена за вас: он проверяет, что страница-источник
// вообще открывается, и напоминает про заявления, которых давно не касались.
//
// КАК ПОЛЬЗОВАТЬСЯ. `npm run check:exams` перед крупным релизом и раз в
// полгода. По каждому просроченному заявлению: открыть `source`, сверить,
// поправить курс, если разошлось, и обновить `checked` — даже когда ничего не
// изменилось. Дата «сверял и всё по-прежнему» так же ценна, как правка.
// ─────────────────────────────────────────────────────────────────────────────

export interface ExamClaim {
  /** Ключ курса-сида, который это утверждает. */
  course: string
  /** Экзамен, о котором речь. */
  exam: string
  /** Само утверждение — в том виде, в каком его читает ученик. */
  claim: string
  /** Где оно живёт: файл и, если можно, юнит. */
  where: string
  /** Официальная страница, по которой это проверяется. */
  source: string
  /** Когда человек в последний раз открыл source и сверил. ISO-дата. */
  checked: string
}

/**
 * Сколько заявление считается свежим.
 *
 * Полгода — не круглое число, а срок жизни экзаменационных новостей: и IELTS,
 * и TOPIK объявляют перемены за несколько месяцев до вступления в силу, так
 * что проверка дважды в год ловит их до того, как курс начнёт врать.
 */
export const CLAIM_FRESH_DAYS = 183

export const EXAM_CLAIMS: ExamClaim[] = [
  // ─── IELTS ───
  {
    course: 'ielt',
    exam: 'IELTS Academic',
    claim: 'Экзамен сдаётся на компьютере; бумажного формата больше нет (с середины 2026). В отдельных странах есть опция Writing on Paper — задания при этом всё равно на экране.',
    where: 'englishIelts.ts — шапка, ielt-05, ielt-20',
    source: 'https://ielts.org/take-a-test/test-types',
    checked: '2026-09-02',
  },
  {
    course: 'ielt',
    exam: 'IELTS Academic',
    claim: 'Listening — 4 части, 40 вопросов, запись звучит один раз.',
    where: 'englishIelts.ts — ielt-05',
    source: 'https://ielts.org/take-a-test/test-types/ielts-academic-test',
    checked: '2026-09-02',
  },
  {
    course: 'ielt',
    exam: 'IELTS Academic',
    claim: 'Reading Academic — 3 текста, 40 вопросов, 60 минут; отдельного времени на перенос ответов нет.',
    where: 'englishIelts.ts — ielt-08',
    source: 'https://ielts.org/take-a-test/test-types/ielts-academic-test',
    checked: '2026-09-02',
  },
  {
    course: 'ielt',
    exam: 'IELTS Academic',
    claim: 'Speaking — 11–14 минут, три части; во второй минута на подготовку и 1–2 минуты монолога.',
    where: 'englishIelts.ts — шапка, ielt-17…19',
    source: 'https://ielts.org/take-a-test/test-types/ielts-academic-test',
    checked: '2026-09-02',
  },
  {
    course: 'ielt',
    exam: 'IELTS Academic',
    claim: 'One Skill Retake: одну секцию можно пересдать в течение 60 дней, только на компьютерном формате.',
    where: 'englishIelts.ts — ielt-20',
    source: 'https://ielts.org/take-a-test/booking-your-test/one-skill-retake',
    checked: '2026-09-02',
  },

  // ─── TOPIK ───
  {
    course: 'kotp',
    exam: 'TOPIK I',
    claim: 'TOPIK I состоит из 듣기 и 읽기, всего 200 баллов; присваивает 1급 и 2급.',
    where: 'koreanTopik.ts — шапка, kotp-30',
    source: 'https://www.topik.go.kr/',
    checked: '2026-09-02',
  },
  {
    course: 'kotp',
    exam: 'TOPIK',
    claim: '말하기 не входит ни в TOPIK I, ни в TOPIK II — это отдельный тест.',
    where: 'koreanTopik.ts — шапка, kotp-30',
    source: 'https://www.topik.go.kr/',
    checked: '2026-09-02',
  },
  {
    course: 'kotp',
    exam: 'TOPIK',
    claim: 'Есть два формата сдачи: бумажный и компьютерный (IBT, с ноября 2023). Набор частей и уровни одинаковы; в IBT нет перерыва между частями.',
    where: 'koreanTopik.ts — kotp-30; koreanTopik2.ts — шапка',
    source: 'https://www.topik.go.kr/',
    checked: '2026-09-02',
  },
  {
    course: 'kot2',
    exam: 'TOPIK II',
    claim: 'TOPIK II — три части: 듣기 (50 вопросов, 60 минут), 쓰기 (4 задания, 50 минут), 읽기.',
    where: 'koreanTopik2.ts — шапка',
    source: 'https://www.topik.go.kr/',
    checked: '2026-09-02',
  },

  // ─── JLPT ───
  {
    course: 'jajl',
    exam: 'JLPT N5',
    claim: 'Уровни N5–N1; N5 проверяет 文字・語彙, 文法・読解 и 聴解.',
    where: 'japaneseJlpt.ts — финальный юнит',
    source: 'https://www.jlpt.jp/e/about/levelsummary.html',
    checked: '2026-09-02',
  },
  {
    course: 'jan3',
    exam: 'JLPT N3',
    claim: 'N3 состоит из 文字・語彙, 文法・読解 и 聴解; это ступень между N4 и N2.',
    where: 'japaneseJlptN3.ts — jan3-20',
    source: 'https://www.jlpt.jp/e/about/levelsummary.html',
    checked: '2026-09-02',
  },

  // ─── CELPE-Bras ───
  {
    course: 'ptbr',
    exam: 'CELPE-Bras',
    claim: 'CELPE-Bras начинается с уровня Intermediário: сдавать его на A1–A2 рано.',
    where: 'portugueseCelpe.ts — scopeNote, ptbr-22',
    source: 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/celpe-bras',
    checked: '2026-09-02',
  },
  {
    course: 'ptb2',
    exam: 'CELPE-Bras',
    claim: 'Экзамен состоит из письменной части (задания-жанры) и устной (interação face a face с elementos provocadores).',
    where: 'portugueseIntermediate.ts — ptb2-18',
    source: 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/celpe-bras',
    checked: '2026-09-02',
  },
]
