// Проверка чистой логики методики: спутываемость, раскладка порций, очередь.
//
// ЗАЧЕМ. Сторож уроков (checkLesson.mjs) смотрит на СОБРАННЫЕ курсы и ловит
// нарушения стандарта в данных. Но сами правила — это три десятка строк чистых
// функций, и ломаются они молча: пример из жизни — минимальная пара считалась
// по символам, слог хангыля брался за один знак, и 물 «вода» с 밥 «еда»
// объявлялись спутываемыми. Курсы разъезжались на порции по одному слову, все
// сторожа при этом были зелёными: данные-то честно соответствовали правилу.
// Правило было неверным.
//
// ЧТО ЗДЕСЬ. Примеры, на которых правило обязано срабатывать, и примеры, на
// которых оно обязано молчать. Взяты из настоящих курсов — это и есть те
// случаи, ради которых правило писалось.
//
// ПОЧЕМУ НЕ VITEST. В проекте нет тестового рантайма и ни одного теста; заводить
// его ради трёх функций — это новая зависимость, конфиг и вторая команда
// запуска. Здесь тот же стиль, что у остальных сторожей: `node scripts/…`,
// падает с ненулевым кодом и печатает, что именно разошлось.
//
// Запуск: npm run check:logic
import { confusable, paradigmAffixes, spreadConfusable } from '../src/data/vocabLadder.ts'
import { initialQueue, requeue, questionAt, isRepeatAt, restoreQueue, hardIds } from '../src/lib/lessonQueue.ts'
import { reviewSlots, buildReviewTasks, answerFace, DEBT_SLOTS, DEBT_SLOTS_WIDE, DEBT_THRESHOLD } from '../src/lib/lessonDebt.ts'

let bad = 0
const fail = (what, detail) => { console.log('  ✗', what, detail ? `— ${detail}` : ''); bad++ }
const ok = what => console.log('  ✓', what)

const w = (term, ru, reading) => ({ term, ru, reading })

// ── 1. Спутываемость (Р5) ────────────────────────────────────────────────────

/** Пары, которые ОБЯЗАНЫ разъехаться по разным занятиям. */
const TRAPS = [
  [w('안녕히 가세요', 'до свидания (тому, кто уходит)'), w('안녕히 계세요', 'до свидания (тому, кто остаётся)'), 'одна буква разницы в рамке'],
  [w('물', 'вода'), w('불', 'огонь'), 'минимальная пара по букве'],
  [w('아파요', 'больно'), w('배가 아파요', 'болит живот'), 'одно целиком внутри другого'],
  [w('obrigado', 'спасибо'), w('obrigada', 'спасибо'), 'один и тот же перевод'],
  [w('아니요', 'нет'), w('없어요', 'нет (не имеется)'), 'перевод входит в перевод'],
]

/** Пары, которые обязаны спокойно жить в одном занятии. */
const SAFE = [
  [w('물', 'вода'), w('밥', 'еда'), 'слог — это буквы, а не один знак'],
  [w('Could you say that again?', 'повторите, пожалуйста'), w('Could you show me?', 'покажите'), 'общая рамка вежливости, разные слова'],
  [w('to afford to', 'позволить себе'), w('to tend to', 'иметь склонность'), 'английский инфинитив — не ловушка'],
  [w('ㅏ', 'а'), w('ㅓ', 'о'), 'буквы алфавита учат контрастом'],
  [w('학교', 'школа'), w('빵', 'хлеб'), 'ничего общего'],
]

for (const [a, b, why] of TRAPS) {
  if (confusable(a, b)) ok(`ловушка: ${a.term} / ${b.term} (${why})`)
  else fail(`ловушка не поймана: ${a.term} / ${b.term}`, why)
}
for (const [a, b, why] of SAFE) {
  if (!confusable(a, b)) ok(`не ловушка: ${a.term} / ${b.term} (${why})`)
  else fail(`ложная тревога: ${a.term} / ${b.term}`, why)
}

// ── 2. Серии языка (парадигмы) ───────────────────────────────────────────────

const WEEK = [w('월요일', 'понедельник'), w('화요일', 'вторник'), w('목요일', 'четверг'), w('금요일', 'пятница')]
const week = paradigmAffixes(WEEK)
if (week.has('$요일')) ok('дни недели опознаны как серия (общий хвост 요일)')
else fail('серия не опознана', 'у дней недели общий хвост 요일')

