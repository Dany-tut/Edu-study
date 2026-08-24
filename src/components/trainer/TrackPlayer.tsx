// ─────────────────────────────────────────────────────────────────────────────
// TrackPlayer — плеер записи, закреплённый внизу экрана (ТЕЛЕФОН).
//
// ЗАЧЕМ. На узком экране рейл тренажёра уезжает в шторку «Фильтры» целиком, и
// вместе с ним туда уходила кнопка «Играть». Получалось, что запись в задании
// на слух — то единственное, ради чего этот экран открыли, — включалась через
// кнопку фильтров: два тапа и шторка поверх вопросов на каждое «переслушать».
// Плеер обязан быть на экране всегда, у большого пальца, как в любом
// проигрывателе.
//
// ПРОМОТКА ЧЕСТНАЯ РОВНО НАСТОЛЬКО, НАСКОЛЬКО ПОЗВОЛЯЕТ ИСТОЧНИК.
// Запись задания — либо файл (audioUrl), либо браузерный синтез по тексту
// (ttsText, весь языковой тренажёр). У синтеза НЕТ таймлайна: узнать «сейчас
// 0:41» и прыгнуть на 0:52 нечем, никакого currentTime он не отдаёт, а
// единственная точка, куда можно вернуться, — начало реплики. Поэтому:
//
//   файл   → шкала во времени, подписи в секундах, бегунок ведёт куда угодно;
//   синтез → шкала СЕГМЕНТАМИ ПО РЕПЛИКАМ, подпись «реплика 3 из 7», бегунок
//            липнет к границам реплик, а секунды не показываются вовсе.
//
// Ширина сегмента у синтеза — оценка длительности (speechMs, по знакам и
// письменности), поэтому реплики выглядят разными, как в жизни. Но это оценка,
// и подписывать её секундами было бы враньём: цифра на экране обязана быть
// либо правдой, либо не цифрой.
//
// МАГНИТ. Палец на бегунке утолщает полосу и увеличивает точку (под пальцем
// её не видно, поэтому точка выходит из-под него кольцом), а сама точка липнет
// к ближайшей границе реплики в пределах SNAP_PX. Прилипание отзывается щелчком
// (tactile) — иначе на глаз не понять, попал ты в границу или встал рядом.
//
// БУРГЕР. Скорость и список отрывков живут в шторке, а не в строке: строка
// плеера — три мишени (играть, вести, настройки), и таблетки скорости рядом с
// бегунком отнимали у него ширину, то есть точность промотки.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Menu } from 'lucide-react'
import { Volume2 } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { speak, stopSpeech, speechUnits, speechMs } from '../../lib/speech'
import { getMediaUrl } from '../../lib/mediaStorage'
import { useBottomSafe } from '../../lib/bottomSafe'
import { useNavCollapse } from '../../lib/useNavCollapse'
import { tactile } from '../../lib/feedback'
import MobileSheet from '../MobileSheet'
import VoicePicker from './VoicePicker'

/** Радиус магнита в пикселях: ближе этого к границе реплики — прилипаем. */
const SNAP_PX = 14

/** Шаг опроса позиции. rAF в превью не работает (см. память проекта), да и
 *  сотни кадров в секунду бегунку не нужны — десять хватает с запасом. */
const TICK = 100

/** Пауза между репликами под каждый темп: у спокойного она и есть половина
 *  «медленно» — время осознать сказанное, а не только растянутый голос. */
const TTS_RATES = [
  { id: 'calm', label: 'Спокойно', rate: 0.8, gap: 650 },
  { id: 'normal', label: 'Обычно', rate: 1, gap: 160 },
  { id: 'fast', label: 'Быстро', rate: 1.15, gap: 120 },
] as const

/** У файла ступени настоящие: запись не «плывёт» до 0.5, а 1.25 ещё разборчива. */
const FILE_RATES = [0.5, 0.75, 1, 1.25] as const

type TtsRateId = (typeof TTS_RATES)[number]['id']

