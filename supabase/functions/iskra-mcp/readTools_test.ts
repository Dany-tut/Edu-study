import { strict as assert } from 'node:assert'
import { type Db, type DbResult, listMyGroups, listMyStudents, mistakesByTopic, period, type Query, studentSummary, testResults, type ToolResult } from './readTools.ts'

// Фейковая база в ХУДШЕМ случае: RLS пропускает все строки всех учителей
// (так на проде читается diag_results любым учителем и всё — админом).
// Изоляция должна держаться только на явных фильтрах readTools.ts.

type Row = Record<string, unknown>
const A = 'aaaaaaaa-0000-4000-8000-000000000001'
const B = 'bbbbbbbb-0000-4000-8000-000000000002'
const GA = '1a000000-0000-4000-8000-000000000001'
const GB = '1b000000-0000-4000-8000-000000000002'
const SA = '5a000000-0000-4000-8000-000000000001'
const SA2 = '5a000000-0000-4000-8000-000000000003'
const SB = '5b000000-0000-4000-8000-000000000002'
const NOW = new Date('2026-11-06T12:00:00Z')

const aiResult = (kim: number, points: number, max: number, comment: string) => ({ tasks: [{ n: 1, kim_n: kim, points, max_points: max, comment }] })

function tables(): Record<string, Row[]> {
  return {
    students: [
      { id: SA, name: 'Аня', group_id: GA, created_by: A, phone: '+70000000001', email: 'anya@example.com', temp_password: 'secretA', started_at: '2026-09-01', hw_score: 80 },
      { id: SA2, name: 'Борис', group_id: GA, created_by: A, phone: '+70000000003' },
      { id: SB, name: 'Чужой', group_id: GB, created_by: B, phone: '+70000000002', temp_password: 'secretB' },
    ],
    groups: [
      { id: GA, name: '11Б', subject: 'Химия', level: 'ЕГЭ', is_individual: false, created_by: A },
      { id: GB, name: 'Чужая группа', subject: 'Химия', level: 'ЕГЭ', is_individual: false, created_by: B },
    ],
    lesson_attendance: [
      { student_id: SA, lesson_date: '2026-10-01', present: true, grade: 5, lesson_title: 'Урок 1' },
      { student_id: SA, lesson_date: '2026-10-08', present: false, grade: null, lesson_title: 'Урок 2' },
      { student_id: SB, lesson_date: '2026-10-08', present: false, grade: 2, lesson_title: 'ЧУЖОЙ урок' },
    ],
    lesson_progress: [
      { student_id: SA, lesson_ref: 'chem-1', status: 'completed', score: 90, updated_at: '2026-10-02T10:00:00Z' },
      { student_id: SA, lesson_ref: 'chem-2', status: 'returned', score: 40, updated_at: '2026-10-09T10:00:00Z' },
      { student_id: SA, lesson_ref: 'chem-test', status: 'completed', score: 70, updated_at: '2026-10-10T10:00:00Z' },
      { student_id: SB, lesson_ref: 'chem-test', status: 'completed', score: 11, updated_at: '2026-10-10T10:00:00Z' },
    ],
    lessons: [
      { id: 'l1', short_id: 'chem-1', title: 'Строение атома', kind: 'lesson' },
      { id: 'l2', short_id: 'chem-2', title: 'Электролиз', kind: 'lesson' },
      { id: 'l3', short_id: 'chem-test', title: 'Контрольная', kind: 'test' },
    ],
    homework: [
      { id: 'h-a', title: 'ДЗ по олеуму', due_date: '2026-10-20', lesson_id: null, created_by: A, group_id: GA },
      { id: 'h-b', title: 'ЧУЖОЕ ДЗ', due_date: '2026-10-20', lesson_id: null, created_by: B, group_id: GB },
    ],
    homework_attempts: [
      { student_id: SA, lesson_ref: 'chem-1', submitted_at: '2026-10-03T10:00:00Z', answers: { rows: [{ n: 2, type: 'choice', verdict: 'wrong', prompt: 'Сколько электронов у натрия?' }, { n: 3, verdict: 'correct' }] } },
      { student_id: SB, lesson_ref: 'chem-1', submitted_at: '2026-10-03T10:00:00Z', answers: { rows: [{ n: 2, type: 'choice', verdict: 'wrong', prompt: 'ЧУЖОЙ ответ' }] } },
    ],
    hw_ai_grades: [
      { student_id: SA, teacher_id: A, exam: 'ЕГЭ', status: 'graded', primary_score: 1, max_score: 4, submitted_at: '2026-10-05T10:00:00Z', result: aiResult(34, 1, 4, 'Не вычтен осадок BaSO4') },
      { student_id: SA2, teacher_id: A, exam: 'ЕГЭ', status: 'confirmed', primary_score: 2, max_score: 4, submitted_at: '2026-10-06T10:00:00Z', result: aiResult(34, 2, 4, 'Ошибка в балансе') },
      { student_id: SB, teacher_id: B, exam: 'ЕГЭ', status: 'graded', primary_score: 0, max_score: 4, submitted_at: '2026-10-06T10:00:00Z', result: aiResult(33, 0, 4, 'ЧУЖАЯ проверка') },
    ],
    diag_results: [
      { id: 'd1', student_id: SA, linked_student_id: null, name: 'Аня', subject: 'chem', score_pct: 40, answered: 10, total: 10, completed: true, created_at: '2026-10-07T10:00:00Z', results: { Кинетика: { total: 2, correct: 0 } } },
      { id: 'd2', student_id: null, linked_student_id: SA2, name: 'Борис', subject: 'chem', score_pct: 60, answered: 5, total: 5, completed: true, created_at: '2026-10-07T10:00:00Z', results: { Кинетика: { total: 2, correct: 1 } } },
      { id: 'd3', student_id: SB, linked_student_id: null, name: 'Чужой', subject: 'chem', score_pct: 5, answered: 9, total: 9, completed: true, created_at: '2026-10-07T10:00:00Z', results: { ЧУЖАЯТЕМА: { total: 9, correct: 0 } } },
      { id: 'd4', student_id: null, linked_student_id: null, name: 'Аноним', subject: 'logic', score_pct: 1, created_at: '2026-10-07T10:00:00Z', results: { ЧУЖАЯТЕМА: { total: 3, correct: 0 } } },
    ],
  }
}

