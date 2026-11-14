import { useState } from 'react'
import type { LessonTimecode } from '../../data/lessonContent'
import { btn } from '../../lib/pillStyles'
import { transcriptTime } from '../../lib/localTranscription'

export default function SlideChaptersPreview({ chapters, onChange, onApply, onBack, onDiscard }: {
  chapters: LessonTimecode[]; onChange: (chapters: LessonTimecode[]) => void
  onApply: () => Promise<void>; onBack: () => void; onDiscard: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const invalid = !chapters.length || chapters.some((c, i) => !c.label.trim() || !Number.isFinite(c.seconds) || c.seconds < 0 || (i > 0 && c.seconds <= chapters[i-1].seconds))
  return <section className="transcription-inline">
    <header className="transcription-inline-head"><strong>Главы по слайдам</strong></header>
    <div className="transcription-form">
      <p className="transcription-hint">Проверьте названия и первое появление каждой темы. При применении заменятся только главы. Текст, голоса и монтаж сохранятся.</p>
      <p className="transcription-hint">Кадры проверяются каждые 2 секунды; начало найденной темы уточняется примерно до 0,5 секунды. Короткие слайды могут быть пропущены.</p>
      {chapters.map((chapter, index) => <div className="slide-chapter-row" key={index}>
        <label><span>Начало, с</span><input aria-label={`Начало главы ${index+1}`} type="number" min={0} step={0.5} value={chapter.seconds} disabled={saving}
          onChange={event => { const seconds = event.currentTarget.valueAsNumber; onChange(chapters.map((c,i) => i === index ? {...c, seconds, time: transcriptTime(seconds)} : c)) }} /></label>
        <label><span>Название</span><textarea rows={2} aria-label={`Название главы ${index+1}`} value={chapter.label} disabled={saving}
          onChange={event => onChange(chapters.map((c,i) => i === index ? {...c,label:event.currentTarget.value} : c))} /></label>
        <button type="button" style={btn('S','secondary')} disabled={saving} aria-label={`Удалить главу ${index+1}`} onClick={() => onChange(chapters.filter((_,i) => i !== index))}>Убрать</button>
      </div>)}
      {invalid && <p role="alert">Проверьте названия и порядок времени глав.</p>}
      {error && <p role="alert">{error}</p>}
      <div className="slide-chapter-actions">
        <button type="button" style={btn('M','secondary')} disabled={saving} onClick={onBack}>К записи</button>
        <button type="button" style={btn('M','secondary')} disabled={saving} onClick={onDiscard}>Распознать заново</button>
        <button type="button" style={btn('M','primary')} disabled={saving || invalid} onClick={async () => {
          setSaving(true); setError('')
          try { await onApply() } catch { setError('Не удалось сохранить главы. Попробуйте ещё раз.') }
          finally { setSaving(false) }
        }}>{saving ? 'Сохраняем…' : 'Применить главы'}</button>
      </div>
    </div>
  </section>
}