if (!confusable(WEEK[2], WEEK[3], week)) ok('слова серии не конфликтуют между собой')
else fail('серия объявлена ловушкой', '목요일 / 금요일 с известной парадигмой')

const two = paradigmAffixes([w('안녕히 가세요', 'а'), w('안녕히 계세요', 'б')])
if (!two.has('^안녕히 ')) ok('двое — это пара, а не серия')
else fail('пара принята за серию', 'парадигма требует трёх слов и больше')

// ── 3. Раскладка порций (Р1 + Р5) ────────────────────────────────────────────

const UNIT = [
  w('안녕하세요', 'здравствуйте'), w('안녕히 가세요', 'до свидания (уходящему)'),
  w('안녕히 계세요', 'до свидания (остающемуся)'), w('반갑습니다', 'приятно познакомиться'),
  w('감사합니다', 'спасибо'), w('죄송합니다', 'извините'),
]
const parts = spreadConfusable(UNIT, 3)

if (parts.every(p => p.length <= 3)) ok(`порции не больше трёх слов (${parts.map(p => p.length).join('+')})`)
else fail('порция больше потолка', parts.map(p => p.length).join('+'))

if (parts.every(p => p.length >= 2)) ok('занятий из одного слова нет')
else fail('занятие из одного слова', parts.map(p => p.length).join('+'))

const together = parts.find(p => p.some(x => x.term === '안녕히 가세요') && p.some(x => x.term === '안녕히 계세요'))
if (!together) ok('가세요 и 계세요 разведены по разным занятиям')
else fail('спутываемые в одном занятии', '가세요 и 계세요')

const flat = parts.flat()
if (flat.length === UNIT.length && UNIT.every(x => flat.includes(x))) ok('ни одно слово не потеряно и не задвоено')
else fail('словарь юнита изменился при раскладке', `было ${UNIT.length}, стало ${flat.length}`)

// Раскладка обязана быть детерминированной: сид собирается заново каждый раз.
const again = spreadConfusable(UNIT, 3)
if (JSON.stringify(parts.map(p => p.map(x => x.term))) === JSON.stringify(again.map(p => p.map(x => x.term)))) {
  ok('раскладка детерминирована')
} else fail('раскладка плавает между сборками')

// ── 4. Очередь урока (Р8) ────────────────────────────────────────────────────

const q0 = initialQueue(10)
if (q0.order.join(',') === '0,1,2,3,4,5,6,7,8,9') ok('пустая очередь — это просто список заданий')
else fail('стартовый порядок не совпадает со списком', q0.order.join(','))

// Промах на позиции 2 возвращает задание через два других.
const q1 = requeue(q0, { id: 'a', index: 2, position: 2, baseCount: 10 })
if (questionAt(q1, 5) === 2) ok('после промаха задание возвращается через два других')
else fail('возврат встал не туда', q1.order.join(','))
if (isRepeatAt(q1, 5)) ok('позиция повтора помечена (на ней стирается ответ)')
else fail('повтор не помечен', q1.repeats.join(','))

// Второй промах — разрыв больше. Дальше конца очереди вставлять некуда, и
// тогда задание честно встаёт последним (тут как раз этот случай: позиция 5
// плюс разрыв 7 выходит за одиннадцать заданий).
const q2 = requeue(q1, { id: 'a', index: 2, position: 5, baseCount: 10 })
const back = q2.order.lastIndexOf(2)
if (back >= 5 + 3 && questionAt(q2, back) === 2) ok(`второй возврат идёт с большим разрывом (позиция ${back})`)
else fail('второй возврат встал не туда', q2.order.join(','))
if (back === q2.order.length - 1) ok('за концом очереди повтор встаёт последним')
else fail('повтор уехал за пределы очереди', q2.order.join(','))

// Третий промах не проходит: два возврата — потолок.
const q3 = requeue(q2, { id: 'a', index: 2, position: back, baseCount: 10 })
if (q3.order.length === q2.order.length) ok('третьего возврата одному заданию не бывает')
else fail('задание вернулось третий раз', q3.order.join(','))