class FakeQuery implements Query {
  private filters: ((r: Row) => boolean)[] = []
  private max = Infinity
  constructor(private table: string, private data: Row[], private log: string[], private sloppy: boolean) {}
  select() { return this }
  order() { return this }
  limit(n: number) { this.max = n; return this }
  eq(c: string, v: unknown) { this.log.push(`${this.table}.${c}=${v}`); this.filters.push(r => r[c] === v); return this }
  in(c: string, vs: readonly unknown[]) { this.filters.push(r => vs.includes(r[c])); return this }
  gte(c: string, v: unknown) { this.filters.push(r => String(r[c] ?? '') >= String(v)); return this }
  lt(c: string, v: unknown) { this.filters.push(r => String(r[c] ?? '') < String(v)); return this }
  or(f: string) {
    const parts = [...f.matchAll(/(\w+)\.in\.\(([^)]*)\)/g)].map(m => [m[1], m[2].split(',')] as const)
    this.filters.push(r => parts.some(([c, vs]) => vs.includes(String(r[c]))))
    return this
  }
  then<T1 = DbResult, T2 = never>(ok?: ((v: DbResult) => T1 | PromiseLike<T1>) | null, bad?: ((e: unknown) => T2 | PromiseLike<T2>) | null) {
    // sloppy: база «забыла» фильтры запроса — отдаёт всю таблицу (проверка второго слоя).
    const data = this.sloppy ? [...this.data] : this.data.filter(r => this.filters.every(f => f(r))).slice(0, this.max)
    return Promise.resolve({ data, error: null }).then(ok, bad)
  }
}

function fakeDb(sloppy: string[] = []) {
  const data = tables()
  const log: string[] = []
  const db: Db = { from: (t: string) => new FakeQuery(t, data[t] ?? [], log, sloppy.includes(t)) }
  return { db, log }
}

const value = (r: ToolResult) => {
  assert.equal(r.ok, true, JSON.stringify(r))
  return r.ok ? r.value : undefined
}
const message = (r: ToolResult) => {
  assert.equal(r.ok, false)
  return r.ok ? "" : r.message
}
const noForeign = (v: unknown) => {
  const json = JSON.stringify(v)
  for (const bad of ['Чужой', 'ЧУЖ', 'Аноним', SB, GB, 'secret', '+7000', '@example.com']) {
    assert.ok(!json.includes(bad), `в ответе утекло «${bad}»: ${json}`)
  }
}

Deno.test('list_my_groups и list_my_students показывают только своё и без контактов', async () => {
  const { db, log } = fakeDb()
  const groups = value(await listMyGroups(db, A)) as { name: string; students: number }[]
  assert.deepEqual(groups.map(g => [g.name, g.students]), [['11Б', 2]])
  noForeign(groups)
  const students = value(await listMyStudents(db, A, {})) as { name: string }[]
  assert.deepEqual(students.map(s => s.name).sort(), ['Аня', 'Борис'])
  noForeign(students)
  assert.ok(log.includes(`students.created_by=${A}`), 'выборка учеников обязана фильтроваться по владельцу явно')
  assert.match(message(await listMyStudents(db, A, { group_id: GB })), /не найдена/)
})

