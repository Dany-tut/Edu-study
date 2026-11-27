import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Task, Subject } from '../data/taskBankData'
import { DEV_SEED_TASKS } from '../data/devTaskSeed'

type NewTask = Omit<Task, 'id'>

type TaskBankStore = {
  tasks: Task[]
  loaded: boolean
  // Last task edited via "Заменить"/constructor — the browser pins it to the top
  // and flashes it for ~3s when the teacher returns. Cleared by clearRecentlyEdited.
  recentlyEditedId: number | null
  load: (force?: boolean) => Promise<void>
  /**
   * Задания банка ФИПИ одного набора (предмет × экзамен). Их тысячи, поэтому
   * общий load() их НЕ тянет — каждый набор подгружается, когда его открыли.
   */
  loadFipiSet: (subject: string, exam: 'ege' | 'oge') => Promise<void>
  fipiSetsLoaded: Record<string, true>
  /** Набор ФИПИ дочитан (или упал) — до этого тренажёр показывает скелетон. */
  fipiSetsReady: Record<string, true>
  addTask: (t: NewTask) => Promise<number>
  replaceTask: (id: number, patch: Partial<Task>) => Promise<void>
  removeTask: (id: number) => Promise<void>
  clearRecentlyEdited: () => void
}

function dbToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as number,
    subject: ((row.subject as string) || 'biology') as Subject,
    section: (row.section as string) || '',
    topic: (row.topic as string) || '',
    part: (row.part as 1 | 2) || 1,
    line: (row.line as number) || 1,
    source: (row.source as string) || '',
    question: (row.question as string) || '',
    answer: (row.answer as string) || '',
    solution: (row.solution as string) || '',
    difficulty: (row.difficulty as Task['difficulty']) || 'medium',
    questionTable: row.question_table as Task['questionTable'],
    questionImage: row.question_image as string | undefined,
    questionImageSize: (() => { const v = row.question_image_size; if (!v) return undefined; if (typeof v === 'number') return v; return ({ sm: 30, md: 50, lg: 70, full: 100 } as Record<string,number>)[v as string] ?? 100 })(),
    questionType: row.question_type as Task['questionType'],
    scoreMode: row.score_mode as Task['scoreMode'],
    choices: row.choices as Task['choices'],
    answerKeys: row.answer_keys as Task['answerKeys'],
    criteria: row.criteria as Task['criteria'],
    criteriaVisibleOnCheck: Boolean(row.criteria_visible_on_check),
    maxPoints: (row.max_points as number) || 1,
    answerType: row.answer_type as Task['answerType'],
    matchLeft: row.match_left as string[] | undefined,
    matchRight: row.match_right as string[] | undefined,
    sequenceItems: row.sequence_items as string[] | undefined,
    allowPhoto: Boolean(row.allow_photo),
    blockOrder: row.block_order as Array<'image' | 'table'> | undefined,
    // Данные, специфичные для типа задания, и языковая разметка
    // (уровень/навык/тема). Одна колонка вместо колонки на каждый тип —
    // см. миграцию 0051.
    payload: (row.payload as Task['payload']) ?? undefined,
    exam: (row.exam as Task['exam']) ?? 'ege',
    kimYear: (row.kim_year as number | null) ?? null,
    kes: (row.kes as string[] | null) ?? [],
    fipiId: (row.fipi_id as string | null) ?? null,
    scoring: (row.scoring as Task['scoring']) ?? null,
  }
}

function taskToDb(t: Partial<Task>) {
  return {
    subject: t.subject ?? '',
    section: t.section ?? '',
    topic: t.topic ?? '',
    part: t.part ?? 1,
    line: t.line ?? 1,
    source: t.source ?? '',
    question: t.question ?? '',
    answer: t.answer ?? '',
    solution: t.solution ?? '',
    difficulty: t.difficulty ?? 'medium',
    question_table: t.questionTable ?? null,
    question_image: t.questionImage ?? null,
    question_image_size: t.questionImageSize ?? null,
    question_type: t.questionType ?? null,
    score_mode: t.scoreMode ?? null,
    choices: t.choices ?? null,
    answer_keys: t.answerKeys ?? null,
    criteria: t.criteria ?? null,
    criteria_visible_on_check: t.criteriaVisibleOnCheck ?? false,
    max_points: t.maxPoints ?? 1,
    answer_type: t.answerType ?? null,
    match_left: t.matchLeft ?? null,
    match_right: t.matchRight ?? null,
    sequence_items: t.sequenceItems ?? null,
    allow_photo: t.allowPhoto ?? false,
    block_order: t.blockOrder ?? null,
    payload: t.payload ?? {},
    exam: t.exam ?? 'ege',
    kim_year: t.kimYear ?? null,
    kes: t.kes ?? [],
    scoring: t.scoring ?? null,
  }
}

// Частичная правка: в базу уходят только поля, которые есть в patch.
//
// taskToDb подставляет пустые значения во всё отсутствующее (payload {},
// answer_type null, choices null…), и «Заменить в тренажёре» с patch из трёх
// полей стирало у задания тип, варианты и данные типа (области «Найди на
// экране», допуск «Числа»). Отсутствующее поле — не разрешение писать NULL.
const DB_KEY: Record<keyof Omit<Task, 'id'>, string> = {
  subject: 'subject', section: 'section', topic: 'topic', part: 'part', line: 'line',
  source: 'source', question: 'question', answer: 'answer', solution: 'solution',
  difficulty: 'difficulty', questionTable: 'question_table', questionImage: 'question_image',
  questionImageSize: 'question_image_size', questionType: 'question_type', scoreMode: 'score_mode',
  choices: 'choices', answerKeys: 'answer_keys', criteria: 'criteria',
  criteriaVisibleOnCheck: 'criteria_visible_on_check', maxPoints: 'max_points',
  answerType: 'answer_type', matchLeft: 'match_left', matchRight: 'match_right',
  sequenceItems: 'sequence_items', allowPhoto: 'allow_photo', blockOrder: 'block_order',
  exam: 'exam', kimYear: 'kim_year', kes: 'kes', fipiId: 'fipi_id', scoring: 'scoring',
  payload: 'payload',
}
function patchToDb(patch: Partial<Task>) {
  const full = taskToDb(patch) as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(patch) as Array<keyof Task>) {
    if (k === 'id') continue
    const col = DB_KEY[k as keyof typeof DB_KEY]
    if (col) out[col] = full[col]
  }
  return out
}

