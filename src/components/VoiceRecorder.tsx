import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { uploadMedia, MediaTooLargeError } from '../lib/mediaStorage'
import { isAsrAvailable, listen, type AsrSession } from '../lib/asr'
import { micProblem } from '../lib/micAccess'
import AudioPlayer from './AudioPlayer'
import { useT } from '../lib/i18n'

// Запись голосового ответа (speaking). getUserMedia → MediaRecorder → Blob →
// uploadMedia('voice') в бакет task-media (5A). Наружу отдаёт PATH записи; сам файл
// проигрывается через AudioPlayer по signed URL. Таймер на setInterval (rAF в
// превью не работает). Микрофонные дорожки и таймер чистятся при размонтировании.
//
// РАСПОЗНАВАНИЕ ПАРАЛЛЕЛЬНО ЗАПИСИ (listenLang). Там, где у задания есть эталон
// («прочитайте вслух»), одной записи мало: ученику нужен ответ сразу, а не через
// неделю. Тогда рядом с MediaRecorder слушает SpeechRecognition — оба берут
// микрофон независимо (см. lib/asr.ts), — и наружу вместе с путём уходит текст,
// который услышал браузер. Вызывающий сверяет его с эталоном сам.
//
// Распознавалки может не быть вовсе (Firefox, приложение на айфоне). Тогда
// listenLang молча ничего не делает, второй аргумент onChange приходит пустым,
// и запись ведёт себя ровно как раньше — уходит преподавателю без вердикта.

type Phase = 'idle' | 'recording' | 'uploading' | 'error'

export default function VoiceRecorder({
  value,
  onChange,
  maxSeconds = 120,
  accent,
  listenLang,
}: {
  /** Путь уже записанного ответа (task-media), если есть. */
  value?: string | null
  /**
   * Готовая запись. `heard` приходит только при заданном listenLang и только
   * там, где распознавалка есть и что-то расслышала.
   */
  onChange: (path: string | null, heard?: string) => void
  maxSeconds?: number
  /**
   * Код языка для распознавания (BCP-47: 'ko', 'en-US'). Не задан — микрофон
   * работает как раньше, без распознавания.
   */
  listenLang?: string
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
  // Что сделать, чтобы отказ снялся. Без этой строки «Нет доступа к микрофону»
  // остаётся тупиком: на телефоне ни адресной строки, ни замка не видно.
  const [hint, setHint] = useState('')

  const recRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const asrRef = useRef<AsrSession | null>(null)

  function cleanupStream() {
    streamRef.current?.getTracks().forEach(tr => tr.stop())
    streamRef.current = null
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    asrRef.current?.cancel()
    asrRef.current = null
  }
  useEffect(() => cleanupStream, [])

  async function start() {
    setError(''); setHint('')
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setPhase('error')
      setError(t('Запись не поддерживается в этом браузере'))
      setHint(t('Откройте домашку в Safari или Chrome — там запись работает.'))
      return
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

      // Слушаем ту же речь второй парой ушей. Отдельная сессия, свой доступ к
      // микрофону: MediaRecorder её не видит и не мешает ей.
      if (listenLang && isAsrAvailable()) asrRef.current = listen(listenLang)

      setPhase('recording'); setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed(s => {
          const next = s + 1
          if (next >= maxSeconds) stop()
          return next
        })
      }, 1000)
    } catch (e) {
      // Причина отказа лежит в имени DOMException, и она решает, что советовать:
      // «разрешите в настройках» бессмысленно, когда микрофона нет вовсе.
      const problem = micProblem(e)
      setPhase('error'); setError(t(problem.text)); setHint(t(problem.hint))
    }
  }

  function stop() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    const rec = recRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
  }

  /**
   * Дослушать распознавание и забрать текст. Ждём не дольше секунды с
   * четвертью: браузер закрывает сессию сам, но если он этого почему-то не
   * сделал, ответ ученика не должен висеть из-за подсказки к нему.
   */
  async function takeHeard(): Promise<string> {
    const session = asrRef.current
    asrRef.current = null
    if (!session) return ''
    session.stop()
    return Promise.race([
      session.done,
      new Promise<string>(res => setTimeout(() => { session.cancel(); res('') }, 1250)),
    ])
  }

  async function finish() {
    setPhase('uploading')
    const type = recRef.current?.mimeType || 'audio/webm'
    const blob = new Blob(chunksRef.current, { type })
    // Расшифровку забираем ДО чистки дорожек: cleanupStream гасит сессию.
    const heard = await takeHeard()
    cleanupStream()
    try {
      const path = await uploadMedia(blob, 'voice')
      onChange(path, heard)
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

      {/* Совет — отдельной строкой во всю ширину: в него не помещается ни одна
          инструкция, если держать её в одном ряду с кнопкой. */}
      {phase === 'error' && !!hint && (
        <p style={{
          flexBasis: '100%', margin: 0, fontSize: 12.5, lineHeight: 1.5,
          color: 'var(--color-text-2)', padding: '10px 12px', borderRadius: 14,
          background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
        }}>
          {hint}
        </p>
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
