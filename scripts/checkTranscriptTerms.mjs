// Словарь расшифровки: какие правки реплик становятся парами «как распозналось →
// как правильно» и что уходит модулю. Без сети и базы.
import assert from 'node:assert/strict'
import { termEditPairs, termMentions, termsForModule, termsSubject } from '../src/lib/transcriptTerms.ts'

// Точечная правка термина — пара; общее начало и конец не входят.
assert.deepEqual(termEditPairs('То есть на из-под уровне два электрона', 'То есть на s-подуровне два электрона'),
  [{ heard: 'из-под уровне', written: 's-подуровне' }])
assert.deepEqual(termEditPairs('это аш эс о четыре минус', 'это HSO₄⁻ минус'), [{ heard: 'аш эс о четыре', written: 'HSO₄⁻' }])
// Регистр и пунктуация — не правка термина.
assert.deepEqual(termEditPairs('пенициллин открыли', 'Пенициллин открыли.'), [])
// Переписанная целиком реплика — другой текст, не ошибка распознавания.
assert.deepEqual(termEditPairs('раз два три четыре пять шесть семь', 'совсем другая фраза про клетку и её мембрану целиком'), [])
// Дописанное слово без замены — не пара.
assert.deepEqual(termEditPairs('клетка делится', 'клетка делится митозом'), [])
// Число на число — опечатка, не термин.
assert.deepEqual(termEditPairs('заряд 6', 'заряд 7'), [])

// Модулю: свои пары — первыми в подсказке, «*»-заготовки в подсказку не идут.
const pack = [
  { written: 'митохондрия', heard: null, spoken: null, mine: false },
  { written: 's-подуровн*', heard: 'из-под уровн*', spoken: null, mine: false },
  { written: 'HSO₄⁻', heard: 'аш эс о четыре', spoken: null, mine: true },
]
const out = termsForModule(pack, 'Строение атома')
assert.deepEqual(out.prompt, ['Строение атома', 'HSO₄⁻', 'митохондрия'])
assert.deepEqual(out.replace, [['из-под уровн*', 's-подуровн*'], ['аш эс о четыре', 'HSO₄⁻']])
// Подсказка не длиннее окна Whisper.
const long = termsForModule(Array.from({ length: 300 }, (_, i) => ({ written: 'термин' + i, heard: null, spoken: null, mine: false })))
assert.ok(long.prompt.join(', ').length <= 520)

// Текст урока: термины из него — в подсказку раньше частых, окончания и индексы не мешают.
assert.equal(termMentions('митоз', 'Стадии митоза. Митозом делятся соматические клетки'), 2)
assert.equal(termMentions('гомологичные хромосомы', 'пары гомологичных хромосом'), 1)
assert.equal(termMentions('KMnO₄', 'окисление раствором KMnO4 в кислой среде'), 1)
assert.equal(termMentions('KMnO₄', 'раствор KMnO3'), 0)
assert.equal(termMentions('Cu(OH)₂', 'осадок Cu(OH)2 голубой'), 1)
assert.equal(termMentions('жиры', 'жиры и масла'), 1)
assert.equal(termMentions('мейоз', 'Стадии митоза'), 0)
const many = Array.from({ length: 200 }, (_, i) => ({ written: 'частыйтермин' + i, heard: null, spoken: null, mine: false }))
const lessonPack = [...many, { written: 'кроссинговер', heard: null, spoken: null, mine: false }, { written: 'мейоз', heard: null, spoken: null, mine: false }]
const ranked = termsForModule(lessonPack, 'Мейоз', 'Профаза I: конъюгация и кроссинговер. Мейоз даёт гаплоидные клетки, кроссинговер — новые сочетания.')
// «мейоз» уже есть названием урока — второй раз (в другом регистре) не тратим место.
assert.deepEqual(ranked.prompt.slice(0, 3), ['Мейоз', 'кроссинговер', 'частыйтермин0'])
assert.ok(ranked.prompt.join(', ').length <= 520)
// Без текста урока порядок прежний — по словарю.
assert.deepEqual(termsForModule(lessonPack).prompt.slice(0, 2), ['частыйтермин0', 'частыйтермин1'])

assert.equal(termsSubject('Химия'), 'chemistry')
assert.equal(termsSubject('Биология'), 'biology')
assert.equal(termsSubject('Мой предмет'), 'Мой предмет')
console.log('Transcript terms: edit pairs, module pack and subject keys passed')
