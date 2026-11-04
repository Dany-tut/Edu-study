// Логика монтажа записи урока: поиск пауз, пересчёт времени, план плеера,
// хранение громкости. Без браузера и сервера.
import assert from 'node:assert/strict'
import { DEFAULT_SETTINGS, detectPauses, editedDuration, mergeSpeaker, playbackPlan, toEditedTime, labelVoices } from '../src/lib/lessonMontage.ts'
import { decodeLevels, readTranscript } from '../src/lib/localTranscription.ts'

const set = { ...DEFAULT_SETTINGS, minPause: 5 }
const spans = [
  { id: 'a', start: 10, end: 20, level: -70, speech: false, motion: 0 },     // тишина, пустой кадр
  { id: 'b', start: 30, end: 60, level: -44, speech: false, motion: 3 },     // решают, пишут на доске
  { id: 'c', start: 70, end: 80, level: -20, speech: false },                // музыка без речи
  { id: 'd', start: 90, end: 92, level: -70 },                               // короче минимума
  { id: 'e', start: 100, end: 120, level: -20, speech: true },               // громко и говорят — не пауза
]

const pauses = detectPauses(spans, set)
assert.deepEqual(pauses.map(p => p.id), ['a', 'b', 'c'], 'короткие и разговорные отрезки — не паузы')
assert.equal(pauses[0].action, 'cut', 'тишина с пустым кадром вырезается')
assert.equal(pauses[1].action, 'speed', 'меняется кадр — ускоряется, а не вырезается')
assert.equal(pauses[1].board, true)
assert.equal(pauses[2].kind, 'nospeech', 'пауза без речи находится при любой громкости')

// Порог от фона: в шумном классе (фон −38) тихая работа на −31 — пауза.
assert.equal(detectPauses([{ id: 'n', start: 0, end: 30, level: -31 }], set, {}, -38).length, 1)
assert.equal(detectPauses([{ id: 'n', start: 0, end: 30, level: -31 }], set).length, 0, 'без фона — абсолютный порог')

// Ручная правка края и решения переживает пересчёт.
const edited = detectPauses(spans, set, { a: { start: 12, action: 'keep' } })
assert.equal(edited[0].start, 12); assert.equal(edited[0].action, 'keep'); assert.equal(edited[0].edited, true)

// Время после монтажа: вырезанное выпадает, ускоренное сжимается.
const p = detectPauses([{ id: 'x', start: 10, end: 20, level: -70 }, { id: 'y', start: 30, end: 70, level: -44 }], { ...set, padding: 0 })
assert.equal(editedDuration(100, p, 4), 100 - 10 - 40 + 10)
assert.equal(toEditedTime(25, p, 4), 15, 'после вырезанного 10 с')
assert.equal(toEditedTime(80, p, 4), 80 - 10 - 30)

// План плеера пуст, пока монтаж не применён.
assert.equal(playbackPlan({ quiet: spans }), undefined)
const plan = playbackPlan({ quiet: spans, settings: set })
assert.deepEqual(plan.skip, [[10.5, 19.5]])
assert.equal(plan.fast.length, 2)

// Голоса: учитель — кто больше говорит; склейка переносит реплики.
const lines = [{ id: 'l1', start: 0, end: 30, text: 'a', speaker: 'v2' }, { id: 'l2', start: 30, end: 31, text: 'b', speaker: 'v1' }]
assert.equal(labelVoices(['v1', 'v2'], lines)[0].id, 'v2')
assert.deepEqual(mergeSpeaker({ speakers: labelVoices(['v1', 'v2'], lines), lines }, 'v1', 'v2').lines.map(l => l.speaker), ['v2', 'v2'])

// Громкость хранится сжато и читается обратно; кривые данные — без монтажа, а не ошибка.
const t = readTranscript({ source: 's', segments: [{ start: 0, end: 1, text: 'x' }], montage: { duration: 3, step: 0.5, levels: [-20.4, -60, -70], floor: -60, quiet: spans } })
assert.deepEqual(decodeLevels(t.montage.levels.data), [-20, -60, -70])
assert.equal(t.montage.floor, -60)
assert.equal(readTranscript({ source: 's', segments: [{ start: 0, end: 1, text: 'x' }], montage: { nope: 1 } }).montage, undefined)

console.log('Lesson montage: pauses (floor, speechless, board), edited time, player plan, voices and level storage passed')

// Шкала ученика: туда и обратно, вырезанное выпадает, потолок скорости учтён.
const { montageTimeline } = await import('../src/lib/lessonMontage.ts')
const tl = montageTimeline({ skip: [[10, 20]], fast: [[30, 70, 4]] }, 100)
assert.equal(tl.total, 100 - 10 - 30)
assert.equal(tl.view(25), 15); assert.equal(tl.view(50), 25)
for (const s of [0, 5, 25, 31, 50, 69, 80, 100]) assert.ok(Math.abs(tl.source(tl.view(s)) - s) < 1e-9, 'обратный пересчёт ' + s)
assert.equal(tl.source(10), 20, 'место вырезанного на шкале — сразу после него')
assert.equal(montageTimeline({ skip: [], fast: [[0, 40, 4]] }, 100, 2).total, 80, 'YouTube ускоряет до ×2')
assert.equal(montageTimeline(undefined, 100), undefined)
console.log('Lesson montage: student timeline mapping passed')

// Итоги урока: доли речи, вопросы и ожидание ответа, монолог, молчащие ученики.
const { lessonStats } = await import('../src/lib/lessonMontage.ts')
const sp = [{ id: 'T', label: 'Учитель', role: 'teacher', tone: 'purple' }, { id: 'A', label: 'Аня', role: 'student', tone: 'blue' }, { id: 'B', label: 'Боря', role: 'student', tone: 'teal' }]
const st = lessonStats([
  { id: '1', start: 0, end: 20, text: 'Начинаем.', speaker: 'T' },
  { id: '2', start: 21, end: 30, text: 'Кто знает ответ?', speaker: 'T' },
  { id: '3', start: 34, end: 40, text: 'Я знаю.', speaker: 'A' },
  { id: '4', start: 50, end: 55, text: 'А почему?', speaker: 'T' },
  { id: '5', start: 120, end: 130, text: 'Дальше.', speaker: 'T' },
], sp, 200)
assert.equal(st.questions, 2); assert.equal(st.answered, 1); assert.equal(st.waitMedian, 4)
assert.equal(st.longestMonologue, 30, 'реплики учителя подряд с зазором < 3 с — один монолог')
assert.deepEqual(st.silentStudents, ['B'])
assert.ok(Math.abs(st.teacherShare - 44 / 50) < 1e-9)
assert.ok(Math.abs(st.silenceShare - 0.75) < 1e-9)
console.log('Lesson montage: lesson stats passed')