if (hardIds(q3).includes('a')) ok('дожатое до упора задание помечено трудным (уедет в колоду)')
else fail('трудное задание не помечено', JSON.stringify(q3.retries))

// Потолок длины: серия промахов не превращает урок в бесконечный.
let flood = initialQueue(4)
for (let i = 0; i < 4; i++) flood = requeue(flood, { id: 'w' + i, index: i, position: 0, baseCount: 4 })
if (flood.order.length <= Math.ceil(4 * 1.5)) ok(`урок не растёт дальше потолка (${flood.order.length} при списке из 4)`)
else fail('урок вырос сверх потолка', String(flood.order.length))

// Черновик со старым порядком не должен ломать урок с изменившимся списком.
const restored = restoreQueue({ order: [0, 1, 2], retries: {}, repeats: [] }, 5)
if (restored.order.length === 5) ok('черновик от другой домашки отбрасывается')
else fail('чужой черновик принят', restored.order.join(','))

// ── 5. Долг колоды в начале занятия (Р17) ────────────────────────────────────
//
// Правило живёт в рантайме, а не в сиде: сторож уроков его не видит вовсе —
// карточки долга приходят из колоды конкретного ученика. Поэтому проверяются
// сами функции.

console.log('\nР17 — долг колоды:')

const SLOTS = [
  [0, 0, 'пустая колода не даёт блока'],
  [2, 2, 'долг меньше потолка берётся целиком'],
  [10, DEBT_SLOTS, 'обычное занятие берёт не больше четырёх'],
  [DEBT_THRESHOLD, DEBT_SLOTS_WIDE, 'большой долг открывает расширенный блок'],
  [500, DEBT_SLOTS_WIDE, 'вернувшийся после паузы не получает вместо урока сто карточек'],
]
for (const [due, want, why] of SLOTS) {
  const got = reviewSlots(due)
  if (got === want) ok(`долг ${due} → ${got} карточек (${why})`)
  else fail(`долг ${due} дал ${got}, а не ${want}`, why)
}

/** Карточка колоды — ровно те поля, которые читает раскладка. */
const card = (id, prompt, answer, extra = {}) =>
  ({ id, prompt, answer, source: 'vocab', ...extra })

const POOL = [
  card('c1', '물', 'вода — муль'),
  card('c2', '밥', 'еда — пап'),
  card('c3', '학교', 'школа — хаккё'),
  card('c4', '빵', 'хлеб — ппан'),
  card('c5', '사람', 'человек — сарам'),
]

if (answerFace(POOL[0]) === 'вода') ok('чтение срезано с варианта выбора («вода — муль» → «вода»)')
else fail('чтение попало в вариант выбора', answerFace(POOL[0]))


// Карточка тренажёра пишет оборот как «слово — перевод», и слово в ней то же,
// что в вопросе. Оставить его в варианте — значит напечатать ответ в задании.
const trainer = card('t1', '대학교 — что значит? (대 (大) большой + 학 учёба + 교 заведение)', '대학교 — университет', { source: 'trainer' })
if (answerFace(trainer) === 'университет') ok('слово из вопроса срезано с варианта («대학교 — университет» → «университет»)')
else fail('вариант печатает слово из вопроса — задание решается сличением строк', answerFace(trainer))


// Обманка подбирается по форме. В одной колоде лежат буквы алфавита, значения
// слов и формулировки правил чтения; смешанные в одном задании, они решаются
// длиной строки, а не знанием. Пример с живой колоды — этот экран и всплыл на
// прогоне: «쉽니다 — что значит?» с вариантами «р», «п», «нога, мост», «не
// работает, выходной» формально даёт четыре варианта, а на деле два.
const MIXED = [
  card('m1', '쉽니다', 'не работает, выходной'),
  card('m2', 'ㄹ', 'р'),
  card('m3', 'ㅍ', 'п'),
  card('m4', '다리', 'нога, мост'),
  card('m5', 'правило', 'Он переходит в начало следующего слога'),
  card('m6', '버스', 'автобус'),
  card('m7', '평일', 'будни'),
  card('m8', '학교', 'школа'),
  card('m9', '사람', 'человек'),
  card('m10', '시간', 'время, час'),
]
const ratio = (a, b) => Math.max(a.length, b.length) / Math.min(a.length, b.length)

