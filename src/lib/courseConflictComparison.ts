import type { CourseEdData } from '../pages/teacher/TeacherCourseEditorPage'
import { lessonShortIdMap } from './lessonReferences'

type Translator = (text: string) => string
type Field = { label: string; database: string; tab: string }
type StoredLesson = {
  short_id: string; title: string | null; lesson_number: number | null
  description: string | null; timecodes: unknown; chapter_variants: unknown
}
type StoredCourse = {
  title: string | null; description: string | null; status: string | null
  group_ids: string[] | null; student_ids: string[] | null; lessons: StoredLesson[]
}

export interface CourseConflict {
  stamp: string
  added: string[]
  renamed: { from: string; to: string }[]
  localNew: string[]
  titleChange: { from: string; to: string } | null
  statusChange: { from: 'draft' | 'published'; to: 'draft' | 'published' } | null
  audienceChanged: boolean
  courseFields: Field[]
  lessonFields: Array<{ id: string; title: string; number: number | null; fields: Field[] }>
}

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const text = (value: unknown) => typeof value === 'string' ? value : ''

function chapters(value: unknown, t: Translator): string {
  if (value == null) return ''
  if (!Array.isArray(value)) return t('Не удалось прочитать таймкоды')
  return value.map(item => {
    const code = object(item)
    const time = text(code.time)
    const seconds = typeof code.seconds === 'number' && Number.isFinite(code.seconds) ? code.seconds : null
    const clockSeconds = /^\d+(?::\d{2})+$/.test(time)
      ? time.split(':').reduce((sum, part) => 60 * sum + Number(part), 0) : null
    const actual = seconds !== null && seconds !== clockSeconds ? `${seconds} ${t('с')}` : ''
    const label = text(code.label) || t('Без названия')
    const original = text(code.originalTitle)
    return [time, actual && (time ? `(${actual})` : actual), label].filter(Boolean).join(' ')
      + (original && original !== code.label ? `\n  ${t('Исходное название')} — ${original}` : '')
  }).join('\n')
}

function add(fields: Field[], label: string, database: string, tab: string) {
  if (database !== tab) fields.push({ label, database, tab })
}

export function compareCourseVersions(shortId: string, local: CourseEdData, server: StoredCourse, stamp: string, t: Translator): CourseConflict {
  const nameless = t('Без названия')
  const shortIds = lessonShortIdMap(shortId, local.lessons)
  const localById = new Map(local.lessons.map(l => [shortIds[l.id], l]))
  const stored = [...server.lessons].sort((a, b) => (a.lesson_number ?? 0) - (b.lesson_number ?? 0))
  const storedById = new Map(stored.map(lesson => [lesson.short_id, lesson]))
  const result: CourseConflict = {
    stamp, added: [], renamed: [], localNew: [], titleChange: null, statusChange: null,
    audienceChanged: false, courseFields: [], lessonFields: [],
  }
  const title = server.title ?? ''
  if (title !== local.title) result.titleChange = { from: title || nameless, to: local.title || nameless }
  if ((server.status === 'draft' || server.status === 'published') && server.status !== local.status) {
    result.statusChange = { from: server.status, to: local.status }
  }
  const sameIds = (a: string[] | null, b: string[]) => JSON.stringify([...(a ?? [])].sort()) === JSON.stringify([...b].sort())
  result.audienceChanged = !sameIds(server.group_ids, local.groupIds) || !sameIds(server.student_ids, local.studentIds)
  add(result.courseFields, t('Описание курса'), server.description ?? '', local.description ?? '')
  for (const id of new Set([...storedById.keys(), ...localById.keys()])) {
    const db = storedById.get(id), tab = localById.get(id)
    if (!db) result.localNew.push(tab?.title || nameless)
    else if (!tab) result.added.push(db.title || nameless)
    else if ((db.title ?? '') !== tab.title) result.renamed.push({ from: db.title || nameless, to: tab.title || nameless })
    const fields: Field[] = []
    add(fields, t('Описание урока'), db?.description ?? '', tab?.description ?? '')
    add(fields, t('Таймкоды в плеере'), chapters(db?.timecodes, t), chapters(tab?.timecodes, t))
    const dbVariant = object(db?.chapter_variants), tabVariant = object(tab?.chapterVariants)
    const mode = (v: unknown) => v === 'slides' ? t('По слайдам') : v === 'text' ? t('По тексту') : ''
    add(fields, t('Выбранный вариант'), mode(dbVariant.active), mode(tabVariant.active))
    add(fields, t('Источник таймкодов'), text(dbVariant.source), text(tabVariant.source))
    add(fields, t('Таймкоды по тексту'), chapters(dbVariant.text, t), chapters(tabVariant.text, t))
    add(fields, t('Таймкоды по слайдам'), chapters(dbVariant.slides, t), chapters(tabVariant.slides, t))
    if (fields.length) result.lessonFields.push({
      id, title: tab?.title || db?.title || nameless,
      number: tab?.number ?? (db?.lesson_number != null ? db.lesson_number + 1 : null), fields,
    })
  }
  return result
}
