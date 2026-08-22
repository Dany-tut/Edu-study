import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Play, Volume2, Repeat, Trash2, AlertCircle, ChevronRight } from 'lucide-react'
import { speak, stopSpeech, preferredVoice, type SpeechHandle } from '../../lib/speech'
import { useT } from '../../lib/i18n'

// ─────────────────────────────────────────────────────────────────────────────
// Шэдоуинг: повторить за эталоном и услышать себя рядом с ним
//
// ЗАЧЕМ ОТДЕЛЬНО ОТ «ГОВОРЕНИЯ». Обычное говорение — это монолог на минуту,
// который уходит преподавателю и разбирается на следующем уроке. Оно работает,
// но обратная связь приходит через неделю, а произношение правится только по
// горячему: пока в ушах ещё держится эталон. Здесь петля короткая — одна
// реплика, эталон, своя запись, сравнение — и замыкается она внутри ученика.
//
// ПОЧЕМУ ЗАПИСЬ НЕ УХОДИТ НА СЕРВЕР. За один подход к теме человек записывает
// два десятка реплик, из которых интересна ровно последняя, и то полминуты.
// Заливать их в бакет — это платить хранением за черновики и превращать ленту
// преподавателя в свалку. Записи живут в blob-URL до ухода с экрана; то, что
// человек хочет показать, он записывает в обычном задании говорения.
//
// ЧЕГО ЗДЕСЬ НЕТ И НЕ БУДЕТ ЧЕСТНЫМ. Автоматической оценки произношения. Ни
// один браузерный API её не даёт: распознавание речи возвращает текст, а не
// близость к эталону, и «правильно распознано» — не то же самое, что «звучит
// как носитель». Оценивает ухо ученика, а инструмент даёт ему две записи
// подряд и кнопку «ещё раз».
//
// ЭТАЛОН — СИНТЕЗ. Живого диктора у нас нет, поэтому образец говорит тот же
// голос, что читает карточки (см. lib/speech.ts). Он не даёт живой интонации,
// но даёт ударение, паузы и связки — то, ради чего шэдоуинг и делают.
// ─────────────────────────────────────────────────────────────────────────────

/** Строка для повтора: оригинал и перевод под ним. */
export interface ShadowLine {
  text: string
  ru?: string
}

type Rec = { url: string; ms: number }

