import { SubjectMark } from './icons/SubjectMark'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, RotateCcw } from './icons/appIcons'
import FadeText from './FadeText'
import { TINT_SWATCHES } from '../lib/courseTint'
import { tactile } from '../lib/feedback'
import { useT } from '../lib/i18n'
import './subjectColorPicker.css'

// ─────────────────────────────────────────────────────────────────────────────
// Выбор цвета предмета. Один компонент на два кабинета: учитель задаёт им базу
// своим предметам, ученик — свою правку поверх неё. Разница только в подписи
// сброса и в том, что подставляет `baseColor`.
//
// Сетка карточек (4/3/2 в ряд по ширине контейнера), а не список строк: у кого
// предметов много, список из 56-пиксельных строк уезжал на пол-экрана. Клик по
// карточке — палитра поверх, клик по цвету — сразу применяется и закрывается.
//
// Палитра закрытая (TINT_SWATCHES), пипетки нет: цвет отсюда становится и
// текстом на белом, и заливкой под белыми буквами, и подложкой в тёмной теме —
// произвольный hex ломает какой-нибудь из трёх видов почти всегда.
//
// Палитра — в портале с position:fixed: у ученика сетка живёт в прокручиваемой
// шторке/окне, и абсолютный попап нижнего ряда срезался бы её overflow. Место
// считаем по окну: снизу, если влезает, иначе сверху; по горизонтали — в окно.
// ─────────────────────────────────────────────────────────────────────────────

export interface ColorSubject {
  /** id реестра предметов — он же ключ карты цветов. */
  id: string
  name: string
  icon: string
}

const GAP = 8
const EDGE = 8
const SWATCH = 34
const POP_PAD = 10
const POP_W = SWATCH * 6 + 6 * 5 + POP_PAD * 2

