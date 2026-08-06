import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Turtle } from 'lucide-react'
import { getMediaUrl } from '../lib/mediaStorage'
import { useT } from '../lib/i18n'
import { speechLocale } from '../lib/speech'

// Аудио-стимул для языковых заданий (listenType/listenBank/minimalPair). Источник —
// либо загруженный файл в Storage (audioUrl = путь, 5A), либо текст для браузерного
// синтеза (ttsText). Кнопка «черепаха» замедляет воспроизведение, если allowSlow.
// requestAnimationFrame в превью не работает — прогресс тут не рисуем, только play/stop.

const SLOW_RATE = 0.6

export default function AudioPlayer({
  audioUrl,
  ttsText,
  ttsVoice,
  allowSlow = false,
  lang,
  compact = false,
  onPlayingChange,
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

  // Stop any TTS still speaking when the player unmounts.
  useEffect(() => () => { if (usesTts && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel() }, [usesTts])

  function stopTts() {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
    setPlaying(false)
  }

  function speak(rate: number) {
    if (typeof speechSynthesis === 'undefined' || !ttsText) return
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(ttsText)
    u.rate = rate
    const locale = speechLocale(lang)
    if (locale) u.lang = locale
    if (ttsVoice) {
      const v = speechSynthesis.getVoices().find(x => x.name === ttsVoice)
      if (v) u.voice = v
    }
    u.onend = () => setPlaying(false)
    u.onerror = () => setPlaying(false)
    setPlaying(true)
    speechSynthesis.speak(u)
  }

  function toggle() {
    const rate = slow ? SLOW_RATE : 1
    if (usesTts) {
      if (playing) stopTts()
      else speak(rate)
      return
    }
    const el = audioRef.current
    if (!el) return
    if (playing) { el.pause() }
    else { el.playbackRate = rate; void el.play() }
  }

  function toggleSlow() {
    const next = !slow
    setSlow(next)
    const rate = next ? SLOW_RATE : 1
    if (usesTts) { if (playing) speak(rate) }
    else if (audioRef.current) audioRef.current.playbackRate = rate
  }

  const hasSource = usesTts || !!audioUrl
  const size = compact ? 38 : 44

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
          width: size, height: size, borderRadius: '50%', flexShrink: 0, border: 'none',
          cursor: hasSource ? 'pointer' : 'default', opacity: hasSource ? 1 : 0.4,
          background: 'var(--color-accent)', color: '#fff',
          display: 'grid', placeItems: 'center',
          boxShadow: '0 4px 12px -3px color-mix(in srgb, var(--color-accent) 55%, transparent)',
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
            border: `1.5px solid ${slow ? 'var(--color-accent)' : 'var(--color-border-soft)'}`,
            background: slow ? 'var(--color-purple-soft)' : 'var(--color-bg-2)',
            color: slow ? 'var(--color-accent)' : 'var(--color-text-2)',
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