const DEV = import.meta.env.DEV
const LS_KEY = 'dev-task-bank'

function lsLoad(): Task[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function lsSave(tasks: Task[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(tasks)) } catch {}
}
const lsNextId = () => { const t = lsLoad(); return t.length ? Math.max(...t.map(x => x.id)) + 1 : 1 }

if (DEV && typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key === LS_KEY) {
      useTaskBank.setState({ tasks: lsLoad(), loaded: true })
    }
  })
}

export const useTaskBank = create<TaskBankStore>((set, get) => ({
  tasks: [],
  loaded: false,
  fipiSetsLoaded: {},
  fipiSetsReady: {},
  recentlyEditedId: null,
  clearRecentlyEdited: () => set({ recentlyEditedId: null }),

  load: async (force = false) => {
    if (!force && get().loaded && get().tasks.length > 0) return
    if (DEV) {
      const local = lsLoad()
      if (local.length > 0) {
        set({ tasks: local, loaded: true })
        return
      }
      // localStorage empty → seed with dev tasks so trainer has data to test
      lsSave(DEV_SEED_TASKS)
      set({ tasks: DEV_SEED_TASKS, loaded: true })
      return
    }
    // Банк ФИПИ — тысячи строк на набор: в общий список не берём (см. loadFipiSet).
    const { data } = await supabase.from('task_bank').select('*').is('fipi_guid', null).order('id')
    if (data) {
      const own = data.map(dbToTask)
      // Уже открытые наборы ФИПИ не теряем при перезагрузке своих заданий.
      set(s => ({ tasks: [...own, ...s.tasks.filter(t => t.fipiId)], loaded: true }))
    }
  },

  loadFipiSet: async (subject, exam) => {
    const key = `${subject}:${exam}`
    if (get().fipiSetsLoaded[key]) return
    set(s => ({ fipiSetsLoaded: { ...s.fipiSetsLoaded, [key]: true } }))
    if (DEV) {
      // Локально — фикстура из нескольких заданий ФИПИ (ленивый чанк, в прод не попадает).
      const { DEV_FIPI_TASKS } = await import('../data/devFipiSample')
      const add = DEV_FIPI_TASKS.filter(t => t.subject === subject && t.exam === exam)
      const ids = new Set(add.map(t => t.id))
      set(s => ({ tasks: [...s.tasks.filter(t => !ids.has(t.id)), ...add], fipiSetsReady: { ...s.fipiSetsReady, [key]: true } }))
      return
    }
    const rows: Record<string, unknown>[] = []
    // Порциями по 1000 — потолок PostgREST на один ответ.
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from('task_bank').select('*')
        .eq('subject', subject).eq('exam', exam).not('fipi_guid', 'is', null)
        .order('line').order('id').range(from, from + 999)
      if (error) {
        set(s => { const m = { ...s.fipiSetsLoaded }; delete m[key]; return { fipiSetsLoaded: m, fipiSetsReady: { ...s.fipiSetsReady, [key]: true } } })
        console.error('[task_bank] loadFipiSet', error)
        return
      }
      rows.push(...(data ?? []))
      if (!data || data.length < 1000) break
    }
    const add = rows.map(dbToTask)
    const ids = new Set(add.map(t => t.id))
    set(s => ({ tasks: [...s.tasks.filter(t => !ids.has(t.id)), ...add], fipiSetsReady: { ...s.fipiSetsReady, [key]: true } }))
  },

  addTask: async (t) => {
    if (DEV) {
      const id = lsNextId()
      const task: Task = { ...t, id } as Task
      const tasks = [...lsLoad(), task]
      lsSave(tasks)
      set({ tasks })
      return id
    }
    const { data, error } = await supabase
      .from('task_bank')
      .insert(taskToDb(t))
      .select()
      .single()
    if (error || !data) throw error
    const task = dbToTask(data)
    set(s => ({ tasks: [...s.tasks, task] }))
    return task.id
  },

  replaceTask: async (id, patch) => {
    if (DEV) {
      const tasks = lsLoad().map(t => t.id === id ? { ...t, ...patch } : t)
      lsSave(tasks)
      set({ tasks, recentlyEditedId: id })
      return
    }
    // Чужое задание RLS отсекает без ошибки — ноль строк. Это тоже провал:
    // иначе учитель видел «Заменено», а в базе оставалось старое.
    const { data, error } = await supabase
      .from('task_bank')
      .update(patchToDb(patch))
      .eq('id', id)
      .select('id')
    if (error) throw error
    if (!data?.length) throw new Error('task_bank: нет прав на это задание')
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...patch } : t), recentlyEditedId: id }))
  },

  removeTask: async (id) => {
    if (DEV) {
      const tasks = lsLoad().filter(t => t.id !== id)
      lsSave(tasks)
      set({ tasks })
      return
    }
    const { data, error } = await supabase.from('task_bank').delete().eq('id', id).select('id')
    if (error) throw error
    if (!data?.length) throw new Error('task_bank: нет прав на это задание')
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
  },
}))