export default function SubjectColorPicker({
  subjects,
  value,
  baseColor,
  onChange,
  resetLabel,
  onOpenChange,
}: {
  subjects: ColorSubject[]
  /** Правки ЭТОГО слоя: id предмета → hex. Пусто — предмет живёт цветом снизу. */
  value: Record<string, string>
  /** Цвет нижнего слоя: у учителя — реестр, у ученика — цвет учителя. */
  baseColor: (subjectId: string) => string
  onChange: (subjectId: string, hex: string | null) => void
  /** «Как в приложении» у учителя, «Как у преподавателя» у ученика. */
  resetLabel: string
  /** Открытая палитра — по ней превью в настройках понимает, чей цвет показывать. */
  onOpenChange?: (subjectId: string | null) => void
}) {
  const t = useT()
  const [openId, setOpenId] = useState<string | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null)
  const cardRefs = useRef(new Map<string, HTMLButtonElement>())
  const popRef = useRef<HTMLDivElement>(null)
  const onOpenChangeRef = useRef(onOpenChange)
  onOpenChangeRef.current = onOpenChange

  const setOpen = (id: string | null) => {
    setOpenId(id)
    if (!id) setPos(null)
    onOpenChangeRef.current?.(id)
  }

  const openSubject = subjects.find(s => s.id === openId)
  const openOwn = openSubject ? value[openSubject.id] : undefined
  const openCurrent = openSubject ? (openOwn ?? baseColor(openSubject.id)) : ''

  // Место палитры — после рендера, по её настоящей высоте (кнопка сброса есть
  // не всегда). До расчёта палитра невидима, чтобы не мигнуть в углу.
  useLayoutEffect(() => {
    if (!openId) return
    const card = cardRefs.current.get(openId)
    const pop = popRef.current
    if (!card || !pop) return
    const r = card.getBoundingClientRect()
    const h = pop.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight
    const below = r.bottom + GAP + h <= vh - EDGE || r.top - GAP - h < EDGE
    const top = below ? Math.min(r.bottom + GAP, vh - EDGE - h) : r.top - GAP - h
    const left = Math.max(EDGE, Math.min(r.left, vw - EDGE - POP_W))
    setPos(p => (p && p.left === left && p.top === top && p.above === !below ? p : { left, top: Math.max(EDGE, top), above: !below }))
  }, [openId, openOwn])

  // Клик мимо, Esc, прокрутка и смена размера окна закрывают палитру. Esc
  // ловим на захвате окна раньше шторки — иначе он закрыл бы всю шторку.
  useEffect(() => {
    if (!openId) return
    const onDown = (e: PointerEvent) => {
      const el = e.target as Element | null
      if (popRef.current?.contains(el)) return
      // Карточки сами переключают палитру своим кликом.
      if (el?.closest?.('[data-subject-color-card]')) return
      setOpen(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault(); e.stopImmediatePropagation()
      const card = cardRefs.current.get(openId)
      setOpen(null)
      card?.focus()
    }
    const onScroll = (e: Event) => { if (!popRef.current?.contains(e.target as Node)) setOpen(null) }
    const onResize = () => setOpen(null)
    document.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [openId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Компонент уходит с экрана — превью не должно остаться на чужом предмете.
  useEffect(() => () => { onOpenChangeRef.current?.(null) }, [])

  if (!subjects.length) return null

  const pick = (subjectId: string, hex: string | null) => {
    tactile()
    // Выбор цвета, совпадающего с нижним слоем, — то же, что сброс: иначе
    // «свой» висел бы на цвете, который и так был.
    const same = hex && hex.toLowerCase() === baseColor(subjectId).toLowerCase()
    onChange(subjectId, same ? null : hex)
    const card = cardRefs.current.get(subjectId)
    setOpen(null)
    card?.focus({ preventScroll: true })
  }

  return (
    <div className="subject-color-grid-wrap">
      <div className="subject-color-grid">
        {subjects.map(s => {
          const own = value[s.id]
          const current = own ?? baseColor(s.id)
          const open = openId === s.id
          return (
            <motion.button data-hover="layer"
              key={s.id}
              ref={el => { if (el) cardRefs.current.set(s.id, el); else cardRefs.current.delete(s.id) }}
              type="button"
              data-subject-color-card=""
              whileTap={{ scale: 0.97 }}
              onClick={() => { tactile(); setOpen(open ? null : s.id) }}
              aria-expanded={open}
              aria-haspopup="dialog"
              className="subject-color-card"
              style={{
                background: `color-mix(in srgb, ${current} 14%, var(--color-bg-3))`,
                borderColor: open ? current : `color-mix(in srgb, ${current} 22%, transparent)`,
                boxShadow: open ? `0 0 0 1px ${current}` : 'none',
              }}
            >
              <span className="subject-color-card__top">
                <span className="subject-color-card__mark" style={{ background: current }} aria-hidden>
                  <SubjectMark subject={s.id} size={18} />
                </span>
                {own && <span className="subject-color-card__own">{t('свой')}</span>}
              </span>
              <FadeText style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.25, color: 'var(--color-text)', textAlign: 'left' }}>
                {s.name}
              </FadeText>
            </motion.button>
          )
        })}
      </div>

      {createPortal(
        <AnimatePresence>
          {openSubject && (
            <motion.div
              key={openSubject.id}
              ref={popRef}
              role="dialog"
              aria-label={openSubject.name}
              initial={{ opacity: 0, scale: 0.96, y: pos?.above ? 4 : -4 }}
              animate={{ opacity: pos ? 1 : 0, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              className="subject-color-pop"
              style={{
                left: pos?.left ?? 0, top: pos?.top ?? 0, width: POP_W, padding: POP_PAD,
                visibility: pos ? 'visible' : 'hidden',
                transformOrigin: pos?.above ? 'bottom left' : 'top left',
              }}
            >
              <div className="subject-color-pop__swatches">
                {TINT_SWATCHES.map(hex => {
                  const active = openCurrent.toLowerCase() === hex.toLowerCase()
                  return (
                    <motion.button data-hover="layer"
                      key={hex}
                      type="button"
                      whileTap={{ scale: 0.88 }}
                      onClick={() => pick(openSubject.id, hex)}
                      className="subject-color-pop__swatch"
                      style={{
                        width: SWATCH, height: SWATCH, background: hex,
                        boxShadow: active ? `0 0 0 2px var(--color-bg-2), 0 0 0 4px ${hex}` : 'none',
                      }}
                      aria-label={hex}
                      aria-pressed={active}
                    >
                      {active && <Check size={16} strokeWidth={2.5} color="#fff" />}
                    </motion.button>
                  )
                })}
              </div>
              {openOwn && (
                <motion.button data-hover="layer"
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => pick(openSubject.id, null)}
                  className="subject-color-pop__reset"
                >
                  <RotateCcw size={14} strokeWidth={2} />
                  {resetLabel}
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
