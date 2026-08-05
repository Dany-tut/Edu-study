import { useRef, useState } from 'react'
import { Upload, X, Volume2, Loader2 } from 'lucide-react'
import { uploadMedia, MediaTooLargeError } from '../../lib/mediaStorage'
import AudioPlayer from '../AudioPlayer'
import { useT } from '../../lib/i18n'

// Редактор аудио-стимула для языковых заданий (listenType/listenBank/minimalPair).
// Два взаимодополняющих источника: загруженный файл в бакет task-media (5A) ИЛИ
// текст для браузерного синтеза речи. Плюс тумблер «медленно». Что задано —
// то и проигрывается (файл имеет приоритет над синтезом).

export type AudioStimulus = { audioUrl?: string; ttsText?: string; allowSlow?: boolean }

export default function AudioStimulusEditor({
  value,
  onChange,
  inputStyle,
}: {
  value: AudioStimulus
  onChange: (patch: AudioStimulus) => void
  /** Общий стиль инпутов редактора, чтобы совпадать с окружением. */
  inputStyle?: React.CSSProperties
}) {
  const t = useT()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function onFile(file: File) {
    setError(''); setUploading(true)
    try {
      const path = await uploadMedia(file, 'stimulus')
      onChange({ audioUrl: path })
    } catch (e) {
      setError(e instanceof MediaTooLargeError ? t('Файл слишком большой (макс 20 МБ)') : t('Не удалось загрузить аудио'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const inSt: React.CSSProperties = inputStyle ?? {
    width: '100%', boxSizing: 'border-box', padding: '8px 11px', borderRadius: 10,
    border: '1.5px solid var(--color-border-soft)', background: 'var(--color-bg-input)',
    fontSize: 13, color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit',
  }
  const chip = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10,
    cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
    border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border-soft)'}`,
    background: active ? 'var(--color-purple-soft)' : 'var(--color-bg-2)',
    color: active ? 'var(--color-accent)' : 'var(--color-text-2)',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Загруженный файл или загрузка */}
      {value.audioUrl ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AudioPlayer audioUrl={value.audioUrl} allowSlow={value.allowSlow} compact />
          <span style={{ fontSize: 12, color: 'var(--color-green-text)', fontWeight: 600 }}>{t('Аудио загружено')}</span>
          <button onClick={() => onChange({ audioUrl: undefined })} title={t('Убрать аудио')}
            style={{ marginLeft: 'auto', border: 'none', background: 'var(--color-bg-3)', borderRadius: 8, width: 26, height: 26, cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--color-muted)' }}>
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <input
            value={value.ttsText ?? ''}
            onChange={e => onChange({ ttsText: e.target.value })}
            placeholder={t('Текст для озвучки (синтез речи)')}
            style={inSt}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{t('или')}</span>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} style={chip(false)}>
              {uploading ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
              {uploading ? t('Загрузка…') : t('Загрузить аудио')}
            </button>
            {value.ttsText && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--color-text-3)' }}><Volume2 size={12} /> {t('будет синтез речи')}</span>}
          </div>
        </>
      )}

      {/* «Медленно» доступно для любого источника */}
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12.5, color: 'var(--color-text-2)' }}>
        <input type="checkbox" checked={!!value.allowSlow} onChange={e => onChange({ allowSlow: e.target.checked })} />
        {t('Разрешить замедленное воспроизведение')}
      </label>

      {error && <div style={{ fontSize: 11.5, color: 'var(--color-red-text)' }}>{error}</div>}
      <input ref={fileRef} type="file" accept="audio/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) void onFile(f) }} />
    </div>
  )
}
