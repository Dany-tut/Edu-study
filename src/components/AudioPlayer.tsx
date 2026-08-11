import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Turtle } from 'lucide-react'
import { getMediaUrl } from '../lib/mediaStorage'
import { useT } from '../lib/i18n'
import { speak, stopSpeech } from '../lib/speech'

// Аудио-стимул для языковых заданий (listenType/listenBank/minimalPair). Источник —
// либо загруженный файл в Storage (audioUrl = путь, 5A), либо текст для браузерного
// синтеза (ttsText). Кнопка «черепаха» замедляет воспроизведение, если allowSlow.
// requestAnimationFrame в превью не работает — прогресс тут не рисуем, только play/stop.

/** Замедление файла. Ниже 0.75 запись начинает «плыть». */
const SLOW_RATE = 0.75
/** Замедление синтеза. На 0.6 браузерный голос перестаёт быть речью, поэтому
 *  «медленно» здесь — это умеренный темп плюс заметная пауза между репликами:
 *  на слух текст идёт вдвое спокойнее, а слова остаются словами. */
const TTS_SLOW_RATE = 0.8
/** Пауза между репликами: обычная — вдох между строками диалога, медленная —
 *  время осознать сказанное до следующей. */
const GAP = 160
const SLOW_GAP = 650

export default function AudioPlayer({
  audioUrl,
  ttsText,
  ttsVoice,
  allowSlow = false,
  lang,
  compact = false,
  onPlayingChange,
  accent,
  soft,
  variant = 'solid',
}: {
  /** Путь в бакете task-media (резолвится в signed URL). */
  audioUrl?: string
  /** Текст для синтеза речи, если файл не загружен. */
  ttsText?: string
  ttsVoice?: string
  allowSlow?: boolean
  /** Код языка для синтеза (en, ru…). */
  lang?: string
  compact?: boolean
  /** Сообщает наружу, идёт ли сейчас звук — по этому родитель рисует индикатор. */
  onPlayingChange?: (playing: boolean) => void
  /**
   * Цвет предмета. Плеер живёт и в домашке (там акцент приложения), и в
   * языковом тренажёре, где у каждого предмета своя палитра: круглая кнопка
   * фиолетовым посреди корейской лавандовой карточки выбивалась из ряда.
   * Не задан — берётся общий акцент приложения, как было.
   */
  accent?: string
  /** Мягкая заливка того же цвета — фон включённого «медленно». */
  soft?: string
  /**
   * `solid` — залитая цветом кнопка с подсветкой (единственный звук на экране).
   * `ghost` — мягкая заливка и цветная иконка: там, где плееров сразу десяток
   * (словарь урока), десять залитых кружков превращаются в цветной шум и
   * перетягивают внимание с самих слов. Заливается только тот, что звучит.
   */
  variant?: 'solid' | 'ghost'
}) {
  const t = useT()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [slow, setSlow] = useState(false)
  const usesTts = !audioUrl && !!ttsText

  // Resolve the storage path to a short-lived signed URL.
  useEffect(() => {
    let alive = true
    if (!audioUrl) { setSrc(null); return }
    getMediaUrl(audioUrl).then(u => { if (alive) setSrc(u) })
    return () => { alive = false }
  }, [audioUrl])

  // Родитель получает состояние через ref-колбэк: инлайновая стрелка в пропсах
  // менялась бы каждый рендер и гоняла бы эффект вхолостую.
  const notifyRef = useRef(onPlayingChange)
  notifyRef.current = onPlayingChange
  useEffect(() => { notifyRef.current?.(playing) }, [playing])

  // Речь не должна продолжаться на следующем экране.
  useEffect(() => () => { if (usesTts) stopSpeech() }, [usesTts])

  /** Запустить синтез. Текст режется на реплики внутри speak(): длинную сцену
   *  одним куском Chrome обрывает на пятнадцатой секунде, а таймкоды в начале
   *  строк он читал вслух («двадцать сорок один»). */
  function say(isSlow: boolean) {
    if (!ttsText) return
    setPlaying(true)
    // onEnd приходит и когда речь перебили из другого места экрана, так что
    // индикатор гаснет вместе со звуком, а не остаётся гореть навсегда.
    speak(ttsText, {
      lang,
      voiceName: ttsVoice,
      rate: isSlow ? TTS_SLOW_RATE : 1,
      gap: isSlow ? SLOW_GAP : GAP,
      onEnd: () => setPlaying(false),
    })
  }

  function toggle() {
    if (usesTts) {
      if (playing) { stopSpeech(); setPlaying(false) }
      else say(slow)
      return
    }
    const el = audioRef.current
    if (!el) return
    if (playing) { el.pause() }
    else { el.playbackRate = slow ? SLOW_RATE : 1; void el.play() }
  }

  function toggleSlow() {
    const next = !slow
    setSlow(next)
    if (usesTts) { if (playing) say(next) }
    else if (audioRef.current) audioRef.current.playbackRate = next ? SLOW_RATE : 1
  }

  const hasSource = usesTts || !!audioUrl
  const size = compact ? 38 : 44
  // Цвет предмета, если он передан; иначе общий акцент — так плеер выглядит
  // одинаково в домашке и в тренажёре, но в тренажёре попадает в палитру языка.
  const tone = accent ?? 'var(--color-accent)'
  const toneSoft = soft ?? (accent ? `color-mix(in srgb, ${accent} 18%, transparent)` : 'var(--color-purple-soft)')

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={src ?? undefined}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          preload="none"
        />
      )}
      <button
        onClick={toggle}
        disabled={!hasSource}
        aria-label={playing ? t('Пауза') : t('Играть')}
        style={{
          width: size, height: size, borderRadius: '50%', flexShrink: 0,
          cursor: hasSource ? 'pointer' : 'default', opacity: hasSource ? 1 : 0.4,
          display: 'grid', placeItems: 'center',
          ...(variant === 'ghost' && !playing
            ? {
                border: `1px solid color-mix(in srgb, ${tone} 32%, transparent)`,
                background: toneSoft, color: tone, boxShadow: 'none',
              }
            : {
                border: 'none', background: tone, color: '#fff',
                boxShadow: `0 4px 12px -3px color-mix(in srgb, ${tone} 55%, transparent)`,
              }),
        }}
      >
        {playing ? <Pause size={compact ? 16 : 18} /> : <Play size={compact ? 16 : 18} style={{ marginLeft: 2 }} />}
      </button>

      {allowSlow && hasSource && (
        <button
          onClick={toggleSlow}
          aria-pressed={slow}
          title={t('Помедленнее')}
          style={{
            height: 32, padding: '0 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600,
            border: `1.5px solid ${slow ? tone : 'var(--color-border-soft)'}`,
            background: slow ? toneSoft : 'var(--color-bg-2)',
            color: slow ? tone : 'var(--color-text-2)',
          }}
        >
          <Turtle size={14} /> {t('Медленно')}
        </button>
      )}

      {!hasSource && (
        <span style={{ fontSize: 12.5, color: 'var(--color-muted)' }}>{t('Аудио не задано')}</span>
      )}
    </div>
  )
}
