// ─────────────────────────────────────────────────────────────────────────────
// ЗВУК В ПРОДУКТЕ — ОДНО ПРАВИЛО НА ВСЕ ЭКРАНЫ.
//
// ПОЧЕМУ ЭТОТ ФАЙЛ ВООБЩЕ ЕСТЬ. Кнопка озвучки завелась в каждом экране
// самостоятельно, и каждый раз вставала туда, где в тот момент было место:
// у слова — справа от записи, у карточки с рисунком — на уровне картинки, у
// буквы — внизу под значением, у фразы — в конце строки, у плитки — по центру,
// у карточки стопки — по нижнему краю. Экраны по отдельности выглядели
// нормально, а продукт целиком — как набор чужих друг другу приложений: ученик
// на каждом новом экране заново искал глазами, куда ткнуть, чтобы услышать.
//
// ПРАВИЛО. У звука ровно две роли, и у каждой одна геометрия.
//
//  1. ЗВУК-СТИМУЛ — звучащее И ЕСТЬ задание: диктант, «похожие звуки», эталон
//     для повтора, дорожка. Слушать надо раньше, чем отвечать, поэтому это
//     крупная залитая кнопка НАД содержимым, прижатая влево. Живёт в
//     AudioPlayer (variant='solid') и здесь не трогается.
//
//  2. ЗВУК-МЕТКА ОБЪЕКТА — звучит карточка, фраза, буква, строка: сам объект
//     на экране уже нарисован, звук — его свойство, а не отдельная работа.
//     Тогда КНОПКА — ВЕСЬ ОБЪЕКТ, а в его ПРАВОМ ВЕРХНЕМ УГЛУ стоит тихий
//     значок: он не претендует быть единственной целью, он говорит «тут
//     звучит». Ровно это и собрано в этом файле.
//
// Значок нарочно один на все объекты: в ряду из десяти карточек десять
// одинаковых углов читаются как один ряд, а десять разных мест — как десять
// разных правил.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react'
import { useT } from '../lib/i18n'
import { Volume2 } from 'lucide-react'
import { speak, speechMs, speechTarget, stopSpeech } from '../lib/speech'

/**
 * Ход одной озвучки: этого достаточно, чтобы нарисовать бегунок.
 * Экран, где звучащий объект всегда один (карточка стопки), держит только его;
 * ряду объектов нужен ещё и `id` — см. SpeakingState ниже.
 */
export interface SpeakingRun {
  run: number
  ms: number
  /**
   * Голос уже зазвучал. Между тапом и первым звуком движок берёт своё время
   * (сетевой голос — до секунды), и бегунок, пущенный по тапу, к началу слова
   * оказывается на середине. До звука показываем пустую пульсирующую дорожку.
   */
  live?: boolean
  /**
   * Слово смолкло. Длительность синтеза известна лишь прикидкой, поэтому линию
   * по факту окончания доводим до края, а не бросаем на середине.
   */
  done?: boolean
}

/** То же самое в ряду объектов: `id` говорит, ЧЕЙ звук сейчас идёт. */
export interface SpeakingState extends SpeakingRun {
  id: string
}

/**
 * Озвучка ряда объектов: карточек, фраз, строк, плиток.
 *
 * Одна на весь ряд, а не по одной на объект: говорит всегда что-то одно, и
 * второй тап обязан прервать первый, а не зазвучать поверх него.
 */
