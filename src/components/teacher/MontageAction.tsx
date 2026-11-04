import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { SlidersHorizontal } from '../icons/appIcons'
import { decodeLevels, localRequest, type LocalDraft } from '../../lib/localTranscription'
import { DEFAULT_SETTINGS, type MontageLine, type MontageSpeaker } from '../../lib/lessonMontage'
import { parseVideoSource, type VideoSource } from '../../lib/videoSource'

// Окно тяжёлое (шкала, волна, списки) и нужно только по кнопке — свой чанк.
const LessonMontageEditor = lazy(() => import('./LessonMontageEditor'))

/** Кнопка «Монтаж записи» в инструментах расшифровки и само окно. Результат —
 *  в черновик расшифровки (говорящие, реплики, решения по паузам); в урок он
 *  попадает обычной кнопкой «Сохранить». Видео не перекодируется. */
export default function MontageAction({ draft, change, disabled, file, token }: { draft: LocalDraft; change: (value: LocalDraft) => void; disabled?: boolean; file?: File | null; token?: string }) {
  const [open, setOpen] = useState(false)
  // Запись для звука в окне: ссылка урока или выбранный файл (локальный URL живёт, пока окно открыто).
  const [fileUrl, setFileUrl] = useState<string>()
  useEffect(() => {
    if (!open || !file) return
    const url = URL.createObjectURL(file)
    setFileUrl(url)
    return () => { URL.revokeObjectURL(url); setFileUrl(undefined) }
  }, [open, file])
  const video: VideoSource | undefined = file ? (fileUrl ? { kind: 'file', url: fileUrl } : undefined) : noIframe(parseVideoSource(draft.transcript.source))
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
  // Голоса уже подписаны (модулем или прошлым монтажом) — окно открывается с ними.
  const initial = transcript.speakers ? { settings: montage?.settings ?? DEFAULT_SETTINGS, overrides: montage?.overrides ?? {}, speakers: transcript.speakers, lines } : undefined

  // Названные голоса запоминаются на этом Mac (отпечатки — только в модуле):
  // в следующих уроках модуль подпишет их сам. Учитель — всегда.
  const remember = (speakers: MontageSpeaker[]) => {
    if (!token) return
    const named = speakers.filter(sp => sp.role === 'teacher' || !/^Ученик \d+$/.test(sp.label.trim()))
      .map(sp => ({ sp, voice: draft.voices?.find(v => v.id === sp.id && v.embedding) }))
      .filter(x => x.voice).map(({ sp, voice }) => ({ label: sp.label.trim(), role: sp.role, embedding: voice!.embedding }))
    if (named.length) void localRequest('/voices', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voices: named }) }).catch(() => {})
  }
  return <>
    <button type="button" aria-label="Монтаж записи" title="Монтаж записи: паузы и голоса" disabled={disabled} onClick={() => setOpen(true)}><SlidersHorizontal size={16} /></button>
    <Suspense fallback={null}>
      <AnimatePresence>{open && <LessonMontageEditor key="montage" title="Монтаж записи" duration={duration} voices={voices} lines={lines}
        quiet={montage?.quiet ?? []} chapters={draft.timecodes} levelAt={levelAt} initial={initial} missingAudio={!montage} video={video} floor={montage?.floor}
        onApply={(_result, state) => { remember(state.speakers); change({
          ...draft,
          transcript: {
            ...transcript,
            segments: state.lines.map(l => ({ start: l.start, end: l.end, text: l.text, speaker: l.speaker })),
            speakers: state.speakers,
            montage: { duration, quiet: montage?.quiet ?? [], ...(montage?.floor != null ? { floor: montage.floor } : {}), ...(montage?.levels ? { levels: montage.levels } : {}), settings: state.settings, overrides: state.overrides },
          },
        }) }}
        onForgetVoices={token && draft.voices?.some(v => v.embedding) ? () => void localRequest('/voices', token, { method: 'DELETE' }).catch(() => {}) : undefined}
        onClose={() => setOpen(false)} />}</AnimatePresence>
    </Suspense>
  </>
}

/** Чужая страница в iframe не сообщает время — с ней окно работает как без видео. */
function noIframe(source: VideoSource | undefined) { return source?.kind === 'iframe' ? undefined : source }
