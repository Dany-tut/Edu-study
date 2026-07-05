/**
 * Standalone homework — ДЗ, назначенное ученику/группе ВНЕ курса (кнопка
 * «Создать домашку»: строка `homework` с task_ids/hard_tasks и `lesson_id = null`).
 *
 * Курсовые ДЗ живут в уроке (lessons.homework) и решаются на его ноде. У
 * standalone-ДЗ урока-ноды нет, поэтому мы синтезируем отдельный предмет-трек
 * «Домашние задания» со своей нумерацией: каждая строка `homework` → нода
 * `hw-<id>`, а её задания конвертируются в тот же AuthoredHomework, что и
 * курсовое ДЗ. Дальше весь solve/submit переиспользует getLessonDetail +
 * HomeworkFlow (сдача пишется в lesson_progress по ключу `hw-<id>` / `hw-<id>-hard`).
 */
import { supabase } from './supabase'
import type { Subject, Lesson } from '../data/mockData'
import type { AuthoredHomework, AuthoredHomeworkTask } from '../data/lessonContent'
import type { HardTaskDef } from './useHomework'

/** Синтетический id предмета-инбокса домашних заданий вне курса. */
export const HW_SUBJECT_ID = 'hw-inbox'

interface DbStandaloneHw {
  id: string
  title: string | null
  task_ids: number[] | null
  hard_tasks: HardTaskDef[] | null
  due_date: string | null
  assigned_at: string | null
}

/** Минимальная проекция строки task_bank — только поля, нужные для решаемого ДЗ. */
interface DbBankTask {
  id: number
  question: string | null
  question_type: string | null
  choices: Array<{ text: string; correct: boolean }> | null
  answer: string | null
  sequence_items: string[] | null
  match_left: string[] | null
  match_right: string[] | null
  question_table: AuthoredHomeworkTask['table'] | null
  question_image: string | null
  question_image_size: number | null
}

/** Имя предмета группы — для заголовка трека-таблетки «Домашка». */
async function fetchGroupSubject(groupId: string): Promise<string | null> {
  if (!groupId) return null
  const { data } = await supabase.from('groups').select('subject').eq('id', groupId).maybeSingle()
  return (data as { subject?: string } | null)?.subject?.trim() || null
}

/** Активные standalone-ДЗ для группы ученика (lesson_id IS NULL). */
export async function fetchStandaloneHomework(groupId: string): Promise<DbStandaloneHw[]> {
  if (!groupId) return []
  const { data, error } = await supabase
    .from('homework')
    .select('id, title, task_ids, hard_tasks, due_date, assigned_at')
    .eq('group_id', groupId)
    .is('lesson_id', null)
    .eq('status', 'active')
    .order('assigned_at', { ascending: true })
  if (error || !data) return []
  return data as DbStandaloneHw[]
}

/** Определения заданий банка по id (напрямую из task_bank — не зависит от того,
 *  загрузил ли ученик клиентский банк тренажёра). */
async function fetchBankTasks(ids: number[]): Promise<Map<number, DbBankTask>> {
  const map = new Map<number, DbBankTask>()
  const uniq = [...new Set(ids)].filter(n => Number.isFinite(n))
  if (uniq.length === 0) return map
  const { data, error } = await supabase
    .from('task_bank')
    .select('id, question, question_type, choices, answer, sequence_items, match_left, match_right, question_table, question_image, question_image_size')
    .in('id', uniq)
  if (error || !data) return map
  for (const row of data as DbBankTask[]) map.set(row.id, row)
  return map
}

/** Одно задание банка → AuthoredHomeworkTask (базовый уровень). Типы выбраны так,
 *  чтобы authoredTaskToQuestion (lessonContent.ts) корректно их распознал:
 *  choice — авто-проверка по варианту, sequence/match/table — свои виды,
 *  остальное — free-text с эталоном (referenceAnswer). */
