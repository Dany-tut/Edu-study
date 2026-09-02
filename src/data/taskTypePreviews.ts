// ─── Превью типов заданий ────────────────────────────────────────────────────
//
// Учитель выбирает тип по строке «иконка + подпись + хинт», и до сих пор ему
// приходилось добавлять задание, чтобы увидеть, что это вообще такое. Здесь
// лежит ответ на два вопроса, задаваемых у этой строки: «как это выглядит
// ученику» (blocks — мини-макет) и «зачем этот тип, когда есть соседний»
// (teaches — одна фраза).
//
// ПОЧЕМУ МАКЕТ, А НЕ ЖИВОЙ СОЛВЕР. Настоящее задание рисует HomeworkFlow — это
// пять тысяч строк, которые ради подсказки в палитре приехали бы в чанк
// редактора целиком. Здесь описание набрано полутора десятками примитивов
// (плитка, поле, ряд вариантов, вердикт), и рисует их один небольшой
// компонент; сам файл приезжает лениво — при первом наведении на «i».
//
// ЧЕМ ПЛАТИМ. Макет может разойтись с настоящим заданием. Поэтому он нарочно
// схематичен: показывает СТРОЕНИЕ упражнения (что ученик видит, чем отвечает),
// а не точную вёрстку — расходиться в схеме нечему, пока тип не переделан.
//
// Карта полная по TaskTypeId: новый тип не соберётся без записи здесь.

import type { TaskTypeId } from './taskTypes'

// ─── Примитивы ───────────────────────────────────────────────────────────────

/**
 * Состояние плитки/варианта. `ghost` — израсходованная или недоступная
 * (слово ушло из банка, вариант не выбран), `active` — то, чего касается рука.
 */
export type ChipState = 'correct' | 'wrong' | 'active' | 'ghost'

export interface PreviewChip {
  text: string
  state?: ChipState
}

/** Кусок предложения с пропуском: строка текста либо место для ответа. */
export type GapPart =
  | string
  | { input: string }   // поле ввода (текст внутри — уже вписанное)
  | { select: string }  // выпадающий список
  | { pill: string }    // подставленное слово плиткой

export type PreviewBlock =
  /** Условие/инструкция над заданием. */
  | { kind: 'prompt'; text: string; muted?: boolean }
  /** Варианты ответа: кружки (один) или квадраты (несколько). */
  | { kind: 'choices'; options: PreviewChip[]; multi?: boolean }
  /** Утверждения с тремя вердиктами в строку (верно / неверно / не указано). */
  | { kind: 'verdictRows'; rows: Array<{ text: string; pick?: 'T' | 'F' | 'NG' }> }
  /** Банк плиток, из которого берут. */
  | { kind: 'tiles'; items: PreviewChip[]; label?: string }
  /** Строка-конструктор: что уже собрано. */
  | { kind: 'line'; items: PreviewChip[]; placeholder?: string }
  /** Предложение с пропусками внутри строки. */
  | { kind: 'gap'; parts: GapPart[] }
  /** Поле ответа; lines > 1 — большое поле под текст. */
  | { kind: 'field'; text?: string; lines?: number }
  /** Два столбца, которые соединяют. */
  | { kind: 'pairs'; rows: Array<{ left: string; right: string; linked?: boolean }> }
  /** Именованные корзины, по которым раскладывают. */
  | { kind: 'columns'; cols: Array<{ title: string; items: PreviewChip[] }> }
  /** Таблица; null в клетке — пропуск, который заполняет ученик. */
  | { kind: 'table'; headers: string[]; rows: Array<Array<string | null>> }
  /** Плеер: задание начинается со звука. */
  | { kind: 'audio'; label?: string }
  /** Запись голоса. */
  | { kind: 'mic'; label?: string }
  /** Словарная карточка (обратная сторона — если её уже перевернули). */
  | { kind: 'card'; front: string; back?: string }
  /** Медиа-заглушка: картинка, пара картинок, видео, поле для рисования. */
  | { kind: 'media'; shape: 'image' | 'images' | 'video' | 'canvas' | 'embed'; glyph?: string }
  /** Экранная клавиатура; pressed — подсвеченная клавиша. */
  | { kind: 'keys'; rows: string[][]; pressed?: string }
  /** Сетка кроссворда; null — клетка вне слова, '' — пустая под ответ. */
  | { kind: 'grid'; cells: Array<Array<string | null>>; clue?: string }
  /** Реплики диалога. */
  | { kind: 'dialog'; lines: Array<{ speaker: string; text: string; side: 'l' | 'r' }> }
  /** Плашка результата — там, где проверка видна сразу. */
  | { kind: 'verdict'; text: string; ok?: boolean }