export default function Shadowing({ lines, lang, accent, soft }: {
  lines: ShadowLine[]
  /** Код языка материала — по нему берётся голос эталона. */
  lang: string
  accent: string
  soft: string
}) {
  const t = useT()
  const [at, setAt] = useState(0)
  const [slow, setSlow] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'model' | 'recording' | 'mine' | 'both'>('idle')
  const [error, setError] = useState('')
  /** Записи по номеру строки. Живут до ухода с экрана — см. шапку файла. */
  const [recs, setRecs] = useState<Record<number, Rec>>({})

  const voiceRef = useRef<SpeechHandle | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const startedRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [elapsed, setElapsed] = useState(0)
  /** Записи в ref — иначе чистилка размонтирования увидит пустой первый рендер. */
  const recsRef = useRef(recs)
  recsRef.current = recs

  const line = lines[at]

  // Уход с экрана гасит всё сразу: голос, микрофон, плеер и blob-URL. Без
  // последнего браузер держит в памяти все записи подхода до перезагрузки.
  useEffect(() => () => {
    stopSpeech()
    audioRef.current?.pause()
    streamRef.current?.getTracks().forEach(tr => tr.stop())
    if (timerRef.current) clearInterval(timerRef.current)
    for (const r of Object.values(recsRef.current)) URL.revokeObjectURL(r.url)
  }, [])

  /** Смена строки обрывает то, что играло от предыдущей. */
  function go(next: number) {
    stopAll()
    setAt(Math.max(0, Math.min(lines.length - 1, next)))
  }

  function stopAll() {
    voiceRef.current?.stop()
    voiceRef.current = null
    audioRef.current?.pause()
    audioRef.current = null
    setPhase('idle')
  }

  /** Эталон. `then` вызывается, только если реплика дочитана до конца. */
  function playModel(then?: () => void) {
    stopAll()
    setPhase('model')
    voiceRef.current = speak(line.text, {
      lang,
      rate: slow ? 0.8 : 1,
      voiceName: preferredVoice(lang),
      onEnd: done => {
        setPhase('idle')
        if (done && then) then()
      },
    })
  }

  /** Своя запись этой строки. */
  function playMine(then?: () => void) {
    const rec = recs[at]
    if (!rec) return
    stopAll()
    setPhase('mine')
    const audio = new Audio(rec.url)
    audioRef.current = audio
    audio.onended = () => { setPhase('idle'); then?.() }
    void audio.play().catch(() => setPhase('idle'))
  }

  /**
   * Сравнение — главная кнопка экрана: эталон, короткая пауза, своя запись.
   *
   * Пауза нужна: без неё две дорожки склеиваются в одну и разницу слышно хуже,
   * чем когда между ними есть тишина, в которую ухо успевает переключиться.
   */
  function playBoth() {
    if (!recs[at]) { playModel(); return }
    stopAll()
    setPhase('both')
    voiceRef.current = speak(line.text, {
      lang,
      rate: slow ? 0.8 : 1,
      voiceName: preferredVoice(lang),
      onEnd: done => {
        if (!done) { setPhase('idle'); return }
        setTimeout(() => {
          const rec = recsRef.current[at]
          if (!rec) { setPhase('idle'); return }
          const audio = new Audio(rec.url)
          audioRef.current = audio
          audio.onended = () => setPhase('idle')
          void audio.play().catch(() => setPhase('idle'))
        }, 400)
      },
    })
  }

  async function startRec() {
    setError('')
    stopAll()
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(t('Запись не поддерживается в этом браузере')); return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        const ms = Date.now() - startedRef.current
        setRecs(prev => {
          // Перезапись строки: старый blob-URL освобождаем сразу, иначе за
          // подход их накапливается столько же, сколько было попыток.
          if (prev[at]) URL.revokeObjectURL(prev[at].url)
          return { ...prev, [at]: { url, ms } }
        })
        streamRef.current?.getTracks().forEach(tr => tr.stop())
        streamRef.current = null
        setPhase('idle')
      }
      recorderRef.current = rec
      startedRef.current = Date.now()
      rec.start()
      setPhase('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed(s => {
          const next = s + 1
          // Реплика — это одно предложение. Полминуты на него хватает с
          // запасом, а забытый включённым микрофон останавливается сам.
          if (next >= 30) stopRec()
          return next
        })
      }, 1000)
    } catch {
      setError(t('Нет доступа к микрофону'))
      setPhase('idle')
    }
  }

  function stopRec() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
  }

  const doneCount = Object.keys(recs).length
  const mine = recs[at]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Реплика. Крупно и одна: шэдоуинг делается по строке, а список внизу
          нужен только чтобы видеть, где ты и сколько осталось. */}
      <div style={{
        padding: '20px 22px', borderRadius: 18,
        background: 'var(--color-bg-2)', border: `1px solid ${accent}33`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 11.5, letterSpacing: 0.3, color: 'var(--color-text-3)' }}>
            {at + 1} / {lines.length}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--color-text-3)' }}>
            {t('записано')}: {doneCount}
          </span>
        </div>
        <div style={{ fontSize: 21, lineHeight: 1.45, color: 'var(--color-text)', fontWeight: 650 }}>
          {line.text}
        </div>
        {line.ru && (
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--color-text-3)', marginTop: 8 }}>
            {line.ru}
          </div>
        )}
      </div>

      {/* Кнопки идут в том порядке, в каком делается сам приём: послушал —
          повторил — сравнил. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={() => playModel()} style={btn(accent, phase === 'model')}>
          <Volume2 size={16} /> {t('Эталон')}
        </button>

        {phase === 'recording' ? (
          <button onClick={stopRec} style={btn('var(--color-red-text)', true)}>
            <Square size={16} /> {t('Стоп')} · {elapsed}
          </button>
        ) : (
          <button onClick={() => void startRec()} style={btn('var(--color-red-text)', false)}>
            <Mic size={16} /> {mine ? t('Ещё раз') : t('Повторить')}
          </button>
        )}

        <button
          onClick={() => playMine()}
          disabled={!mine}
          style={{ ...btn('var(--color-text-2)', phase === 'mine'), opacity: mine ? 1 : 0.4, cursor: mine ? 'pointer' : 'default' }}
        >
          <Play size={16} /> {t('Я')}
        </button>

        <button
          onClick={playBoth}
          disabled={!mine}
          style={{
            ...btn(accent, phase === 'both'),
            background: mine ? accent : 'var(--color-bg-2)',
            color: mine ? '#fff' : 'var(--color-muted)',
            borderColor: mine ? accent : 'var(--color-border-medium)',
            cursor: mine ? 'pointer' : 'default',
          }}
        >
          <Repeat size={16} /> {t('Сравнить')}
        </button>

        <button
          onClick={() => setSlow(v => !v)}
          style={{
            ...btn(slow ? accent : 'var(--color-text-3)', false),
            background: slow ? soft : 'var(--color-bg-2)',
          }}
        >
          {t('Медленно')}
        </button>

        {mine && (
          <button
            onClick={() => setRecs(prev => {
              const next = { ...prev }
              URL.revokeObjectURL(prev[at].url)
              delete next[at]
              return next
            })}
            title={t('Удалить запись')}
            style={{ ...btn('var(--color-muted)', false), padding: '0 12px' }}
          >
            <Trash2 size={14} />
          </button>
        )}

        <button onClick={() => go(at + 1)} disabled={at >= lines.length - 1}
          style={{
            ...btn(accent, false), marginLeft: 'auto',
            opacity: at >= lines.length - 1 ? 0.4 : 1,
            cursor: at >= lines.length - 1 ? 'default' : 'pointer',
          }}>
          {t('Дальше')} <ChevronRight size={16} />
        </button>
      </div>

      {error && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--color-red-text)' }}>
          <AlertCircle size={14} /> {error}
        </span>
      )}

      {/* Весь список — чтобы видеть путь целиком и вернуться к строке, которая
          не далась. Точка слева = запись уже есть. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {lines.map((l, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
              padding: '9px 12px', borderRadius: 10, fontFamily: 'inherit', cursor: 'pointer',
              border: `1px solid ${i === at ? `${accent}55` : 'transparent'}`,
              background: i === at ? soft : 'transparent',
            }}
          >
            <span style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: recs[i] ? accent : 'var(--color-border-medium)',
            }} />
            <span style={{
              flex: 1, fontSize: 13, lineHeight: 1.4,
              color: i === at ? 'var(--color-text)' : 'var(--color-text-2)',
              fontWeight: i === at ? 650 : 400,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {l.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function btn(color: string, active: boolean): React.CSSProperties {
  return {
    height: 40, padding: '0 16px', borderRadius: 999,
    border: `1.5px solid ${active ? color : 'var(--color-border-medium)'}`,
    background: 'var(--color-bg-2)', color, cursor: 'pointer', fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700,
  }
}