function bankTaskToAuthored(t: DbBankTask): AuthoredHomeworkTask {
  const base = {
    id: `t${t.id}`,
    isHard: false,
    question: t.question ?? '',
    image: t.question_image ?? undefined,
    imageSize: t.question_image_size ?? undefined,
  }
  if (t.question_type === 'choice' && Array.isArray(t.choices) && t.choices.length > 0) {
    return {
      ...base,
      type: 'choice',
      choices: t.choices.map(c => c.text),
      correctChoices: t.choices.map((c, i) => (c.correct ? i : -1)).filter(i => i >= 0),
    }
  }
  if (Array.isArray(t.sequence_items) && t.sequence_items.length > 0) {
    return { ...base, type: 'sequence', sequenceItems: t.sequence_items }
  }
  if (Array.isArray(t.match_left) && t.match_left.length > 0) {
    return {
      ...base,
      type: 'match',
      pairs: t.match_left.map((l, i) => ({ left: l, right: (t.match_right ?? [])[i] ?? '' })),
    }
  }
  if (t.question_table) {
    return { ...base, type: 'table', table: t.question_table, answer: t.answer ?? undefined }
  }
  return { ...base, type: 'fill', answer: t.answer ?? undefined }
}

/** Строка `homework` → AuthoredHomework (база из task_ids + хард из hard_tasks). */
function buildAuthored(hw: DbStandaloneHw, bankById: Map<number, DbBankTask>): AuthoredHomework {
  const basic = (hw.task_ids ?? [])
    .map(id => bankById.get(id))
    .filter((t): t is DbBankTask => !!t)
    .map(bankTaskToAuthored)
  const hard: AuthoredHomeworkTask[] = (hw.hard_tasks ?? []).map((d: HardTaskDef, i) => ({
    id: d.key || `h${i}`,
    type: 'extended',
    isHard: true,
    question: d.statement,
    answer: d.answer,
    image: d.image ?? undefined,
  }))
  return {
    hwTitle: hw.title?.trim() || null,
    hwDate: hw.due_date ?? null,
    hwTasks: [...basic, ...hard],
  }
}

/**
 * Собрать синтетический предмет «Домашние задания» из активных standalone-ДЗ.
 * Возвращает null, если назначенных ДЗ (с заданиями) нет. `subjectName` — имя
 * предмета группы (для заголовка трека), иначе дефолт.
 */
export async function fetchStandaloneSubject(groupId: string): Promise<Subject | null> {
  const rows = await fetchStandaloneHomework(groupId)
  if (rows.length === 0) return null

  const allIds = rows.flatMap(r => r.task_ids ?? [])
  const [bankById, subjectName] = await Promise.all([
    fetchBankTasks(allIds),
    fetchGroupSubject(groupId),
  ])

  const lessons: Lesson[] = rows
    .map((hw, i) => ({ hw, homework: buildAuthored(hw, bankById), idx: i }))
    // Пропускаем полностью пустые ДЗ (ни базовых, ни хард-заданий не резолвится).
    .filter(({ homework }) => (homework.hwTasks?.length ?? 0) > 0)
    .map(({ hw, homework, idx }): Lesson => ({
      id: `hw-${hw.id}`,
      title: hw.title?.trim() || `Домашнее задание ${idx + 1}`,
      number: idx + 1,
      status: 'locked',
      shape: 'circle',
      subject: HW_SUBJECT_ID,
      kind: 'lesson',
      homework,
    }))

  if (lessons.length === 0) return null

  return {
    id: HW_SUBJECT_ID,
    // Таблетка предмета в треке: имя предмета, выбранного при создании ДЗ (из
    // группы). Курс рядом показывается по своему названию — отдельной таблеткой.
    name: subjectName ? `Домашка · ${subjectName}` : 'Домашние задания',
    progress: 0,
    activeModuleId: 1,
    accessMode: 'full', // ноды ДЗ всегда открыты для решения
    modules: [{ id: 1, label: 'Домашние задания', lessons }],
  }
}
