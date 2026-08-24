import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Turtle } from 'lucide-react'
import { getMediaUrl } from '../lib/mediaStorage'
import { useT } from '../lib/i18n'
import { speak, stopSpeech } from '../lib/speech'
import VoicePicker from './trainer/VoicePicker'

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
  picker = true,
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
  /**
   * Сообщает наружу, идёт ли сейчас ЗВУК — по этому родитель рисует индикатор.
   *
   * Именно звук, а не нажатие: между кликом и первым словом синтезатор берёт
   * своё время (сетевой голос — до секунды), и линия, пущенная по клику, к
   * началу слова уже на середине. Кнопка переключается сразу, наружу уходит
   * факт звучания.
   */
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
  /**
   * Показывать ли рядом выбор голоса.
   *
   * По умолчанию — да, и это главное: голос выбирается ОДИН на язык (ключ в
   * localStorage общий), но пока выбрать его можно было только в читалке
   * тренажёра, во всей остальной озвучке — в карточках, в разговорнике, в
   * задании на слух — ученику доставался тот диктор, которого угадала
   * автоматика. Кнопка стоит там же, где звук, потому что мысль «не тот голос»
   * приходит ровно в момент прослушивания, а не в настройках.
   *
   * Выключают там, где выбор уже стоит рядом отдельной строкой (рейл читалки),
   * и там, где голос задал учитель (ttsVoice) — его выбор не ученику менять.
   */
  picker?: boolean
}) {
  const t = useT()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  // Звук пошёл на самом деле: у файла это событие play, у синтеза — onStart.
  // Кнопка живёт на `playing` (отклик обязан быть мгновенным), индикаторы
  // снаружи — на этом.
  const [sounding, setSounding] = useState(false)
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
  useEffect(() => { notifyRef.current?.(sounding) }, [sounding])

  // Речь не должна продолжаться на следующем экране.
  useEffect(() => () => { if (usesTts) stopSpeech() }, [usesTts])

  /** Запустить синтез. Текст режется на реплики внутри speak(): длинную сцену
   *  одним куском Chrome обрывает на пятнадцатой секунде, а таймкоды в начале
   *  строк он читал вслух («двадцать сорок один»). */
  function say(isSlow: boolean) {
    if (!ttsText) return
    setPlaying(true)
    setSounding(false)
    // onStart — первый реальный звук: до него наружу «звучит» не уходит.
    // onEnd приходит и когда речь перебили из другого места экрана, так что
    // индикатор гаснет вместе со звуком, а не остаётся гореть навсегда.
    speak(ttsText, {
      lang,
      voiceName: ttsVoice,
      rate: isSlow ? TTS_SLOW_RATE : 1,
      gap: isSlow ? SLOW_GAP : GAP,
      onStart: () => setSounding(true),
      onEnd: () => { setPlaying(false); setSounding(false) },
    })
  }

  function toggle() {
    if (usesTts) {
      if (playing) { stopSpeech(); setPlaying(false); setSounding(false) }
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
  // Залитая кнопка без цвета предмета — наш фирменный градиент, как у всех
  // сплошных кнопок. Один --color-accent в тёмной теме светлеет до лаванды, и
  // белая иконка на нём еле читалась. Цвет предмета, если он задан, остаётся
  // цветом предмета: в тренажёре кнопка обязана попадать в палитру языка.
  const fill = accent ?? 'var(--grad-purple)'
  // Свечение тоже от градиента, а не от --color-accent: светлый ореол вокруг
  // кнопки размывал её контур и весь кружок читался лавандовым, хотя залит был
  // фирменным. Цифры — тёмный конец --grad-purple (#6A5AE6).
  const glow = accent
    ? `0 4px 12px -3px color-mix(in srgb, ${accent} 55%, transparent)`
    : '0 4px 14px rgba(106,90,230,0.34)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={src ?? undefined}
          onPlay={() => { setPlaying(true); setSounding(true) }}
          onPause={() => { setPlaying(false); setSounding(false) }}
          onEnded={() => { setPlaying(false); setSounding(false) }}
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
                border: 'none', background: fill, color: '#fff',
                boxShadow: glow,
              }),
        }}
      >
        {/* Треугольник залит, а не обведён: контурная иконка на цветном кружке
            выглядит бледной наклейкой поверх заливки, а не одной кнопкой. */}
        {playing
          ? <Pause size={compact ? 16 : 18} fill="currentColor" />
          : <Play size={compact ? 16 : 18} fill="currentColor" style={{ marginLeft: 2 }} />}
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
          {/* Черепаха — самый густой глиф в ряду (панцирь с насечками), поэтому
              линию ей дают тоньше, чем микрофону рядом: при одинаковом stroke
              она читается пятном, а не иконкой той же толщины. */}
          <Turtle size={16} strokeWidth={1.6} /> {t('Медленно')}
        </button>
      )}

      {/* Выбор голоса — только у синтеза: у загруженной записи диктор один и
          менять его нечем. Компактный плеер стоит по десятку в ряд (буквы
          хангыля, словарь урока) — там кнопка была бы у каждого. */}
      {picker && usesTts && !ttsVoice && !compact && lang && (
        <VoicePicker lang={lang} accent={tone} soft={toneSoft} variant="icon" />
      )}

      {!hasSource && (
        <span style={{ fontSize: 12.5, color: 'var(--color-muted)' }}>{t('Аудио не задано')}</span>
      )}
    </div>
  )
}