Deno.test('чужой ученик и чужая группа не видны ни в одном инструменте', async () => {
  const { db } = fakeDb()
  assert.match(message(await studentSummary(db, A, { student_id: SB }, NOW)), /не найден/)
  assert.match(message(await mistakesByTopic(db, A, { student_id: SB }, NOW)), /не найден/)
  assert.match(message(await mistakesByTopic(db, A, { group_id: GB }, NOW)), /не найдена/)
  assert.match(message(await testResults(db, A, { student_id: SB }, NOW)), /не найден/)
  assert.match(message(await testResults(db, A, { group_id: GB }, NOW)), /не найдена/)
  // Учитель B видит своего ученика, но не учеников A.
  assert.match(message(await studentSummary(db, B, { student_id: SA }, NOW)), /не найден/)
  value(await studentSummary(db, B, { student_id: SB }, NOW))
})

Deno.test('student_summary: посещаемость, долги, без персональных данных', async () => {
  const { db } = fakeDb()
  const v = value(await studentSummary(db, A, { student_id: SA }, NOW)) as {
    attendance: { marked: number; present: number; rate_pct: number; recent_absences: unknown[] }
    homework: { by_status: Record<string, number>; ai_checked: { works: number } }
    debts: { overdue_homework: { title: string }[]; returned_for_rework: string[] }
    diagnostics: unknown[]
  }
  noForeign(v)
  assert.equal(v.attendance.marked, 2)
  assert.equal(v.attendance.rate_pct, 50)
  assert.deepEqual(v.debts.overdue_homework.map(h => h.title), ['ДЗ по олеуму'])
  assert.deepEqual(v.debts.returned_for_rework, ['Электролиз'])
  assert.equal(v.homework.ai_checked.works, 1)
  assert.equal(v.diagnostics.length, 1)
})

Deno.test('mistakes_by_topic группы: свои ошибки агрегированы, чужие (утёкшие через RLS) отброшены', async () => {
  const { db } = fakeDb()
  const v = value(await mistakesByTopic(db, A, { group_id: GA }, NOW)) as {
    exam_tasks_ai_checked: { topic: string; points_lost: number; students: string[] }[]
    homework_tasks: { topic: string; wrong_answers: number }[]
    diagnostic_topics: { topic: string; wrong_answers: number; students: string[] }[]
  }
  noForeign(v)
  assert.deepEqual(v.exam_tasks_ai_checked.map(t => [t.topic, t.points_lost, t.students.length]), [['ЕГЭ №34', 5, 2]])
  assert.deepEqual(v.homework_tasks.map(t => [t.topic, t.wrong_answers]), [['Строение атома · задание 2 (choice)', 1]])
  assert.deepEqual(v.diagnostic_topics.map(t => [t.topic, t.wrong_answers, t.students.length]), [['chem: Кинетика', 3, 2]])
})

Deno.test('test_results: диагностики по student_id и linked_student_id, тесты курса — только свои', async () => {
  const { db } = fakeDb()
  const v = value(await testResults(db, A, {}, NOW)) as {
    diagnostics: { student: string; score_pct: number }[]
    course_tests: { student: string; test: string; score: number }[]
  }
  noForeign(v)
  assert.deepEqual(v.diagnostics.map(d => d.student).sort(), ['Аня', 'Борис'])
  assert.deepEqual(v.course_tests.map(t => [t.student, t.test, t.score]), [['Аня', 'Контрольная', 70]])
})

Deno.test('период по умолчанию — 90 дней включительно', () => {
  const p = period(undefined, undefined, NOW)
  assert.equal(p.until, '2026-11-06')
  assert.equal(p.since, '2026-08-09')
  assert.equal(p.toTs, '2026-11-07T00:00:00Z')
  const out = period('2026-10-01', '2026-10-01')
  assert.equal(out.untilExclusive, '2026-10-02')
})

Deno.test('второй слой: даже если запрос вернул всю таблицу, чужие строки отбрасываются в коде', async () => {
  const { db } = fakeDb(['students', 'groups', 'diag_results', 'hw_ai_grades', 'homework_attempts', 'lesson_progress', 'lesson_attendance', 'homework'])
  noForeign(value(await listMyGroups(db, A)))
  noForeign(value(await listMyStudents(db, A, {})))
  noForeign(value(await mistakesByTopic(db, A, {}, NOW)))
  noForeign(value(await testResults(db, A, {}, NOW)))
  const summary = value(await studentSummary(db, A, { student_id: SA }, NOW)) as { attendance: { marked: number }; homework: { by_status: Record<string, number> } }
  noForeign(summary)
  assert.equal(summary.attendance.marked, 2, 'чужие отметки посещаемости не должны считаться')
  assert.deepEqual(summary.homework.by_status, { completed: 2, returned: 1 }, 'чужие работы не должны считаться')
})
