import { prepareSlideChapters, type ChapterMode, type ChapterVariants } from './chapterVariants'
import type { LessonTimecode } from '../data/lessonContent'

export type ChapterDraft = ChapterVariants & {
  fileSignature?: string
  // The empty tab of an ungenerated mode is not a deletion. Only a user edit
  // from populated chapters can create this witness.
  clearedFrom?: { mode: ChapterMode; published: LessonTimecode[]; revision: number }
}
type Sources = {
  source: string; signature?: string; remote?: ChapterVariants; published?: LessonTimecode[]
  transcriptCodes?: LessonTimecode[]; saved?: ChapterDraft | null
  oldTranscript?: { transcript?: { source?: string }; fileSignature?: string; timecodes?: LessonTimecode[] } | null
  oldSlides?: { source?: string; fileSignature?: string; chapters?: LessonTimecode[] } | null
}
export function sameChapterProjection(left: LessonTimecode[], right: LessonTimecode[]) {
  return left.length === right.length && left.every((code, i) =>
    code.time === right[i].time && code.seconds === right[i].seconds && code.label === right[i].label)
}

export function transcriptionChapterState(s: Sources) {
  const published = s.published ?? s.transcriptCodes ?? []
  const remote = s.remote?.source === s.source ? s.remote : undefined
  let base: ChapterVariants = remote ?? { source: s.source, active: 'text', revision: 0, text: published }
  if (s.published && !sameChapterProjection(base[base.active] ?? [], published)) base = { ...base, [base.active]: published }
  const saved = s.saved
  if (saved?.source === s.source && saved.fileSignature === s.signature && Array.isArray(saved.text) &&
      (saved.active === 'text' || saved.active === 'slides') && Number.isFinite(saved.revision) &&
      (!remote || saved.revision > remote.revision)) {
    const { clearedFrom, fileSignature: _signature, ...variants } = saved
    const cleared = clearedFrom?.mode === saved.active && clearedFrom.revision === (remote?.revision ?? 0) &&
      Array.isArray(clearedFrom.published) && sameChapterProjection(clearedFrom.published, published)
    if (variants[variants.active]?.length || cleared) {
      const alternate = variants.active === 'text' ? 'slides' : 'text'
      if (!variants[alternate]?.length && base[alternate]?.length) {
        return { variants: { ...variants, [alternate]: base[alternate] }, dirty: true, cleared }
      }
      return { variants, dirty: true, cleared }
    }
  }
  if (!remote) {
    const text = s.oldTranscript
    if (!base.text.length && text?.transcript?.source === s.source && text.fileSignature === s.signature &&
        Array.isArray(text.timecodes) && text.timecodes.length) base = { ...base, text: text.timecodes }
    const slides = s.oldSlides
    if (slides?.source === s.source && slides.fileSignature === s.signature && Array.isArray(slides.chapters) && slides.chapters.length) {
      return { variants: { ...base, active: 'slides' as const, slides: prepareSlideChapters(slides.chapters) }, dirty: true, cleared: false }
    }
  }
  return { variants: base, dirty: false, cleared: false }
}
