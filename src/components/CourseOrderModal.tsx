import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { GripVertical, X } from 'lucide-react'
import { useStudentData } from '../store/studentDataStore'
import { getStudentSession } from '../lib/studentSession'
import { supabase } from '../lib/supabase'
import { useT } from '../lib/i18n'

const EASE = [0.32, 0.72, 0, 1] as const

type Props = { open: boolean; onClose: () => void }
type Row = { dbId: string; name: string }

// Порядок курсов — ученик расставляет его сам, перетаскивая за ручку.
//
// Порядок ОДИН на весь кабинет: трек, «Курсы», домашки, переключатель предметов
// и телефон читают массив subjects как есть (сортировка — orderCourses в
// src/lib/db.ts), так что перестановка здесь видна везде сразу.
//
// Правки применяются по «Готово», как и в окне виджетов: «Отмена», Esc и клик
// по фону выбрасывают их.
export default function CourseOrderModal({ open, onClose }: Props) {
  const t = useT()
  const subjects = useStudentData(s => s.subjects)
  const reorderSubjects = useStudentData(s => s.reorderSubjects)

  // Курс без dbId (демо-данные, курс не из базы) переставлять некуда — порядок
  // хранится по его строке в базе.
  const saved: Row[] = subjects.filter(s => s.dbId).map(s => ({ dbId: s.dbId as string, name: s.name }))
  const [rows, setRows] = useState<Row[]>(saved)
  const [saving, setSaving] = useState(false)

  // Открытие — точка отсчёта: список берётся из стора один раз.
  useEffect(() => { if (open) setRows(saved) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function apply() {
    const ids = rows.map(r => r.dbId)
    // Экран переставляем сразу: ответа базы ждать незачем — порядок косметический,
    // а ученик уже видит, что он сделал.
    reorderSubjects(ids)
    setSaving(true)
    const session = getStudentSession()
    if (session?.id) {
      // Писать в course_enrollments напрямую ученику нельзя (RLS — только
      // учитель), поэтому узкая дверь: RPC трогает лишь порядок и только у
      // курсов этого человека, см. миграцию 0080.
      const { error } = await supabase.rpc('set_course_order', { p_student: session.id, p_courses: ids })
      if (error) console.error('[CourseOrderModal] set_course_order failed', error)
    }
    setSaving(false)
    onClose()
  }

  if (!open) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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
            transition={{ duration: 0.2, ease: EASE }}
            style={{
              width: 'min(420px, 100%)', maxHeight: '90vh', overflowY: 'auto',
              background: 'var(--color-bg)', borderRadius: 24, padding: 24,
              boxShadow: '0 24px 70px rgba(0,0,0,0.28)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>{t('Порядок курсов')}</h2>
                <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>
                  {t('Перетащите за ручку. Этот порядок будет везде: на треке, в «Курсах» и в домашках.')}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={onClose}
                aria-label={t('Закрыть')}
                style={{
                  width: 34, height: 34, borderRadius: 999, flexShrink: 0, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-3)', color: 'var(--color-muted)',
                }}
              >
                <X size={17} />
              </motion.button>
            </div>

            <Reorder.Group
              as="div"
              axis="y"
              values={rows}
              onReorder={setRows}
              style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '20px 0 0', listStyle: 'none', padding: 0 }}
            >
              {rows.map((row, i) => (
                <CourseRow key={row.dbId} row={row} index={i} />
              ))}
            </Reorder.Group>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                style={{
                  padding: '0 18px', height: 42, borderRadius: 12, border: '1.5px solid var(--color-border-strong)', cursor: 'pointer',
                  background: 'transparent', color: 'var(--color-text-2)', fontSize: 14, fontWeight: 600,
                }}
              >
                {t('Отмена')}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={apply}
                disabled={saving}
                style={{
                  padding: '0 22px', height: 42, borderRadius: 12, border: 'none', cursor: saving ? 'default' : 'pointer',
                  background: 'var(--grad-purple)', color: '#fff', fontSize: 14, fontWeight: 650, opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? t('Сохраняем…') : t('Готово')}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// Тянуть можно ТОЛЬКО за ручку (dragListener=false + dragControls): иначе прокрутка
// списка пальцем превращалась бы в перетаскивание — то же решение, что в окне
// виджетов.
function CourseRow({ row, index }: { row: Row; index: number }) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      as="div"
      value={row}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.03, boxShadow: '0 14px 30px rgba(0,0,0,0.16)' }}
      transition={{ type: 'spring', stiffness: 600, damping: 42 }}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px', borderRadius: 14,
        background: 'var(--color-bg-2)',
        border: '1.5px solid transparent',
        listStyle: 'none',
        userSelect: 'none', WebkitUserSelect: 'none',
      }}
    >
      <span
        onPointerDown={e => controls.start(e)}
        style={{ display: 'flex', cursor: 'grab', touchAction: 'none', color: 'var(--color-text-4)', flexShrink: 0 }}
      >
        <GripVertical size={16} />
      </span>
      <span style={{
        width: 26, height: 26, borderRadius: 9, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-purple-soft)', color: 'var(--color-accent)',
        fontSize: 12.5, fontWeight: 700,
      }}>
        {index + 1}
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {row.name}
      </span>
    </Reorder.Item>
  )
}
