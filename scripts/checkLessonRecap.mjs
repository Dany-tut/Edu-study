// Итоги урока из расшифровки: псевдонимы вместо имён, разбор ответа модели,
// таймкоды по сегментам, раскладка черновика по уроку. Без сети и модели.
import assert from 'node:assert/strict'
import {
  extractJson, mergeRecap, numberLines, parseRecap, recapCost, recapSystem, recapUser, transcriptKey, readKinds,
  recapCards, recapHwTasks, recapNoteBody, recapParagraphs, recapSelfCheck, restoreNames,
} from '../src/lib/lessonRecap.ts'

const segments = [
  { start: 0, end: 4, text: 'Добрый день! Маша, слышно?', speaker: 't' },
  { start: 5, end: 7, text: 'Да, слышно.', speaker: 's1' },
  { start: 252, end: 260, text: 'Часы называем родными числами: 한 시, 두 시.', speaker: 't' },
  { start: 320, end: 323, text: 'Тогда в час — 일 시?', speaker: 's1' },
  { start: 324, end: 330, text: 'Нет, Мария Петрова, для часов — 한 시.', speaker: 't' },
  { start: 400, end: 402, text: '   ', speaker: 's2' },
  { start: 410, end: 414, text: 'А минуты?', speaker: 's2' },
]
const speakers = [
  { id: 't', label: 'Анна Сергеевна', role: 'teacher' },
  { id: 's1', label: 'Мария Петрова', role: 'student' },
  { id: 's2', label: 'Ученик 2', role: 'student' },
]

// ── Имена наружу не уходят ───────────────────────────────────────────────────
const { lines, aliases } = numberLines([...segments, { start: 420, end: 424, text: 'Катя сегодня не пришла, Екатерина болеет.', speaker: 't' }], speakers, ['Екатерина Смирнова', 'Мария Петрова'])
assert.equal(lines.length, 7, 'пустая реплика выброшена')
assert.deepEqual(lines.map(l => l.who), ['Учитель', 'Ученик А', 'Учитель', 'Ученик А', 'Учитель', 'Ученик Б', 'Учитель'])
assert.equal(lines[6].text, 'ученик сегодня не пришла, ученик болеет.', 'имена учеников курса, которые не говорили, тоже скрыты')
const prompt = recapUser({ course: 'Корейский', lesson: 'Который час', kinds: ['summary', 'note'], lines })
assert.ok(prompt.includes('Добрый день! Ученик А, слышно?'), 'уменьшительное «Маша» от «Мария» заменено')
for (const name of ['Маша', 'Мария', 'Петрова', 'Анна', 'Сергеевна', 'Катя', 'Екатерина'])
  assert.ok(!prompt.includes(name), `имя «${name}» не попадает в запрос модели`)
assert.ok(prompt.includes('Нет, Ученик А, для часов'), 'полное имя в тексте заменено целиком, а не по частям')
assert.ok(prompt.includes('Добрый день! Ученик А, слышно?'), 'имя без фамилии тоже заменено')
assert.ok(prompt.includes('[2] 04:12 Учитель: Часы'), 'реплики пронумерованы, время от начала записи')
assert.equal(aliases['Ученик А'], 'Мария Петрова')
assert.equal(restoreNames('Ученик А путала 일 и 한', aliases), 'Мария Петрова путала 일 и 한')
assert.ok(!recapSystem(['summary']).includes('- note:'), 'в инструкции только запрошенные виды')
assert.ok(recapSystem(['summary', 'note']).includes('- note:'))

// Хэш расшифровки меняется от текста, времени и подписей — и только от них.
assert.equal(transcriptKey(segments, speakers), transcriptKey(segments.map(s => ({ ...s })), speakers))
assert.notEqual(transcriptKey(segments, speakers), transcriptKey([{ ...segments[0], text: 'Привет' }, ...segments.slice(1)], speakers))
assert.deepEqual(readKinds(['note', 'evil', 'summary']), ['summary', 'note'], 'чужие виды отброшены, порядок — канонический')

