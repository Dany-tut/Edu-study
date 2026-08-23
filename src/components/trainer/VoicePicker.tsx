import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, Mic } from 'lucide-react'
import { useT } from '../../lib/i18n'
import type { VoiceRole } from '../../lib/speech'
import { hasVoiceFor, preferredVoice, setPreferredVoice, speak, voiceOptions } from '../../lib/speech'
import { useOverlayScroll, ScrollOverlays } from '../teacher/OverlayScroll'

// Выбор голоса — рядом с любой кнопкой «Послушать».
//
// ЗАЧЕМ ЭТО УЧЕНИКУ. Автовыбор угадывает диктора по имени, а имена в системах
// разные: где-то «Саманта», где-то «Google US English», где-то ни того, ни
// другого. Промах слышно сразу, а починить его было нечем — на весь язык
// оставался один голос, назначенный вслепую. Разница между дикторами на слух
// больше, чем всё остальное в озвучке вместе взятое, поэтому последнее слово
// оставляем уху ученика.
//
// ГДЕ ЖИВЁТ ВЫБОР. В localStorage на язык (см. lib/speech.ts), не в базе: голос
// зависит от того, что установлено В ЭТОЙ системе, и на другом устройстве имя
// из настроек ничего не значит. Ключ один на язык — поэтому выбранный здесь
// диктор читает ВСЁ на этом языке: и текст, и карточки, и разговорник, и слово
// в подсказке. Выбирать голос отдельно в каждом углу приложения не нужно и
// нельзя: «мужской в текстах, женский в карточках» — это не настройка, а
// рассогласование.
//
// ПОЧЕМУ ВЫПАДАЮЩИЙ СПИСОК, А НЕ РАСКРЫВАЮЩАЯСЯ ПОЛКА. Раскрытый прямо в потоке
// список отталкивал вниз всё, что под ним: в рейле читалки под голосом стоит
// словарь текста, и на открытии он уезжал за нижний край экрана. Дропдаун висит
// над страницей и ничего не двигает — как сортировка в строке управления.
//
// ПОЧЕМУ СРАЗУ ЗВУЧИТ. Список имён ничего не говорит на слух: «Ральф» и
// «Саманта» одинаково ничего не значат, пока не услышишь. Поэтому выбор строки
// не просто сохраняется, а тут же читает короткую фразу на этом языке.
//
// ЧТО В СПИСКЕ. Отобранные дикторы (см. VOICE_PICKS в lib/speech.ts): пара
// женских, пара мужских, детский. Подпись — не локаль сама по себе, а «кто
// говорит»: женский · en-GB. Выбирают ведь голос, а не строку каталога, и
// пройти одно и то же задание разными голосами — отдельное упражнение на слух.

/** Пробная фраза: короткая, ходовая и на изучаемом языке. */
const SAMPLE: Record<string, string> = {
  en: 'This is how the text will sound.',
  ru: 'Вот так будет звучать текст.',
  ko: '이렇게 들립니다.',
  ja: 'このように聞こえます。',
  pt: 'É assim que o texto vai soar.',
  es: 'Así va a sonar el texto.',
  fr: 'Voilà comment le texte va sonner.',
  de: 'So wird der Text klingen.',
  it: 'Ecco come suonerà il testo.',
  zh: '这就是朗读的声音。',
}

/** Подпись голоса: пол и возраст важнее имени — по ним и выбирают. */
const ROLE: Record<VoiceRole, string> = { f: 'женский', m: 'мужской', kid: 'детский' }

/**
 * Есть ли из чего выбирать: два диктора и больше.
 *
 * Нужен тому, кто рисует ВОКРУГ пикера — карточку рейла с заголовком: сам
 * пикер на одном голосе отдаёт null, и обёртка осталась бы пустой коробкой с
 * надписью «Озвучка». Своя подписка на voiceschanged здесь обязательна: в
 * Chrome список голосов приходит уже после первого рендера, и без неё карточка
 * не появилась бы до перезагрузки страницы.
 */
export function useVoiceChoice(lang?: string): boolean {
  const [ready, setReady] = useState(0)
  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return
    const bump = () => setReady(n => n + 1)
    speechSynthesis.addEventListener?.('voiceschanged', bump)
    return () => speechSynthesis.removeEventListener?.('voiceschanged', bump)
  }, [])
  void ready
  return voiceOptions(lang).length >= 2
}