function mmss(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Короткая шапка реплики для списка отрывков. */
function head(line: string): string {
  const clean = line.trim()
  return clean.length > 28 ? `${clean.slice(0, 27)}…` : clean
}

export default function TrackPlayer({
  ttsText,
  audioUrl,
  lang,
  accent,
  soft,
  title,
  inline,
}: {
  /** Текст для синтеза — основной случай тренажёра. */
  ttsText?: string
  /** Путь в бакете task-media, если запись загружена файлом. */
  audioUrl?: string
  lang?: string
  accent: string
  soft: string
  /** Название записи — шапка шторки настроек. */
  title?: string
  /**
   * Только строка плеера, без собственного fixed-слоя: позицией управляет
   * вызывающий. Так плеер встаёт В РЯД дока управления (слева от круга
   * «Фильтры») и растягивается, когда док прячется при листании.
   */
  inline?: boolean
}) {
  const t = useT()
  const bottomSafe = useBottomSafe()
  const collapsed = useNavCollapse()
  const usesTts = !audioUrl && !!ttsText

  const [menu, setMenu] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [ms, setMs] = useState(0)
  const [ttsRate, setTtsRate] = useState<TtsRateId>('normal')
  const [fileRate, setFileRate] = useState<number>(1)
  const [line, setLine] = useState(0)

  // Перетаскивание: позиция пальца отдельно от позиции звука — пока ведут,
  // бегунок слушается пальца, а не голоса.
  const [drag, setDrag] = useState<{ ms: number; line: number; snapped: boolean } | null>(null)
  // Жест ведётся — отдельным ref'ом от состояния: порядок pointerup и
  // lostpointercapture у браузеров разный, и если снимать жест по одному
  // только состоянию, то там, где захват теряется ПЕРЕД отпусканием, промотка
  // тихо не срабатывала бы.
  const dragging = useRef(false)
  const trackRef = useRef<HTMLDivElement>(null)

  // ─── Разметка шкалы ────────────────────────────────────────────────────────

  // Реплики и их оценочные длительности. Пауза входит в вес сегмента: между
  // строками диалога она слышна, и без неё бегунок обгонял голос к концу.
  // Предложениями, а не строками: половина записей на слух — монолог в одну
  // строку, и по репликам такая запись неделима (см. speechUnits).
  const lines = useMemo(() => (usesTts ? speechUnits(ttsText ?? '', 'sentence') : []), [usesTts, ttsText])
  const gap = TTS_RATES.find(r => r.id === ttsRate)?.gap ?? 160
  const spans = useMemo(() => {
    const out: { at: number; len: number }[] = []
    let acc = 0
    for (const l of lines) {
      const len = speechMs(l) + gap
      out.push({ at: acc, len })
      acc += len
    }
    return out
  }, [lines, gap])
  const ttsTotal = spans.length ? spans[spans.length - 1].at + spans[spans.length - 1].len : 0

  // ─── Файл ──────────────────────────────────────────────────────────────────

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [dur, setDur] = useState(0)
  useEffect(() => {
    let alive = true
    if (!audioUrl) { setSrc(null); return }
    getMediaUrl(audioUrl).then(u => { if (alive) setSrc(u) })
    return () => { alive = false }
  }, [audioUrl])

  const total = usesTts ? ttsTotal : dur * 1000

  // ─── Ход звука ─────────────────────────────────────────────────────────────

  // Синтез не сообщает, где он внутри реплики, — только когда реплика
  // зазвучала (onLine). Между этими сигналами бегунок идёт по оценке, но
  // упирается в конец своего сегмента: обгонять голос ему нельзя, а сигнал о
  // следующей реплике всё равно поставит его на место.
  const at = useRef<{ base: number; len: number; t0: number } | null>(null)
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      if (usesTts) {
        const a = at.current
        if (!a) return
        const rate = TTS_RATES.find(r => r.id === ttsRate)?.rate ?? 1
        setMs(a.base + Math.min(a.len, (Date.now() - a.t0) * rate))
      } else {
        const el = audioRef.current
        if (el) setMs(el.currentTime * 1000)
      }
    }, TICK)
    return () => window.clearInterval(id)
  }, [playing, usesTts, ttsRate])

  // Речь не должна продолжаться на следующем экране.
  useEffect(() => () => { if (usesTts) stopSpeech() }, [usesTts])

  function say(from: number, rateId: TtsRateId = ttsRate) {
    const conf = TTS_RATES.find(r => r.id === rateId) ?? TTS_RATES[1]
    setPlaying(true)
    setLine(from)
    setMs(spans[from]?.at ?? 0)
    at.current = { base: spans[from]?.at ?? 0, len: spans[from]?.len ?? 0, t0: Date.now() }
    speak(ttsText ?? '', {
      lang,
      from,
      unit: 'sentence',
      rate: conf.rate,
      gap: conf.gap,
      onLine: idx => {
        setLine(idx)
        at.current = { base: spans[idx]?.at ?? 0, len: spans[idx]?.len ?? 0, t0: Date.now() }
      },
      onEnd: done => {
        setPlaying(false)
        at.current = null
        if (done) { setMs(0); setLine(0) }
      },
    })
  }

  function toggle() {
    if (usesTts) {
      if (playing) { stopSpeech(); setPlaying(false); at.current = null }
      else say(line)
      return
    }
    const el = audioRef.current
    if (!el) return
    if (playing) el.pause()
    else { el.playbackRate = fileRate; void el.play() }
  }

  /** Играть с этой реплики (список отрывков и отпущенный бегунок). */
  function goLine(idx: number) {
    if (usesTts) { say(idx); return }
    const el = audioRef.current
    if (!el) return
    el.currentTime = 0
    el.playbackRate = fileRate
    void el.play()
  }

  // ─── Бегунок ───────────────────────────────────────────────────────────────

  /** Позиция пальца → положение на шкале, с магнитом к границам реплик. */
  function resolve(clientX: number): { ms: number; line: number; snapped: boolean } {
    const el = trackRef.current
    if (!el || !total) return { ms: 0, line: 0, snapped: false }
    const box = el.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (clientX - box.left) / box.width))
    const raw = frac * total
    if (!usesTts) return { ms: raw, line: 0, snapped: false }
    // Ближайшая граница реплики. Считаем в пикселях, а не в миллисекундах:
    // магнит должен ощущаться одинаково у короткой записи и у длинной.
    let best = 0
    let bestPx = Infinity
    spans.forEach((s, i) => {
      const px = Math.abs((s.at / total) * box.width - (clientX - box.left))
      if (px < bestPx) { bestPx = px; best = i }
    })
    if (bestPx <= SNAP_PX) return { ms: spans[best].at, line: best, snapped: true }
    const idx = Math.max(0, spans.findIndex((s, i) => raw >= s.at && (i === spans.length - 1 || raw < spans[i + 1].at)))
    return { ms: raw, line: idx, snapped: false }
  }

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!total) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
    const next = resolve(e.clientX)
    setDrag(next)
    if (next.snapped) tactile()
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current || !drag) return
    const next = resolve(e.clientX)
    // Щелчок ровно в момент прилипания, а не на каждом кадре внутри границы.
    if (next.snapped && (!drag.snapped || drag.line !== next.line)) tactile()
    setDrag(next)
  }

  function onUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    dragging.current = false
    const next = resolve(e.clientX)
    setDrag(null)
    if (usesTts) {
      setMs(spans[next.line]?.at ?? 0)
      setLine(next.line)
      say(next.line)
      return
    }
    const el = audioRef.current
    if (el) {
      el.currentTime = next.ms / 1000
      setMs(next.ms)
      el.playbackRate = fileRate
      void el.play()
    }
  }

  const shown = drag?.ms ?? ms
  const frac = total ? Math.min(1, Math.max(0, shown / total)) : 0
  const hint = drag ? (usesTts
    ? `${t('реплика')} ${drag.line + 1} ${t('из')} ${lines.length}`
    : mmss(drag.ms / 1000)) : null

  const held = !!drag
  const barH = held ? 7 : 3
  const dotSize = held ? 18 : 9

  return (
    <>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={src ?? undefined}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setMs(0) }}
          onLoadedMetadata={e => setDur(e.currentTarget.duration || 0)}
        />
      )}

      {/* Обычный режим: плеер стоит НАД доком управления и, в отличие от него,
          при листании не уезжает: док — контекстные кнопки, которые можно и
          спрятать, а звук — то, ради чего экран открыт. Когда док прячется,
          плеер съезжает на его место, чтобы не висеть посреди экрана.
          Встроенный (inline): позицией владеет док тренажёра — плеер живёт в
          его ряду слева от круга «Фильтры» и растягивается силами флекса. */}
      <motion.div
        initial={false}
        animate={inline ? undefined : { marginBottom: collapsed ? 74 : 138 }}
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        style={inline ? { minWidth: 0, pointerEvents: 'auto' } : {
          position: 'fixed', left: 0, right: 0, bottom: bottomSafe,
          zIndex: 41, padding: '0 16px', pointerEvents: 'none',
        }}
      >
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 12px', borderRadius: 22,
            background: 'rgba(var(--glass-rgb), 0.86)',
            backdropFilter: 'blur(28px) saturate(200%)',
            WebkitBackdropFilter: 'blur(28px) saturate(200%)',
            border: '1px solid var(--color-border-glass)',
            boxShadow: 'var(--shadow-pill)',
          }}
        >
          <button
            onClick={toggle}
            aria-label={playing ? t('Пауза') : t('Играть')}
            style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0, border: 'none',
              display: 'grid', placeItems: 'center', cursor: 'pointer',
              background: accent, color: '#fff',
              boxShadow: `0 4px 12px -3px color-mix(in srgb, ${accent} 55%, transparent)`,
            }}
          >
            {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" style={{ marginLeft: 2 }} />}
          </button>

          {/* Мишень бегунка выше самой полосы: тянуть трёхпиксельную линию
              пальцем невозможно, поэтому жест ловит вся полоса-подложка. */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              ref={trackRef}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              // Палец «потерялся» — жест обрывают и система (звонок, шторка
              // уведомлений), и браузер, отобрав захват. Без этих двух строк
              // бегунок оставался в состоянии перетаскивания навсегда: полоса
              // толстая, точка большая, а звук идёт своим чередом.
              onPointerCancel={() => { dragging.current = false; setDrag(null) }}
              onLostPointerCapture={() => setDrag(null)}
              role="slider"
              aria-label={t('Промотка записи')}
              aria-valuemin={0}
              aria-valuemax={usesTts ? Math.max(1, lines.length) : Math.round(dur)}
              aria-valuenow={usesTts ? line + 1 : Math.round(shown / 1000)}
              style={{
                position: 'relative', height: 22, display: 'flex', alignItems: 'center',
                touchAction: 'none', cursor: 'pointer',
              }}
            >
              {hint && (
                <span style={{
                  position: 'absolute', left: `${frac * 100}%`, bottom: 20, transform: 'translateX(-50%)',
                  padding: '3px 8px', borderRadius: 8, whiteSpace: 'nowrap', pointerEvents: 'none',
                  fontSize: 11, fontWeight: 700, background: accent, color: '#fff',
                }}>
                  {hint}
                </span>
              )}
              <div style={{
                position: 'relative', width: '100%', height: barH, borderRadius: 4,
                background: 'var(--color-border-soft)',
                transition: 'height .14s ease',
              }}>
                <div style={{
                  position: 'absolute', inset: 0, right: `${100 - frac * 100}%`,
                  background: accent, borderRadius: 4,
                }} />
                {/* Границы реплик проступают только под пальцем: в покое
                    десяток рисок на трёхпиксельной полосе — рябь, а не шкала. */}
                {held && usesTts && spans.slice(1).map(s => (
                  <div key={s.at} style={{
                    position: 'absolute', top: 0, bottom: 0, left: `${(s.at / total) * 100}%`,
                    width: 1, background: 'rgba(var(--glass-rgb), 0.9)',
                  }} />
                ))}
                <div style={{
                  position: 'absolute', top: '50%', left: `${frac * 100}%`,
                  width: dotSize, height: dotSize, marginTop: -dotSize / 2, marginLeft: -dotSize / 2,
                  borderRadius: '50%', background: accent,
                  border: held ? '2.5px solid rgba(var(--glass-rgb), 1)' : 'none',
                  transition: 'width .14s ease, height .14s ease, margin .14s ease',
                }} />
              </div>
            </div>
            {/* Подпись — правда об источнике: у файла секунды, у синтеза номер
                реплики. Оценку длительности синтеза секундами не подписываем. */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginTop: 3,
              fontSize: 10.5, color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums',
            }}>
              {usesTts ? (
                // Пока ведут — подпись про ТУ реплику, куда ведут: иначе под
                // бегунком, стоящим на третьей, написано «реплика 1».
                <span>{`${t('реплика')} ${(drag?.line ?? line) + 1} ${t('из')} ${lines.length}`}</span>
              ) : (
                <>
                  <span>{mmss(shown / 1000)}</span>
                  <span>{mmss(dur)}</span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => setMenu(true)}
            aria-label={t('Настройки записи')}
            style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              display: 'grid', placeItems: 'center', cursor: 'pointer',
              border: '1px solid var(--color-border-soft)',
              background: 'var(--color-bg-2)', color: 'var(--color-text-2)',
            }}
          >
            <Menu size={17} />
          </button>
        </div>
      </motion.div>

      <MobileSheet open={menu} onClose={() => setMenu(false)} title={title ?? t('Запись')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--color-muted)', marginBottom: 7 }}>{t('Скорость')}</div>
            {/* У синтеза ступени названы словами, а не числами: 0.6 у
                браузерного голоса — уже не речь, и обещать «половину скорости»
                там нечем. Цифры остаются файлу, где они правда. */}
            <div style={{ display: 'flex', gap: 6 }}>
              {usesTts
                ? TTS_RATES.map(r => {
                    const on = r.id === ttsRate
                    return (
                      <button
                        key={r.id}
                        onClick={() => { setTtsRate(r.id); if (playing) say(line, r.id) }}
                        style={rateStyle(on, accent, soft)}
                      >
                        {t(r.label)}
                      </button>
                    )
                  })
                : FILE_RATES.map(r => {
                    const on = r === fileRate
                    return (
                      <button
                        key={r}
                        onClick={() => {
                          setFileRate(r)
                          if (audioRef.current) audioRef.current.playbackRate = r
                        }}
                        style={rateStyle(on, accent, soft)}
                      >
                        {`${r}×`}
                      </button>
                    )
                  })}
            </div>
          </div>

          {usesTts && lines.length > 1 && (
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--color-muted)', marginBottom: 7 }}>{t('Отрывок')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {lines.map((l, i) => {
                  const on = i === line
                  return (
                    <button
                      key={`${i}-${l}`}
                      onClick={() => { goLine(i); setMenu(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                        padding: '9px 11px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                        border: on ? `1px solid ${accent}` : '1px solid var(--color-border-soft)',
                        background: on ? soft : 'var(--color-bg-2)',
                        color: on ? accent : 'var(--color-text)',
                        fontSize: 13, fontWeight: on ? 700 : 500,
                      }}
                    >
                      <span style={{ fontSize: 11, color: 'var(--color-muted)', minWidth: 14 }}>{i + 1}</span>
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {head(l)}
                      </span>
                      {on && playing && <Volume2 size={14} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Голос — здесь же: мысль «не тот диктор» приходит в момент
              прослушивания, а из строки плеера кнопку убрали ради бегунка. */}
          {usesTts && lang && (
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--color-muted)', marginBottom: 7 }}>{t('Голос')}</div>
              <VoicePicker lang={lang} accent={accent} soft={soft} />
            </div>
          )}
        </div>
      </MobileSheet>
    </>
  )
}

function rateStyle(on: boolean, accent: string, soft: string): React.CSSProperties {
  return {
    flex: 1, padding: '8px 0', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 12.5, fontWeight: on ? 700 : 600,
    border: on ? `1px solid ${accent}` : '1px solid var(--color-border-soft)',
    background: on ? soft : 'var(--color-bg-2)',
    color: on ? accent : 'var(--color-text-2)',
  }
}
