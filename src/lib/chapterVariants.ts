import type { LessonTimecode } from '../data/lessonContent'
import { taxonCase } from './taxonCase'

export type ChapterMode = 'text' | 'slides'
export interface ChapterVariants {
  source: string
  active: ChapterMode
  revision: number
  text: LessonTimecode[]
  slides?: LessonTimecode[]
}
export interface ChapterControls {
  mode: ChapterMode
  codes: LessonTimecode[]
  select: (mode: ChapterMode) => void
  change: (codes: LessonTimecode[]) => void
  corrected?: (before: string, after: string) => void
  generate: () => void
  available: boolean
  saving: boolean
}

export function hasChapterVariant(codes?: LessonTimecode[]): boolean {
  return Array.isArray(codes) && codes.length > 0
}

const abbreviations = new Set('ДНК РНК АТФ АДФ АМФ ЦНС ПНС ЖКТ ВИЧ СПИД ЕГЭ ОГЭ ГМО ДВ РРФ DNA RNA ATP ADP PCR NAD NADH NADPH PH CO2 O2 H2O'.split(' '))
/** Only all-capital prose is folded. Mixed-case scientific notation stays intact. */
export function sentenceTitle(raw: string): string {
  const text = raw.trim().replace(/\s+/g, ' ')
  const folded = text.replace(/[\p{L}\p{N}]+/gu, word => {
    if (abbreviations.has(word) || /\d/.test(word) || /^[IVXLCDM]+$/.test(word) || word !== word.toLocaleUpperCase('ru')) return word
    return word.toLocaleLowerCase('ru')
  })
  const first = text.match(/\p{L}+/u)?.[0] ?? ''
  if (first !== first.toLowerCase() && first !== first.toUpperCase()) return taxonCase(folded)
  return taxonCase(folded.replace(/\p{L}/u, c => c.toLocaleUpperCase('ru')))
}
export function titleConcern(text: string): string | undefined {
  if (/[·…]|\.{2,}/.test(text)) return 'Похоже на обрывок текста'
  const words = text.match(/\p{L}+/gu) ?? []
  if (words.some(w => /[а-яё]/i.test(w) && /[a-z]/i.test(w))) return 'Смешаны русские и латинские буквы'
  if (words.length > 1 && words.every(w => /^[a-z]{1,2}$/i.test(w) || /^[IVX]+$/.test(w))) return 'Похоже на обрывок текста'
  const significant = words.filter(w => !abbreviations.has(w.toUpperCase()) && !/^[IVXLCDM]+$/.test(w))
  if (significant.length && significant.every(w => !/[аеёиоуыэюяaeiouy]/i.test(w))) return 'Похоже на обрывок текста'
  return undefined
}
export function prepareSlideChapters(codes: LessonTimecode[]): LessonTimecode[] {
  return codes.map(c => ({...c, originalTitle: c.originalTitle ?? c.label, label: c.originalTitle ? c.label : sentenceTitle(c.label)}))
}
export function publishedChapters(codes: LessonTimecode[]) {
  return codes.map(({time,label,seconds}) => ({time,label:label.trim(),seconds}))
}
export function chapterPayload(value: ChapterVariants) {
  return { timecodes: publishedChapters(value[value.active] ?? []), chapter_variants: value }
}

/** Rebase only chapter fields in old queued course snapshots. Preserve new edits
 * and never transplant chapters onto a different recording. */
export function rebaseChapterLessons<T extends {id:string; videoUrl?:string; chapterVariants?:ChapterVariants; timecodes?:LessonTimecode[]}>(lessons: T[], confirmed: Map<string, ChapterVariants>): T[] {
  return lessons.map(l => {
    const saved = confirmed.get(l.id)
    return saved && saved.source === (l.videoUrl ?? '').trim() && saved.revision > (l.chapterVariants?.revision ?? -1)
      ? {...l, chapterVariants:saved, timecodes:saved[saved.active] ?? []} : l
  })
}
