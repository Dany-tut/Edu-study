import { lazy, Suspense, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { SlidersHorizontal } from '../icons/appIcons'
import { decodeLevels, type LocalDraft } from '../../lib/localTranscription'
import type { MontageLine } from '../../lib/lessonMontage'

// Окно тяжёлое (шкала, волна, списки) и нужно только по кнопке — свой чанк.
const LessonMontageEditor = lazy(() => import('./LessonMontageEditor'))

/** Кнопка «Монтаж записи» в инструментах расшифровки и само окно. Результат —
 *  в черновик расшифровки (говорящие, реплики, решения по паузам); в урок он
 *  попадает обычной кнопкой «Сохранить». Видео не перекодируется. */
export default function MontageAction({ draft, change, disabled }: { draft: LocalDraft; change: (value: LocalDraft) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const { transcript } = draft
  const montage = transcript.montage
  const lines = useMemo<MontageLine[]>(() => transcript.segments.map((s, i) => ({ id: 'l' + i, start: s.start, end: s.end, text: s.text, speaker: s.speaker ?? 'v1' })), [transcript.segments])
  const voices = useMemo(() => transcript.speakers?.map(s => s.id) ?? [...new Set(lines.map(l => l.speaker))], [transcript.speakers, lines])
  const duration = Math.max(montage?.duration ?? 0, ...transcript.segments.map(s => s.end), ...(montage?.quiet ?? []).map(q => q.end)) + 1
  const levelAt = useMemo(() => {
    const db = montage?.levels ? decodeLevels(montage.levels.data) : [], step = montage?.levels?.step ?? 0.5
    // Без данных модуля волна рисуется по репликам: речь громче, промежутки тише.
    return db.length ? (t: number) => db[Math.min(db.length - 1, Math.max(0, Math.floor(t / step)))] ?? -60
      : (t: number) => lines.some(l => t >= l.start && t < l.end) ? -22 : (montage?.quiet ?? []).find(q => t >= q.start && t < q.end)?.level ?? -48
  }, [montage, lines])
  const initial = transcript.speakers && montage?.settings ? { settings: montage.settings, overrides: montage.overrides ?? {}, speakers: transcript.speakers, lines } : undefined

  return <>
    <button type="button" aria-label="Монтаж записи" title="Монтаж записи: паузы и голоса" disabled={disabled} onClick={() => setOpen(true)}><SlidersHorizontal size={16} /></button>
    <Suspense fallback={null}>
      <AnimatePresence>{open && <LessonMontageEditor key="montage" title="Монтаж записи" duration={duration} voices={voices} lines={lines}
        quiet={montage?.quiet ?? []} chapters={draft.timecodes} levelAt={levelAt} initial={initial} missingAudio={!montage}
        onApply={(_result, state) => change({
          ...draft,
          transcript: {
            ...transcript,
            segments: state.lines.map(l => ({ start: l.start, end: l.end, text: l.text, speaker: l.speaker })),
            speakers: state.speakers,
            montage: { duration, quiet: montage?.quiet ?? [], ...(montage?.levels ? { levels: montage.levels } : {}), settings: state.settings, overrides: state.overrides },
          },
        })}
        onClose={() => setOpen(false)} />}</AnimatePresence>
    </Suspense>
  </>
}