/** Ширина меню: не уже этого даже под круглой кнопкой-микрофоном. */
const MENU_MIN = 232

/** Просвет между триггером и меню. */
const GAP = 6

/** Отступ от края окна — меню не должно упираться в него вплотную. */
const EDGE = 8

/** Предел высоты списка: дальше он листается внутри себя. */
const MENU_MAX_H = 340

export default function VoicePicker({ lang, accent, soft, variant = 'field' }: {
  lang: string
  accent: string
  soft: string
  /** `field` — поле во всю ширину рейла, `icon` — кнопка-микрофон в ряду с
   *  плеером. Отличается только триггер: список и поведение общие. */
  variant?: 'field' | 'icon'
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  // Меню привязано либо верхом к низу кнопки, либо низом к её верху: когда
  // места под кнопкой нет (рейл упирается в край окна), список раскрывается
  // вверх и растёт от кнопки, а не свисает с неё за экран.
  const [pos, setPos] = useState<
    { left: number; width: number; maxH: number; top?: number; bottom?: number } | null
  >(null)
  const [picked, setPicked] = useState(() => preferredVoice(lang))
  // Список голосов в Chrome приходит асинхронно: на первом рендере он пуст, и
  // без подписки на voiceschanged выбор так и остался бы пустым до перезагрузки.
  const [ready, setReady] = useState(0)
  // Полный список системных голосов: там, где дикторов несколько, он не нужен,
  // но если ни один из них не устраивает — пусть будет чем перебрать.
  const [all, setAll] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const { ref: scrollRef, thumb, onScroll, maskStyle } = useOverlayScroll()

  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return
    const bump = () => setReady(n => n + 1)
    speechSynthesis.addEventListener?.('voiceschanged', bump)
    return () => speechSynthesis.removeEventListener?.('voiceschanged', bump)
  }, [])

  useEffect(() => { setPicked(preferredVoice(lang)) }, [lang])

  // Закрытие: клик мимо, Escape, прокрутка. Меню висит фиксированной коробкой у
  // своей кнопки, и уехавшая под ним страница оторвала бы список от триггера.
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => {
      if (menu.current?.contains(e.target as Node)) return
      if (btn.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const scroll = (e: Event) => {
      if (menu.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    window.addEventListener('mousedown', down)
    window.addEventListener('keydown', key)
    window.addEventListener('scroll', scroll, true)
    return () => {
      window.removeEventListener('mousedown', down)
      window.removeEventListener('keydown', key)
      window.removeEventListener('scroll', scroll, true)
    }
  }, [open])

  const voices = voiceOptions(lang, all)
  const total = voiceOptions(lang, true).length
  void ready // список берём заново на каждый рендер, событие только будит его

  if (!hasVoiceFor(lang)) {
    // Кнопке-микрофону сказать об этом нечем, да и незачем: рядом с ней стоит
    // плеер, который в такой системе и сам молчит.
    if (variant === 'icon') return null
    return (
      <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-3)', marginTop: 10 }}>
        {t('В системе нет голоса для этого языка — браузеру нечем прочитать текст. Голос ставится в настройках системы: на Mac это «Универсальный доступ → Устная речь», на Windows — «Время и язык → Речь».')}
      </div>
    )
  }

  // Один голос на язык — выбирать не из чего, кнопка была бы шумом.
  if (voices.length < 2) return null

  const current = voices.find(v => v.voice.name === picked)

  function toggle() {
    const r = btn.current?.getBoundingClientRect()
    if (r) {
      const width = Math.max(variant === 'icon' ? MENU_MIN : r.width, MENU_MIN)
      // Меню шире кнопки-микрофона — вешаем его по правому краю, иначе оно
      // вылезает за рейл. Ниже экрана не пускаем: там оно недостижимо.
      const left = Math.min(
        Math.max(8, variant === 'icon' ? r.right - width : r.left),
        window.innerWidth - width - 8,
      )
      const below = window.innerHeight - r.bottom - GAP - EDGE
      const above = r.top - GAP - EDGE
      const up = below < 200 && above > below
      setPos(up
        ? { left, width, maxH: Math.min(MENU_MAX_H, above), bottom: window.innerHeight - r.top + GAP }
        : { left, width, maxH: Math.min(MENU_MAX_H, below), top: r.bottom + GAP })
    }
    setOpen(o => !o)
  }

  function choose(name: string) {
    setPicked(name)
    setPreferredVoice(lang, name)
    setOpen(false)
    // Имя ничего не говорит на слух — сразу читаем пробную фразу выбранным.
    speak(SAMPLE[lang.split('-')[0]] ?? SAMPLE.en, { lang, voiceName: name })
  }

  const rows = [
    { id: '', label: t('Автовыбор'), note: t('как сейчас') },
    ...voices.map(v => ({
      id: v.voice.name,
      label: v.label,
      note: v.role ? `${t(ROLE[v.role])} · ${v.voice.lang}` : v.voice.lang,
    })),
  ]

  return (
    <>
      {variant === 'icon' ? (
        <button
          ref={btn}
          onClick={toggle}
          aria-expanded={open}
          aria-label={t('Голос озвучки')}
          title={`${t('Голос')}: ${current?.label ?? t('автовыбор')}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 3, padding: '6px 8px', borderRadius: 999,
            cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            border: `1px solid ${open ? accent : 'var(--color-border-soft)'}`,
            background: open ? soft : 'transparent',
            color: open ? accent : 'var(--color-text-3)',
            transition: 'border-color 0.15s, color 0.15s',
          }}
        >
          <Mic size={13} />
          <ChevronDown size={11} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease' }} />
        </button>
      ) : (
        <button
          ref={btn}
          onClick={toggle}
          aria-expanded={open}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, width: '100%',
            padding: '7px 9px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
            border: '1px solid transparent', boxSizing: 'border-box',
            background: open ? soft : 'transparent',
            color: open ? accent : 'var(--color-text-2)', fontSize: 12.5, fontWeight: 600,
          }}
        >
          <Mic size={14} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t('Голос')}: {current?.label ?? t('автовыбор')}
          </span>
          <ChevronDown
            size={14}
            style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease' }}
          />
        </button>
      )}

      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={menu}
              // Выезжает со стороны кнопки: список, раскрытый вверх, и
              // появляться должен снизу вверх.
              initial={{ opacity: 0, y: pos.top !== undefined ? -6 : 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: pos.top !== undefined ? -6 : 6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed', left: pos.left, width: pos.width, zIndex: 9999,
                ...(pos.top !== undefined ? { top: pos.top } : { bottom: pos.bottom }),
                borderRadius: 14, background: 'var(--color-bg-2)', border: '1px solid var(--color-border)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.18)', overflow: 'hidden',
              }}
            >
              <ScrollOverlays thumb={thumb} />
              <div
                ref={scrollRef}
                onScroll={onScroll}
                className="no-scrollbar"
                style={{
                  maxHeight: pos.maxH, overflowY: 'auto', overscrollBehavior: 'contain',
                  padding: 6, position: 'relative', ...maskStyle,
                }}
              >
              {rows.map(r => {
                const on = r.id === picked
                return (
                  <button
                    key={r.id}
                    onClick={() => choose(r.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                      padding: '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', background: on ? soft : 'transparent',
                    }}
                    onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'var(--color-bg-5)' }}
                    onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 1 }}>
                      <span style={{
                        fontSize: 13, fontWeight: on ? 700 : 550,
                        color: on ? accent : 'var(--color-text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {r.label}
                      </span>
                      {/* Кто говорит — под именем и тише его: имя ученик не
                          знает, а «мужской» читает с одного взгляда. */}
                      <span style={{
                        fontSize: 11, fontWeight: 500, lineHeight: 1.3,
                        color: on ? accent : 'var(--color-text-3)', opacity: on ? 0.8 : 1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {r.note}
                      </span>
                    </span>
                    {on && <Check size={14} style={{ flexShrink: 0, color: accent }} />}
                  </button>
                )
              })}
              {!all && total > voices.length && (
                <button
                  onClick={() => setAll(true)}
                  style={{
                    marginTop: 2, padding: '7px 10px', width: '100%', textAlign: 'left',
                    border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 11.5, fontWeight: 600, color: 'var(--color-text-3)',
                  }}
                >
                  {t('Показать все голоса системы')} · {total}
                </button>
              )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