for (const target of [MIXED[0], MIXED[5], MIXED[6]]) {
  const t = buildReviewTasks([target], MIXED)[0]
  if (t.kind !== 'choice') { fail('задание не собралось выбором', target.answer); continue }
  const right = answerFace(t.card)
  const bad = t.choices.filter(c => c !== right && ratio(c, right) > 2.5)
  if (bad.length === 0) ok(`обманки к «${right}» одной формы (${t.choices.filter(c => c !== right).join(' / ')})`)
  else fail(`к «${right}» подставлена обманка другой формы`, bad.join(' / '))
}

// Голодный пул: подходящих по форме меньше трёх. Задание всё равно обязано
// собраться четырьмя вариантами — слабая обманка хуже хорошей, но лучше
// выбора из двух.
const STARVED = [card('s1', '버스', 'автобус'), card('s2', 'ㄹ', 'р'), card('s3', 'правило', 'Он переходит в начало следующего слога')]
const starved = buildReviewTasks([STARVED[0]], STARVED)[0]
if (starved.kind === 'choice' && starved.choices.length === 3
    && starved.choices.includes('автобус')) ok('на голодном пуле задание добирает варианты, а не разваливается')
else fail('голодный пул сломал задание', JSON.stringify(starved))

const built = buildReviewTasks(POOL, POOL)
if (built.every(t => t.kind === 'choice')) ok('колоды из пяти слов хватает на выбор без самооценки')
else fail('карточка ушла в припоминание при полном пуле', built.map(t => t.kind).join(','))

for (const t of built) {
  if (t.kind !== 'choice') continue
  const right = answerFace(t.card)
  if (t.choices[t.correct] !== right) { fail('верный индекс указывает не на верный ответ', t.card.prompt); break }
  if (t.choices.filter(c => c === right).length !== 1) { fail('верный ответ встречается в вариантах дважды', t.card.prompt); break }
  if (new Set(t.choices).size !== t.choices.length) { fail('обманки повторяются', t.choices.join(' / ')); break }
  if (t.choices.length !== 4) { fail('вариантов не четыре', String(t.choices.length)); break }
}
if (bad === 0) ok('варианты собраны честно: верный ровно один, обманки не повторяются, всего четыре')

// Р15 распространяется и на долг: слово возвращается десятки раз, и постоянное
// место ответа превратило бы повторение в тренировку пальца.
const slots = new Set(built.filter(t => t.kind === 'choice').map(t => t.correct))
if (slots.size > 1) ok(`место верного ответа гуляет по карточкам (позиции: ${[...slots].sort().join(',')})`)
else fail('верный ответ у всех карточек на одном месте', [...slots].join(','))

// Раскладка обязана быть одинаковой при каждом вызове: иначе после F5 ученик
// видит другой набор обманок к тому же слову.
const rebuilt = buildReviewTasks(POOL, POOL)
if (JSON.stringify(rebuilt) === JSON.stringify(built)) ok('раскладка детерминирована (переживает перерисовку и F5)')
else fail('раскладка меняется между вызовами')

// Колода из одного слова: обманку взять неоткуда — честное припоминание вместо
// выбора из одного варианта.
const alone = buildReviewTasks([POOL[0]], [POOL[0]])
if (alone[0].kind === 'recall') ok('единственное слово колоды показывается припоминанием, а не выбором из одного')
else fail('выбор собран без обманок', JSON.stringify(alone[0]))

// Карточка из ошибки домашки несёт свои варианты — те же, что были в задании.
const fromHw = card('h1', 'She ___ to school every day.', 'goes', {
  source: 'homework', options: ['go', 'goes', 'is go', 'going'],
})
const hw = buildReviewTasks([fromHw], POOL)[0]
if (hw.kind === 'choice' && hw.choices.length === 4 && hw.choices[hw.correct] === 'goes'
    && hw.choices.includes('going')) ok('ошибка домашки возвращается со своими вариантами')
else fail('варианты ошибки домашки потеряны', JSON.stringify(hw))

console.log(bad === 0 ? '\nЛогика методики в порядке.' : `\nРасхождений: ${bad}`)
process.exit(bad === 0 ? 0 : 1)
