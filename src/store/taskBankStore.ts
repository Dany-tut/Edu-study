import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Task, Subject } from '../data/taskBankData'

type NewTask = Omit<Task, 'id'>

type TaskBankStore = {
  tasks: Task[]
  loaded: boolean
  load: (force?: boolean) => Promise<void>
  addTask: (t: NewTask) => Promise<number>
  replaceTask: (id: number, patch: Partial<Task>) => Promise<void>
  removeTask: (id: number) => Promise<void>
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
    questionImageSize: row.question_image_size as Task['questionImageSize'],
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
  }
}

const DEV = import.meta.env.DEV
const LS_KEY = 'dev-task-bank'

function lsLoad(): Task[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function lsSave(tasks: Task[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(tasks)) } catch {}
}
let lsNextId = () => { const t = lsLoad(); return t.length ? Math.max(...t.map(x => x.id)) + 1 : 1 }

export const useTaskBank = create<TaskBankStore>((set, get) => ({
  tasks: [],
  loaded: false,

  load: async (force = false) => {
    if (!force && get().loaded && get().tasks.length > 0) return
    if (DEV) {
      set({ tasks: lsLoad(), loaded: true })
      return
    }
    const { data } = await supabase.from('task_bank').select('*').order('id')
    if (data) {
      set({ tasks: data.map(dbToTask), loaded: true })
    }
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
      set({ tasks })
      return
    }
    const { error } = await supabase
      .from('task_bank')
      .update(taskToDb(patch))
      .eq('id', id)
    if (error) throw error
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...patch } : t) }))
  },

  removeTask: async (id) => {
    if (DEV) {
      const tasks = lsLoad().filter(t => t.id !== id)
      lsSave(tasks)
      set({ tasks })
      return
    }
    await supabase.from('task_bank').delete().eq('id', id)
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
  },
}))
