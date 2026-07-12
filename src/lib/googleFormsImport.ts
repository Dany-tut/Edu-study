// Client-side helpers for importing questions from a public Google Form.
// The actual fetch/parse happens server-side (supabase/functions/import-google-form)
// since Google Forms doesn't send CORS headers for a browser fetch.
import { supabase } from './supabase'
import { t } from './i18n'
import type { AnswerType, Task, TaskChoice } from '../data/taskBankData'

export function isGoogleFormUrl(url: string): boolean {
  try {
    const u = new URL(url.trim())
    return /(^|\.)forms\.gle$/.test(u.hostname) || (u.hostname === 'docs.google.com' && u.pathname.includes('/forms/'))
  } catch {
    return false
  }
}

export interface ImportedQuestion {
  id: string
  title: string
  type: AnswerType
  choices?: string[]
  required: boolean
  note?: string
}

export interface ImportedForm {
  title: string
  description?: string
  questions: ImportedQuestion[]
}

export async function importGoogleForm(url: string): Promise<ImportedForm> {
  const { data, error } = await supabase.functions.invoke('import-google-form', { body: { url } })
  if (error) {
    // On a non-2xx response supabase-js sets `data` to null and stashes the raw
    // Response on error.context — read it ourselves to surface our JSON { error } body.
    const context = (error as { context?: Response }).context
    const bodyError = context ? await context.clone().json().then(b => b?.error as string | undefined).catch(() => undefined) : undefined
    throw new Error(bodyError || error.message || t('Не удалось импортировать форму'))
  }
  if (data?.error) throw new Error(data.error as string)
  return data as ImportedForm
}

export type NewBankTask = Omit<Task, 'id'>

export function questionToBankTask(
  q: ImportedQuestion,
  meta: { subject: Task['subject']; section: string; topic: string; part: Task['part']; line: number; source: string },
): NewBankTask {
  const choices: TaskChoice[] | undefined = q.choices?.map((text, i) => ({
    id: String(i), text, correct: false,
  }))
  return {
    ...meta,
    question: q.title,
    answer: '',
    solution: '',
    difficulty: 'medium',
    answerType: q.type,
    questionType: choices ? 'choice' : 'free',
    choices,
  }
}