// ── Ответ модели: проверка ───────────────────────────────────────────────────
const answer = '```json\n' + JSON.stringify({
  summary: [
    { title: 'Часы — родными числами', text: 'Часы называют родными числами: 한 시, 두 시.', src: [2, 4] },
    { title: 'Без источника', text: 'Это модель придумала.', src: [] },
    { title: 'Чужой номер', text: 'Ссылка мимо.', src: [99] },
  ],
  questions: [
    { q: 'Как сказать «час»?', answer: '한 시', kind: 'choice', options: ['한 시', '일 시', '하나 시'], src: [3, 4] },
    { q: 'Выбор без верного', answer: 'X', kind: 'choice', options: ['A', 'B'], src: [4] },
    { q: '', answer: 'пусто', src: [1] },
  ],
  cards: [{ term: '한 시', meaning: 'час', src: ['4'] }, { term: '한 시', meaning: 'дубль', src: [4] }],
  hw: { title: '', tasks: [
    { type: 'single', question: 'Выберите', options: ['한 시', '일 시'], correct: 0, src: [4] },
    { type: 'single', question: 'Битый выбор', options: ['a'], correct: 3, answer: 'a', src: [4] },
    { type: 'fill', question: 'Без ответа', src: [2] },
  ] },
  note: [{ kind: 'confusion', text: 'Ученик А путала 일 и 한.', count: 2, src: [3] }, { kind: 'weird', text: 'Странный вид', src: [5] }],
}) + '\n```'
const kinds = ['summary', 'questions', 'cards', 'hw', 'note']
const draft = parseRecap(extractJson(answer), kinds, lines, { lang: 'ko', aliases })
assert.equal(draft.summary.length, 1, 'пункт без существующей реплики выброшен')
assert.deepEqual(draft.summary[0].at, [252, 324], 'таймкоды считает сервер по сегментам')
assert.equal(draft.questions.length, 2)
assert.equal(draft.questions[0].kind, 'choice')
assert.equal(draft.questions[1].kind, 'short', 'выбор без верного варианта стал коротким ответом')
assert.equal(draft.questions[1].options, undefined)
assert.equal(draft.cards.length, 1, 'дубли карточек по термину убраны; номер строкой принят')
assert.equal(draft.hw.title, 'Домашка по уроку')
assert.deepEqual(draft.hw.tasks.map(t => t.type), ['single', 'fill', 'extended'], 'битый выбор → короткий ответ, fill без ответа → развёрнутый')
assert.equal(draft.note[1].kind, 'question', 'неизвестный вид заметки → вопрос')
assert.throws(() => extractJson('Не могу помочь.'), 'ответ без JSON — ошибка, а не пустой черновик')

// Пересборка одного раздела не трогает остальные.
const again = parseRecap({ questions: [{ q: 'Новый?', answer: 'да', src: [1] }] }, ['questions'], lines, { lang: 'ko', aliases })
const merged = mergeRecap(draft, again, ['questions'])
assert.equal(merged.questions.length, 1)
assert.equal(merged.summary, draft.summary)

assert.equal(recapCost('anthropic/claude-sonnet-5.5', 15000, 6000), 0.09)
assert.equal(recapCost('claude-opus', 1e6, 0), 4)

// ── Раскладка по уроку ───────────────────────────────────────────────────────
const off = { ...draft, summary: [...draft.summary, { ...draft.summary[0], id: 's9', off: true }] }
const paras = recapParagraphs(off, 'kor-5')
assert.equal(paras.length, 1, 'снятая галочка не публикуется')
assert.equal(paras[0].origin, 'recap')
assert.deepEqual(paras[0].at, [252, 324])
const sc = recapSelfCheck(draft)
assert.deepEqual(sc[0].options, ['한 시', '일 시', '하나 시'])
assert.equal(sc[0].at, 320)
assert.equal(sc[1].options, undefined)
const hw = recapHwTasks(draft, 'x')
assert.deepEqual(hw.map(t => t.id), ['recap-x-1', 'recap-x-2', 'recap-x-3'], 'задания из итогов помечены — «Отменить» их находит')
assert.deepEqual(hw[0].correctChoices, [0])
assert.equal(hw[1].answer, 'a')
assert.deepEqual(recapCards(draft), [{ term: '한 시', ru: 'час' }])
assert.equal(recapNoteBody(draft)[0].text, 'Мария Петрова путала 일 и 한.', 'в заметке учителю — настоящие имена')

console.log('lesson recap: ok')