export interface TaskTypePreview {
  /**
   * Чему учит — одной фразой, и обязательно в отличие от соседних типов.
   * Не пересказ хинта: хинт говорит, ЧТО делает ученик, эта строка — ЗАЧЕМ.
   */
  teaches: string
  blocks: PreviewBlock[]
}

// ─── Карта ───────────────────────────────────────────────────────────────────

export const TASK_TYPE_PREVIEWS: Record<TaskTypeId, TaskTypePreview> = {
  // ── базовые ──

  single: {
    teaches: 'Узнавание: верная форма опознаётся среди похожих, писать ничего не нужно.',
    blocks: [
      { kind: 'prompt', text: 'She ___ to school every day.' },
      { kind: 'choices', options: [
        { text: 'go' },
        { text: 'goes', state: 'correct' },
        { text: 'going' },
      ] },
    ],
  },

  multi: {
    teaches: 'Признак проверяется на выборке: верных вариантов несколько, и угадать один недостаточно.',
    blocks: [
      { kind: 'prompt', text: 'Отметьте неправильные глаголы' },
      { kind: 'choices', multi: true, options: [
        { text: 'go', state: 'correct' },
        { text: 'want' },
        { text: 'take', state: 'correct' },
      ] },
    ],
  },

  fill: {
    teaches: 'Ответ пишется с нуля: ни плиток, ни вариантов — форма достаётся из памяти.',
    blocks: [
      { kind: 'prompt', text: 'She ___ (go) to school.' },
      { kind: 'field', text: 'goes' },
      { kind: 'verdict', text: 'Верно', ok: true },
    ],
  },

  extended: {
    teaches: 'Свободный текст: мысль, а не форма. Проверяет учитель.',
    blocks: [
      { kind: 'prompt', text: 'Опишите свой обычный день — 5 предложений.' },
      { kind: 'field', lines: 3, text: 'I usually get up at seven…' },
    ],
  },

  matching: {
    teaches: 'Связь один-к-одному: слово и его пара держатся вместе.',
    blocks: [
      { kind: 'prompt', text: 'Соедините слово и перевод' },
      { kind: 'pairs', rows: [
        { left: 'breakfast', right: 'завтрак', linked: true },
        { left: 'lunch', right: 'ужин' },
        { left: 'dinner', right: 'обед' },
      ] },
    ],
  },

  sequence: {
    teaches: 'Порядок целого: события, шаги или абзацы выстраиваются в верную цепочку.',
    blocks: [
      { kind: 'prompt', text: 'Расставьте по порядку' },
      { kind: 'line', items: [{ text: '1. He woke up' }] },
      { kind: 'line', items: [{ text: '2. He had breakfast' }] },
      { kind: 'line', items: [{ text: '3. He left home', state: 'active' }] },
    ],
  },

  tableFill: {
    teaches: 'Система на виду: пропуски в таблице показывают ряд, а не отдельный случай.',
    blocks: [
      { kind: 'table', headers: ['Infinitive', 'Past', 'Participle'], rows: [
        ['go', 'went', null],
        ['take', null, 'taken'],
      ] },
    ],
  },

  whiteboard: {
    teaches: 'Решение от руки: схема, разбор, чертёж — то, что не набирается словами.',
    blocks: [
      { kind: 'prompt', text: 'Нарисуйте схему предложения' },
      { kind: 'media', shape: 'canvas' },
    ],
  },

  // ── языковые ──

  wordBank: {
    teaches: 'Порядок слов без клавиатуры: конструкция собирается целиком, орфография не мешает.',
    blocks: [
      { kind: 'prompt', text: 'Соберите предложение' },
      { kind: 'line', items: [{ text: 'I' }, { text: 'like' }], placeholder: 'Тапайте слова ниже' },
      { kind: 'tiles', items: [
        { text: 'I', state: 'ghost' },
        { text: 'like', state: 'ghost' },
        { text: 'English' },
        { text: 'very' },
      ] },
    ],
  },

  listenType: {
    teaches: 'Слух без опор: услышанное надо записать самому — самая честная проверка понимания на слух.',
    blocks: [
      { kind: 'audio', label: 'Прослушать' },
      { kind: 'field', text: 'I have breakfast at eight.' },
    ],
  },

  listenBank: {
    teaches: 'Та же диктовка, но ступенью ниже: слова даны — проверяется, что услышано, а не как пишется.',
    blocks: [
      { kind: 'audio' },
      { kind: 'line', items: [{ text: 'I' }, { text: 'have' }], placeholder: 'Соберите услышанное' },
      { kind: 'tiles', items: [
        { text: 'I', state: 'ghost' },
        { text: 'have', state: 'ghost' },
        { text: 'breakfast' },
        { text: 'at' },
      ] },
    ],
  },

  minimalPair: {
    teaches: 'Различение звуков: две формы отличаются одним звуком — ухо настраивается на него.',
    blocks: [
      { kind: 'audio', label: 'Прозвучало' },
      { kind: 'choices', options: [
        { text: 'ship', state: 'correct' },
        { text: 'sheep' },
      ] },
    ],
  },

  speaking: {
    teaches: 'Речь вслух: ученик говорит, а сказанное сверяется с эталоном сразу.',
    blocks: [
      { kind: 'prompt', text: 'Скажите вслух: «Меня зовут…»' },
      { kind: 'mic', label: '00:07' },
      { kind: 'verdict', text: 'Совпало с эталоном', ok: true },
    ],
  },

  imageDescribe: {
    teaches: 'Порождение из ничего: опора не в тексте, а в картинке — слова ищет сам ученик.',
    blocks: [
      { kind: 'media', shape: 'image' },
      { kind: 'field', lines: 2, text: 'There is a cat on the…' },
    ],
  },

  imageCompare: {
    teaches: 'Сравнение: находить общее и разное — язык оценки и противопоставления.',
    blocks: [
      { kind: 'media', shape: 'images' },
      { kind: 'field', lines: 2, text: 'Both pictures show…' },
    ],
  },

  flashcard: {
    teaches: 'Словарь: одна пара «слово — перевод», переворачивается и уходит в повторение.',
    blocks: [
      { kind: 'card', front: 'breakfast', back: 'завтрак' },
    ],
  },

  videoWatch: {
    teaches: 'Погружение: ролик или серия засчитываются по просмотру, а не по ответу.',
    blocks: [
      { kind: 'media', shape: 'video' },
      { kind: 'verdict', text: 'Просмотрено 4:12 из 5:00', ok: true },
    ],
  },

  pattern: {
    teaches: 'Дрилл: шаблон один, меняется одно место — к пятой строке рука ставит форму сама.',
    blocks: [
      { kind: 'prompt', text: 'I usually ___ at seven.', muted: true },
      { kind: 'gap', parts: [{ pill: 'get up' }, ' → I usually ', { input: 'get up' }, ' at seven.'] },
      { kind: 'gap', parts: [{ pill: 'have tea' }, ' → I usually ', { input: '' }, ' at seven.'] },
    ],
  },

  // ── письменность ──

  trace: {
    teaches: 'Рука запоминает форму буквы: черты идут в правильном порядке и направлении.',
    blocks: [
      { kind: 'prompt', text: 'Обведите: ㄱ' },
      { kind: 'media', shape: 'canvas', glyph: 'ㄱ' },
    ],
  },

  buildSyllable: {
    teaches: 'Слог как устройство: буквы собираются в блок — видно, из чего состоит знак.',
    blocks: [
      { kind: 'tiles', items: [{ text: 'ㄱ' }, { text: 'ㅣ' }, { text: 'ㅁ' }] },
      { kind: 'line', items: [{ text: '김', state: 'correct' }] },
    ],
  },

  // ── сборка тапами ──

  unscramble: {
    teaches: 'Взгляд на написанное: слово дано неправильно — ошибку надо увидеть и исправить.',
    blocks: [
      { kind: 'prompt', text: '요하녕세안', muted: true },
      { kind: 'line', items: [{ text: '안' }, { text: '녕' }], placeholder: 'Соберите правильно' },
      { kind: 'tiles', items: [
        { text: '요' }, { text: '하' }, { text: '녕', state: 'ghost' },
        { text: '세' }, { text: '안', state: 'ghost' },
      ] },
    ],
  },

  blockOrder: {
    teaches: 'Порядок тапами: авторские блоки — реплики, части фразы — выстраиваются без перетаскивания.',
    blocks: [
      { kind: 'line', items: [{ text: 'Good morning,' }], placeholder: 'Тапайте блоки' },
      { kind: 'tiles', items: [
        { text: 'Good morning,', state: 'ghost' },
        { text: 'how are you?' },
        { text: 'I am fine.' },
      ] },
    ],
  },

  charBank: {
    teaches: 'Обманки в ряду: нужный слог надо найти среди похожих, а не просто расставить данные.',
    blocks: [
      { kind: 'prompt', text: 'Соберите слово «здравствуйте»' },
      { kind: 'line', items: [{ text: '안' }, { text: '녕' }] },
      { kind: 'tiles', items: [
        { text: '안', state: 'ghost' }, { text: '넝' }, { text: '녕', state: 'ghost' },
        { text: '하' }, { text: '허' }, { text: '세' },
      ] },
    ],
  },

  jamoType: {
    teaches: 'Настоящий набор: буквы жмутся по одной и складываются в слоги на глазах.',
    blocks: [
      { kind: 'line', items: [{ text: '안', state: 'correct' }, { text: 'ㄴ', state: 'active' }] },
      { kind: 'keys', rows: [['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ'], ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ']], pressed: 'ㄴ' },
    ],
  },

  dialogGap: {
    teaches: 'Реплика в контексте: диалог озвучен разными голосами — недостающее слышно по смыслу.',
    blocks: [
      { kind: 'dialog', lines: [
        { speaker: 'A', text: 'How are you?', side: 'l' },
        { speaker: 'B', text: 'I am ____, thanks.', side: 'r' },
      ] },
      { kind: 'tiles', items: [{ text: 'fine' }, { text: 'five' }, { text: 'find' }] },
    ],
  },

  wordDrop: {
    teaches: 'Банк один на пачку: слово уходит навсегда — проверяется различение слов между собой.',
    blocks: [
      { kind: 'gap', parts: ['I ', { pill: 'have' }, ' breakfast at eight.'] },
      { kind: 'gap', parts: ['She ', { input: '' }, ' to school by bus.'] },
      { kind: 'tiles', label: 'Банк слов', items: [
        { text: 'have', state: 'ghost' }, { text: 'goes' }, { text: 'takes' }, { text: 'is' },
      ] },
    ],
  },

  // ── работа с текстом и системой ──

  trueFalse: {
    teaches: 'Отличать сказанное в тексте от додуманного: третья кнопка ловит то, чего в тексте нет.',
    blocks: [
      { kind: 'prompt', text: 'Anna gets up at seven. She walks to the station.', muted: true },
      { kind: 'verdictRows', rows: [
        { text: 'Anna walks to the station.', pick: 'T' },
        { text: 'She drives a car.', pick: 'F' },
        { text: 'The train is late.', pick: 'NG' },
      ] },
    ],
  },

  dropdownGap: {
    teaches: 'Узнавание в контексте: ступень между выбором из четырёх и пустым полем.',
    blocks: [
      { kind: 'prompt', text: 'Выберите верную форму в каждом пропуске' },
      { kind: 'gap', parts: ['She ', { select: 'goes' }, ' to school and ', { select: '' }, ' English.'] },
      { kind: 'verdict', text: '1 из 2 · второй пропуск пуст', ok: false },
    ],
  },

  columnSort: {
    teaches: 'Признак, а не отдельное слово: десять предметов в три корзины показывают, работает ли правило.',
    blocks: [
      { kind: 'tiles', items: [{ text: 'Tisch', state: 'ghost' }, { text: 'Lampe' }, { text: 'Buch' }] },
      { kind: 'columns', cols: [
        { title: 'der', items: [{ text: 'Tisch', state: 'correct' }] },
        { title: 'die', items: [] },
        { title: 'das', items: [] },
      ] },
    ],
  },

  embed: {
    teaches: 'Чужое упражнение внутри домашки. Результат оттуда не приходит — засчитывается прохождение.',
    blocks: [
      { kind: 'media', shape: 'embed' },
      { kind: 'verdict', text: 'Отмечено выполненным', ok: true },
    ],
  },

  crossword: {
    teaches: 'Единственное задание без подсказки формы: слово вспоминается по значению, а пересечения проверяют себя сами.',
    blocks: [
      { kind: 'grid', cells: [
        ['안', '녕', null],
        [null, '', ''],
      ], clue: '1. Приветствие  2. Слово из двух слогов' },
    ],
  },
}
