import { useMemo, useState } from 'react'
import ScrollFade from './ScrollFade'
import HScrollFade from './HScrollFade'
import Segmented from './Segmented'
import { transcriptTime, type LessonTranscript } from '../lib/localTranscription'
import { btn } from '../lib/pillStyles'
import { useT } from '../lib/i18n'

export default function LessonTranscriptPanel({ transcript, time, seek, hidden }: {
  transcript: LessonTranscript; time: number; seek?: (seconds: number) => void
  /** Вырезанное монтажом: эти реплики ученику не показываем. */
  hidden?: [number, number][]
}) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [who, setWho] = useState('all')
  // Имена говорящих — после монтажа; без него реплики идут без подписи.
  const name = (id?: string) => id ? transcript.speakers?.find(sp => sp.id === id)?.label : undefined
  const speakers = transcript.speakers?.filter(sp => transcript.segments.some(s => s.speaker === sp.id)) ?? []
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return transcript.segments.filter(s =>
      !(hidden ?? []).some(([a, b]) => s.start >= a - 0.05 && s.end <= b + 0.05) &&
      (who === 'all' || s.speaker === who) &&
      (!q || s.text.toLowerCase().includes(q)))
  }, [transcript.segments, hidden, who, query])
  return <section style={{ padding: 20, borderRadius: 20, background: 'var(--color-bg-2)' }}>
    <h2>Расшифровка урока</h2>
    <div style={{ display: 'grid', gap: 8, margin: '10px 0' }}>
      <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Поиск по расшифровке')} aria-label={t('Поиск по расшифровке')}
        style={{ width: '100%', boxSizing: 'border-box', minHeight: 40, padding: '8px 12px', borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)', font: 'inherit', fontSize: 16 }} />
      {speakers.length > 1 && <HScrollFade fade="var(--color-bg-2)" padBottom={2}>
        <Segmented variant="filter" value={who} onChange={setWho} items={[{ id: 'all', label: t('Все') }, ...speakers.map(sp => ({ id: sp.id, label: sp.label }))]} />
      </HScrollFade>}
    </div>
    <ScrollFade maxHeight={350}>
      {shown.length ? shown.map((s, i) => <p key={s.start + ':' + i} style={{ padding: 6, borderRadius: 8,
        background: time >= s.start && time < s.end ? 'var(--color-purple-soft)' : undefined }}>
        {seek ? <button style={btn('S', 'secondary')} onClick={() => seek(s.start)}>{transcriptTime(s.start)}</button> :
          <strong>{transcriptTime(s.start)}</strong>} {name(s.speaker) && <strong style={{ color: 'var(--color-text-3)' }}>{name(s.speaker)}:</strong>} {s.text}
      </p>) : <p style={{ color: 'var(--color-text-3)' }}>{t('Ничего не нашлось')}</p>}
    </ScrollFade>
  </section>
}
