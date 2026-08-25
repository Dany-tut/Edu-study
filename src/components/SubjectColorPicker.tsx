import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, RotateCcw } from 'lucide-react'
import { TINT_SWATCHES } from '../lib/courseTint'
import { tactile } from '../lib/feedback'
import { useT } from '../lib/i18n'

// ─────────────────────────────────────────────────────────────────────────────
// Выбор цвета предмета. Один компонент на два кабинета: учитель задаёт им базу
// своим предметам, ученик — свою правку поверх неё. Разница только в подписи
// сброса и в том, что подставляет `baseColor`.
//
// Палитра закрытая (TINT_SWATCHES), пипетки нет: цвет отсюда становится и
// текстом на белом, и заливкой под белыми буквами, и подложкой в тёмной теме —
// произвольный hex ломает какой-нибудь из трёх видов почти всегда.
// ─────────────────────────────────────────────────────────────────────────────

export interface ColorSubject {
  /** id реестра предметов — он же ключ карты цветов. */
  id: string
  name: string
  icon: string
}

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
  /** Раскрытая строка — по ней превью в настройках понимает, чей цвет показывать. */
  onOpenChange?: (subjectId: string | null) => void
}) {
  const t = useT()
  const [openId, setOpenId] = useState<string | null>(null)

  if (!subjects.length) return null

  return (
    <div style={{ borderRadius: 18, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', overflow: 'hidden' }}>
      {subjects.map((s, i) => {
        const own = value[s.id]
        const current = own ?? baseColor(s.id)
        const open = openId === s.id
        return (
          <div key={s.id} style={{ borderTop: i ? '1px solid var(--color-border-soft)' : 'none' }}>
            <motion.button
              whileTap={{ scale: 0.99 }}
              onClick={() => { tactile(); const next = open ? null : s.id; setOpenId(next); onOpenChange?.(next) }}
              className="flex items-center justify-between cursor-pointer"
              style={{ width: '100%', height: 56, padding: '0 15px', background: 'transparent', border: 'none' }}
              aria-expanded={open}
            >
              <span className="flex items-center" style={{ gap: 10, fontSize: 15, fontWeight: 550, color: 'var(--color-text)' }}>
                <span style={{ fontSize: 17 }} aria-hidden>{s.icon}</span>
                {s.name}
              </span>
              <span className="flex items-center" style={{ gap: 8 }}>
                {own && (
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-text-3)' }}>{t('свой')}</span>
                )}
                <span style={{
                  width: 26, height: 26, borderRadius: 999, background: current,
                  border: '2px solid var(--color-bg-3)', boxShadow: '0 0 0 1px var(--color-border-medium)',
                }} />
              </span>
            </motion.button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  {/* Верхний отступ ≥ кольца выбора. Оно рисуется тенью НАРУЖУ
                      кнопки на 4px, а раскрывающийся блок обязан держать
                      overflow:hidden ради анимации высоты — при отступе в 2px
                      кольцо у верхнего ряда срезалось. */}
                  <div style={{ padding: '8px 15px 14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                      {TINT_SWATCHES.map(hex => {
                        const active = current.toLowerCase() === hex.toLowerCase()
                        return (
                          <motion.button
                            key={hex}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { tactile(); onChange(s.id, hex) }}
                            className="flex items-center justify-center cursor-pointer"
                            style={{
                              height: 38, borderRadius: 12, background: hex, border: 'none',
                              boxShadow: active ? `0 0 0 2px var(--color-bg-3), 0 0 0 4px ${hex}` : 'none',
                            }}
                            aria-label={hex}
                          >
                            {active && <Check size={16} strokeWidth={3} color="#fff" />}
                          </motion.button>
                        )
                      })}
                    </div>
                    {own && (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { tactile(); onChange(s.id, null) }}
                        className="flex items-center cursor-pointer"
                        style={{
                          marginTop: 10, gap: 7, height: 34, padding: '0 13px', borderRadius: 999,
                          background: 'var(--color-bg-5)', color: 'var(--color-muted)',
                          border: 'none', fontSize: 12.5, fontWeight: 600,
                        }}
                      >
                        <RotateCcw size={13} strokeWidth={2.2} />
                        {resetLabel}
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