export function useSpeakOne() {
  const [speaking, setSpeaking] = useState<SpeakingState | null>(null)
  const runRef = useRef(0)
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Состояние читается внутри say() — из замыкания оно приходило бы устаревшим
  // на быстрых тапах (два тапа в одном рендере).
  const stateRef = useRef<SpeakingState | null>(null)
  stateRef.current = speaking

  // Речь не должна продолжаться на следующем экране.
  useEffect(() => () => {
    if (runRef.current > 0) stopSpeech()
    if (hideRef.current) clearTimeout(hideRef.current)
  }, [])

  const stop = useCallback(() => {
    stopSpeech()
    runRef.current++
    if (hideRef.current) clearTimeout(hideRef.current)
    setSpeaking(null)
  }, [])

  /**
   * Сказать текст от имени объекта `id`. Повторный вызов по говорящему объекту
   * — это «замолчи»: тот же жест выключает то, что сам включил.
   */
  const say = useCallback((id: string, raw: string, lang?: string, opts?: { voiceName?: string }) => {
    // Строка может быть заданием вокруг слова («Как звучит 있어요?»): голос
    // изучаемого языка читает её целиком, и русская обёртка звучит вслух с
    // корейским акцентом. В озвучку идёт только материал — см. speechTarget.
    const text = speechTarget(raw, lang)
    if (!text.trim()) return
    const cur = stateRef.current
    if (cur?.id === id && !cur.done) { stop(); return }
    // Номер запуска: onEnd прошлой озвучки приходит уже после старта новой и
    // без сверки погасил бы индикатор того, что только что зазвучало.
    const run = ++runRef.current
    const finish = () => {
      setSpeaking(s => (s?.run === run ? { ...s, done: true } : s))
      if (hideRef.current) clearTimeout(hideRef.current)
      hideRef.current = setTimeout(() => {
        setSpeaking(s => (s?.run === run ? null : s))
      }, 260)
    }
    if (hideRef.current) clearTimeout(hideRef.current)
    setSpeaking({ id, run, ms: speechMs(text) })
    speak(text, {
      lang,
      voiceName: opts?.voiceName,
      onStart: () => setSpeaking(s => (s?.run === run ? { ...s, live: true } : s)),
      onEnd: finish,
    })
  }, [stop])

  return { speaking, say, stop }
}

/**
 * Значок звука в правом верхнем углу объекта.
 *
 * По умолчанию это НЕ кнопка (`aria-hidden`): кнопка — сам объект, а значок
 * лишь помечает, что объект звучит. Там, где тап по объекту уже занят другим
 * действием (карточка стопки переворачивается), значок берёт `onClick` и
 * становится кнопкой сам — геометрия при этом та же.
 */
export function SoundBadge({
  accent, soft, on = false, onClick, label, size = 26, inset = 10, style,
}: {
  accent: string
  /** Мягкая заливка того же цвета — фон значка в покое. */
  soft: string
  /** Объект звучит прямо сейчас: значок заливается сплошным. */
  on?: boolean
  /** Задан — значок сам кнопка (тап по объекту занят другим действием). */
  onClick?: (e: React.MouseEvent) => void
  label?: string
  size?: number
  /** Отступ от углов объекта. */
  inset?: number
  style?: React.CSSProperties
}) {
  const t = useT()
  const common: React.CSSProperties = {
    position: 'absolute', top: inset, right: inset,
    width: size, height: size, borderRadius: '50%',
    display: 'grid', placeItems: 'center',
    background: on ? accent : soft,
    color: on ? '#fff' : accent,
    // Звучащий объект держит значок в полную силу и без курсора.
    opacity: on ? 1 : undefined,
    ...style,
  }
  const icon = <Volume2 size={Math.round(size * 0.5)} />
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label ? t(label) : undefined}
        className="sound-badge sound-badge--btn"
        style={{ ...common, border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
      >
        {icon}
      </button>
    )
  }
  return <span aria-hidden className="sound-badge" style={common}>{icon}</span>
}

/**
 * Бегунок озвучки по нижнему краю объекта. До первого звука — пустая
 * пульсирующая дорожка: тап уже принят, движок ещё запрягает.
 * Анимация чисто CSS: requestAnimationFrame в превью не срабатывает.
 */
export function SoundTrack({ state, accent, soft }: {
  state: SpeakingRun
  accent: string
  soft: string
}) {
  return (
    <span
      aria-hidden
      className={state.live || state.done ? undefined : 'vocab-speak-wait'}
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 3,
        background: soft, overflow: 'hidden',
        opacity: state.done ? 0 : 1, transition: 'opacity 240ms linear',
      }}
    >
      {state.live && (
        <span
          key={state.run}
          className={`vocab-speak-fill${state.done ? ' vocab-speak-fill--done' : ''}`}
          style={{ background: accent, animationDuration: `${state.ms}ms` }}
        />
      )}
    </span>
  )
}
