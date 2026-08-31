import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import MobileSheet from './MobileSheet'
import Radio from './Radio'
import SubjectColorPicker, { type ColorSubject } from './SubjectColorPicker'
import CourseTintPreview from './CourseTintPreview'
import { TINT_LEVELS, resolveAccent, subjectKey } from '../lib/courseTint'
import { useTint } from '../store/tintStore'
import { useStudentData } from '../store/studentDataStore'
import { getSubject } from '../lib/subjects'
import { tactile } from '../lib/feedback'
import { useT } from '../lib/i18n'

// ─────────────────────────────────────────────────────────────────────────────
// Настройки ученика «Цвет курса»: глубина перекраски + личные цвета предметов.
//
// Цвет ученика бьёт учительский НАМЕРЕННО: цвет — вещь личная (кому-то мешает
// контраст, кому-то оттенок неразличим), и заставлять человека жить в чужом
// выборе не за что. Учителя это не касается — его карта лежит отдельно, и
// правка ученика в неё не пишется.
//
// Тело вынесено в CourseTintSettings, потому что оболочек две: шторка снизу на
// телефоне и окно на десктопе. Разъехаться они не могут — содержимое одно.
// ─────────────────────────────────────────────────────────────────────────────

const EASE = [0.32, 0.72, 0, 1] as const

export function CourseTintSettings({ surface = 'rgba(var(--glass-rgb), 0.98)' }: { surface?: string }) {
  const t = useT()
  const courses = useStudentData(s => s.subjects)
  const level = useTint(s => s.level)
  const setLevel = useTint(s => s.setLevel)
  const studentColors = useTint(s => s.studentColors)
  const teacherColors = useTint(s => s.teacherColors)
  const setStudentColor = useTint(s => s.setStudentColor)
  const activeSubject = useTint(s => s.activeSubject)
  // Раскрытая строка предмета: пока её примеряют, макет показывает ЕЁ цвет —
  // иначе выбор цвета немецкого не виден ничем, если открыт корейский курс.
  const [focusId, setFocusId] = useState<string | null>(null)

  // Предметы ученика — по его курсам, без повторов: два английских курса дают
  // одну строку «Английский», цвет у предмета один.
  const subjects: ColorSubject[] = useMemo(() => {
    const seen = new Map<string, ColorSubject>()
    courses.forEach(c => {
      const def = getSubject(c.subject)
      if (def && !seen.has(def.id)) seen.set(def.id, { id: def.id, name: def.name, icon: def.icon })
    })
    return [...seen.values()]
  }, [courses])

  // Чей цвет в макете: раскрытый предмет → предмет открытого курса → первый.
  const previewSubject = focusId ?? activeSubject ?? subjects[0]?.id
  const previewHex = resolveAccent(previewSubject, { student: studentColors, teacher: teacherColors })

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)',
    letterSpacing: '0.05em', textTransform: 'uppercase', padding: '0 2px 8px',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Макет липнет к верху: цвета предметов лежат ниже уровня прокрутки, и
          без этого выбор цвета менял бы экран за пределами видимости. */}
      <div style={{ position: 'sticky', top: 0, zIndex: 2 }}>
        <div style={{ background: surface, paddingBottom: 6 }}>
          <CourseTintPreview hex={previewHex} level={level} />
        </div>
        {/* Ряды уходят под макет растворяясь, а не срезом по линейке: без этой
            полоски «Подложки» разрезало пополам ровно по нижнему краю. */}
        <div style={{ height: 14, background: `linear-gradient(to bottom, ${surface}, transparent)` }} />
      </div>

      <div style={{ marginTop: -12 }}>
        <div style={labelStyle}>{t('Насколько красить')}</div>
        <div style={{ borderRadius: 18, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', overflow: 'hidden' }}>
          {TINT_LEVELS.map((l, i) => (
            <div key={l.id} style={{ padding: '12px 15px', borderTop: i ? '1px solid var(--color-border-soft)' : 'none' }}>
              <Radio
                name="tint-level"
                checked={level === l.id}
                onChange={() => { tactile(); setLevel(l.id) }}
                align="start"
                labelStyle={{ fontSize: 15, fontWeight: 550, color: 'var(--color-text)' }}
              >
                <span style={{ display: 'block' }}>{t(l.label)}</span>
                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--color-muted)', marginTop: 2 }}>
                  {t(l.hint)}
                </span>
              </Radio>
            </div>
          ))}
        </div>
      </div>

      {subjects.length > 0 && (
        <div>
          <div style={labelStyle}>{t('Цвета предметов')}</div>
          <SubjectColorPicker
            subjects={subjects}
            value={studentColors}
            // Нижний слой для ученика — цвет учителя (а если тот его не задавал,
            // реестровый): «сбросить» возвращает именно к нему.
            baseColor={id => resolveAccent(id, { teacher: teacherColors })}
            onChange={(id, hex) => setStudentColor(id, hex)}
            resetLabel={t('Как у преподавателя')}
            onOpenChange={setFocusId}
          />
          <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--color-muted)', padding: '10px 4px 0' }}>
            {t('Свой цвет виден только вам — у преподавателя останется его.')}
          </div>
        </div>
      )}
    </div>
  )
}

/** Телефон — шторка снизу. */
export default function CourseTintSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  return (
    <MobileSheet open={open} onClose={onClose} title={t('Цвет курса')}>
      <div style={{ padding: '0 0 8px' }}>
        <CourseTintSettings />
      </div>
    </MobileSheet>
  )
}

/** Десктоп — окно из меню настроек в сайдбаре. */
export function CourseTintModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            background: 'rgba(15,12,24,0.42)',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: EASE }}
            style={{
              width: 'min(420px, 100%)', maxHeight: '90vh', overflowY: 'auto',
              background: 'var(--color-bg)', borderRadius: 24, padding: 24,
              boxShadow: '0 24px 70px rgba(0,0,0,0.28)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>{t('Цвет курса')}</h2>
                <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>
                  {t('Интерфейс подстраивается под открытый курс.')}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={onClose}
                aria-label={t('Закрыть')}
                style={{
                  width: 34, height: 34, borderRadius: 999, flexShrink: 0, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--color-bg-3)', color: 'var(--color-muted)',
                }}
              >
                <X size={17} />
              </motion.button>
            </div>
            <CourseTintSettings surface="var(--color-bg)" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** Кружок текущего цвета для строки настроек. */
export function useCurrentTintColor(): string | null {
  const level = useTint(s => s.level)
  const activeSubject = useTint(s => s.activeSubject)
  const studentColors = useTint(s => s.studentColors)
  const teacherColors = useTint(s => s.teacherColors)
  if (level === 'off' || !activeSubject || !subjectKey(activeSubject)) return null
  return resolveAccent(activeSubject, { student: studentColors, teacher: teacherColors })
}
