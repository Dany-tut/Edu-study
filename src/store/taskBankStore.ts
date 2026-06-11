import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Task, Subject } from '../data/taskBankData'

type NewTask = Omit<Task, 'id'>

type TaskBankStore = {
  tasks: Task[]
  loaded: boolean
  load: () => Promise<void>
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

export const useTaskBank = create<TaskBankStore>((set, get) => ({
  tasks: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return
    const { data } = await supabase.from('task_bank').select('*').order('id')
    if (data) {
      set({ tasks: data.map(dbToTask), loaded: true })
    }
  },

  addTask: async (t) => {
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
    const { error } = await supabase
      .from('task_bank')
      .update(taskToDb(patch))
      .eq('id', id)
    if (error) throw error
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...patch } : t) }))
  },

  removeTask: async (id) => {
    await supabase.from('task_bank').delete().eq('id', id)
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
  },
}))
