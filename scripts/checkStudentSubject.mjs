// Предмет ученика (вариант Б): откуда берётся и как скоупит виджеты главной.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'

const bundle = await build({ entryPoints: ['src/lib/studentSubject.ts'], bundle: true, format: 'esm', platform: 'node', write: false })
mkdirSync('node_modules/.cache', { recursive: true })
writeFileSync('node_modules/.cache/student-subject.mjs', bundle.outputFiles[0].text)
const m = await import('../node_modules/.cache/student-subject.mjs')

let checks = 0
const eq = (a, b, msg) => { assert.deepEqual(a, b, msg); checks++ }

// Нормализация: id реестра, своя строка, пустота.
eq(m.normalizeStudentSubject('  '), null, 'пустой предмет')
eq(m.normalizeStudentSubject(null), null, 'нет предмета')
eq(m.normalizeStudentSubject('Химия'), 'Химия', 'имя реестра остаётся именем')
eq(m.normalizeStudentSubject('chemistry'), 'Химия', 'id реестра → имя, как в groups.subject')
eq(m.normalizeStudentSubject(' Шахматы '), 'Шахматы', 'своя строка обрезается')

// Источник: группа главнее собственной колонки.
eq(m.resolveStudentSubject({ groupSubject: 'Биология', ownSubject: 'Химия' }), 'Биология', 'группа главнее')
eq(m.resolveStudentSubject({ groupSubject: null, ownSubject: 'chemistry' }), 'Химия', 'без группы — своя колонка')
eq(m.resolveStudentSubject({}), null, 'ничего нет')

// Поле формы и список.
eq(m.isStudentSubjectValid(''), false, 'пусто нельзя')
eq(m.isStudentSubjectValid('chemistry'), true, 'предмет можно')
eq(m.studentSubjectOptions(['chemistry', 'Химия', 'Биология']), ['Химия', 'Биология'], 'без дублей')
eq(m.studentSubjectOptions(['Химия'], 'Шахматы'), ['Химия', 'Шахматы'], 'выбранный вне списка остаётся')
eq(m.defaultStudentSubject(['Химия']), 'Химия', 'один предмет подставлен')
eq(m.defaultStudentSubject(['Химия', 'Биология']), '', 'несколько — выбрать самому')
eq(m.studentSubjectLabel('chemistry'), 'Химия', 'подпись из реестра')

// Скоуп виджетов.
const scope = input => [...m.widgetSubjectScope(input)].sort()
eq(scope({ courses: [], profileSubject: null }), [], 'без курсов и предмета — пусто')
eq(scope({ courses: [], profileSubject: 'Химия' }), ['chemistry'], 'без курсов — свой предмет (имя → id скоупа)')
eq(scope({ courses: [{ id: 'a', subject: 'biology' }], profileSubject: 'chemistry' }), ['biology'], 'курс главнее своего предмета')
eq(scope({ courses: [{ id: 'a', subject: 'biology' }, { id: 'b', subject: 'chemistry' }], activeCourseId: 'b' }), ['chemistry'], 'активный курс')
eq(scope({ courses: [{ id: 'a', subject: 'Свой тег' }, { id: 'b', subject: 'chemistry' }], activeCourseId: 'a' }), ['chemistry'], 'тег без реестра → все курсы')
eq(scope({ courses: [{ id: 'a', subject: 'biology' }], override: 'english' }), ['english'], 'предмет экрана главнее')
eq(scope({ courses: [], profileSubject: 'Шахматы' }), [], 'свой предмет вне реестра не включает предметные виджеты')

console.log(`PASS: ${checks} student subject checks — источник предмета, поле формы и скоуп виджетов.`)
