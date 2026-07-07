// Edge Function: import questions from a public Google Form.
//
// The browser can't fetch a Google Form's HTML directly (no CORS headers on
// docs.google.com), so this proxies the fetch server-side and extracts the
// question list from the page's embedded `FB_PUBLIC_LOAD_DATA_` blob — an
// undocumented but long-stable internal format Google ships on every public
// form page. Only question text/options come through; Google never exposes
// the quiz answer key to non-owners via the public page, so imported
// questions always arrive without a correct answer — the teacher marks it
// afterward in our own editor.
//
// Request:  POST { url: string }                      (JWT in Authorization header)
// Response: { title: string, description?: string, questions: ImportedQuestion[] }

import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

type AnswerType = 'single' | 'multi' | 'fill' | 'matching' | 'sequence' | 'tableFill' | 'extended'

interface ImportedQuestion {
  id: string
  title: string
  type: AnswerType
  choices?: string[]
  required: boolean
  note?: string
}

// Google's internal item-type codes (item[3] in FB_PUBLIC_LOAD_DATA_).
const TYPE_SHORT_ANSWER = 0
const TYPE_PARAGRAPH = 1
const TYPE_MULTIPLE_CHOICE = 2
const TYPE_DROPDOWN = 3
const TYPE_CHECKBOX = 4
const TYPE_LINEAR_SCALE = 5
const TYPE_GRID = 7
const TYPE_SECTION_HEADER = 8
const TYPE_DATE = 9
const TYPE_TIME = 10

function isGoogleFormUrl(url: string) {
  try {
    const u = new URL(url)
    return /(^|\.)forms\.gle$/.test(u.hostname) || (u.hostname === 'docs.google.com' && u.pathname.includes('/forms/'))
  } catch {
    return false
  }
}

function extractTitle(html: string): string {
  const meta = html.match(/<meta property="og:title" content="([^"]*)"/)
  if (meta) return decodeHtmlEntities(meta[1])
  const title = html.match(/<title>([^<]*)<\/title>/)
  if (title) return decodeHtmlEntities(title[1]).replace(/\s*-\s*Google\s*(Форм[а-я]*|Forms)\s*$/i, '').trim()
  return 'Импортированная форма'
}

function extractDescription(html: string): string | undefined {
  const meta = html.match(/<meta name="description" content="([^"]*)"/)
  return meta ? decodeHtmlEntities(meta[1]) : undefined
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

function extractLoadData(html: string): unknown[] | null {
  const m = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[[\s\S]*?\])\s*;\s*<\/script>/)
  if (!m) return null
  try {
    return JSON.parse(m[1])
  } catch {
    return null
  }
}

function mapType(code: number): AnswerType {
  switch (code) {
    case TYPE_SHORT_ANSWER: return 'fill'
    case TYPE_PARAGRAPH: return 'extended'
    case TYPE_MULTIPLE_CHOICE: return 'single'
    case TYPE_DROPDOWN: return 'single'
    case TYPE_CHECKBOX: return 'multi'
    case TYPE_LINEAR_SCALE: return 'single'
    case TYPE_DATE: return 'fill'
    case TYPE_TIME: return 'fill'
    default: return 'extended'
  }
}

function optionTexts(entry: unknown): string[] | undefined {
  const opts = (entry as unknown[])?.[1] as unknown[] | null | undefined
  if (!Array.isArray(opts)) return undefined
  const texts = opts.map(o => String((o as unknown[])?.[0] ?? '')).filter(Boolean)
  return texts.length ? texts : undefined
}

function parseQuestions(loadData: unknown[]): ImportedQuestion[] {
  const items = (loadData?.[1] as unknown[]) ?? []
  const questions: ImportedQuestion[] = []

  for (const raw of items) {
    const item = raw as unknown[]
    const itemId = String(item?.[0] ?? '')
    const itemTitle = String(item?.[1] ?? '').trim()
    const typeCode = Number(item?.[3] ?? -1)
    const entries = (item?.[4] as unknown[]) ?? []

    if (typeCode === TYPE_SECTION_HEADER || !entries.length) continue
    if (!itemTitle) continue

    if (typeCode === TYPE_GRID && entries.length > 1) {
      // Flatten each grid row into its own standalone question.
      const sharedChoices = optionTexts(entries[0])
      entries.forEach((row, i) => {
        const rowLabel = String((row as unknown[])?.[3]?.[0] ?? `Строка ${i + 1}`)
        questions.push({
          id: `${itemId}-${i}`,
          title: `${itemTitle}: ${rowLabel}`,
          type: 'single',
          choices: sharedChoices,
          required: Boolean((entries[0] as unknown[])?.[2]),
        })
      })
      continue
    }

    const entry = entries[0] as unknown[]
    const required = Boolean(entry?.[2])
    const type = mapType(typeCode)
    let note: string | undefined
    if (typeCode !== TYPE_MULTIPLE_CHOICE && typeCode !== TYPE_DROPDOWN && typeCode !== TYPE_CHECKBOX
      && typeCode !== TYPE_SHORT_ANSWER && typeCode !== TYPE_PARAGRAPH && typeCode !== TYPE_LINEAR_SCALE
      && typeCode !== TYPE_DATE && typeCode !== TYPE_TIME) {
      note = 'Тип вопроса не распознан однозначно — импортировано как развёрнутый ответ, проверьте вручную.'
    }

    questions.push({
      id: itemId,
      title: itemTitle,
      type,
      choices: optionTexts(entry),
      required,
      note,
    })
  }

  return questions
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'Не авторизован' }, 401)
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userErr } = await caller.auth.getUser()
  if (userErr || !userData.user) return json({ error: 'Не авторизован' }, 401)

  let formUrl: string
  try {
    const body = await req.json()
    formUrl = String(body.url ?? '')
  } catch {
    return json({ error: 'Некорректный запрос' }, 400)
  }
  if (!formUrl || !isGoogleFormUrl(formUrl)) {
    return json({ error: 'Это не похоже на ссылку Google Forms' }, 400)
  }

  let html: string
  try {
    const res = await fetch(formUrl, { redirect: 'follow' })
    if (res.status === 401 || res.status === 403) {
      return json({ error: 'Форма недоступна — откройте доступ «Всем, у кого есть ссылка» в настройках отправки формы.' }, 422)
    }
    if (!res.ok) return json({ error: `Не удалось загрузить форму (HTTP ${res.status})` }, 422)
    html = await res.text()
  } catch {
    return json({ error: 'Не удалось загрузить форму по ссылке' }, 422)
  }

  if (/accounts\.google\.com\/(ServiceLogin|signin)/.test(html) || /you need (permission|access)/i.test(html)) {
    return json({ error: 'Форма недоступна — откройте доступ «Всем, у кого есть ссылка» в настройках отправки формы.' }, 422)
  }

  const loadData = extractLoadData(html)
  if (!loadData) {
    return json({ error: 'Не удалось разобрать структуру формы (возможно, Google изменил формат страницы).' }, 422)
  }

  const questions = parseQuestions(loadData)
  if (!questions.length) {
    return json({ error: 'В форме не нашлось ни одного распознаваемого вопроса.' }, 422)
  }

  return json({
    title: extractTitle(html),
    description: extractDescription(html),
    questions,
  })
})
