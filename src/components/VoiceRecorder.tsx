import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { uploadMedia, MediaTooLargeError } from '../lib/mediaStorage'
import AudioPlayer from './AudioPlayer'
import { useT } from '../lib/i18n'

// Запись голосового ответа (speaking). getUserMedia → MediaRecorder → Blob →
// uploadMedia('voice') в бакет task-media (5A). Наружу отдаёт PATH записи; сам файл
// проигрывается через AudioPlayer по signed URL. Таймер на setInterval (rAF в
// превью не работает). Микрофонные дорожки и таймер чистятся при размонтировании.

type Phase = 'idle' | 'recording' | 'uploading' | 'error'

export default function VoiceRecorder({
  value,
  onChange,
  maxSeconds = 120,
  accent,
}: {
  /** Путь уже записанного ответа (task-media), если есть. */
  value?: string | null
  onChange: (path: string | null) => void
  maxSeconds?: number
  /**
   * Цвет предмета. В домашке запись живёт на общем акценте приложения, а в
   * языковом тренажёре — внутри карточки предмета со своей палитрой, и общий
   * фиолетовый там выбивался. Не задан — цвет прежний.
   */
  accent?: string
}) {
  const t = useT()
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')

  const recRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function cleanupStream() {
    streamRef.current?.getTracks().forEach(tr => tr.stop())
    streamRef.current = null
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }
  useEffect(() => cleanupStream, [])

  async function start() {
    setError('')
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setPhase('error'); setError(t('Запись не поддерживается в этом браузере')); return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
      rec.onstop = () => { void finish() }
      recRef.current = rec
      rec.start()
      setPhase('recording'); setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed(s => {
          const next = s + 1
          if (next >= maxSeconds) stop()
          return next
        })
      }, 1000)
    } catch {
      setPhase('error'); setError(t('Нет доступа к микрофону'))
    }
  }

  function stop() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    const rec = recRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
  }

  async function finish() {
    setPhase('uploading')
    const type = recRef.current?.mimeType || 'audio/webm'
    const blob = new Blob(chunksRef.current, { type })
    cleanupStream()
    try {
      const path = await uploadMedia(blob, 'voice')
      onChange(path)
      setPhase('idle')
    } catch (e) {
      setPhase('error')
      setError(e instanceof MediaTooLargeError ? t('Запись слишком длинная') : t('Не удалось загрузить запись'))
    }
  }

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // Уже записан — показываем плеер + переписать.
  if (value && phase === 'idle') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <AudioPlayer audioUrl={value} compact accent={accent} />
        <span style={{ fontSize: 12.5, color: 'var(--color-green-text)', fontWeight: 600 }}>{t('Ответ записан')}</span>
        <button onClick={() => onChange(null)} title={t('Перезаписать')}
          style={{ marginLeft: 'auto', border: 'none', background: 'var(--color-bg-3)', borderRadius: 8, height: 30, padding: '0 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--color-muted)', fontFamily: 'inherit' }}>
          <Trash2 size={13} /> {t('Заново')}
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      {phase === 'recording' ? (
        <button onClick={stop} style={recBtn('var(--color-red-text)')}>
          <Square size={16} /> {t('Стоп')}
        </button>
      ) : phase === 'uploading' ? (
        <button disabled style={recBtn('var(--color-muted)')}>
          <Loader2 size={16} className="spin" /> {t('Загрузка…')}
        </button>
      ) : (
        <button onClick={start} style={recBtn(accent ?? 'var(--color-accent)')}>
          <Mic size={16} /> {t('Записать')}
        </button>
      )}

      {phase === 'recording' && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: 'var(--color-red-text)' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--color-red-text)' }} />
          {mmss(elapsed)} / {mmss(maxSeconds)}
        </span>
      )}

      {phase === 'error' && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--color-red-text)' }}>
          <AlertCircle size={14} /> {error}
        </span>
      )}
    </div>
  )
}

function recBtn(color: string): React.CSSProperties {
  return {
    height: 40, padding: '0 18px', borderRadius: 999, border: `1.5px solid ${color}`,
    background: 'var(--color-bg-2)', color, cursor: 'pointer', fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700,
  }
}
