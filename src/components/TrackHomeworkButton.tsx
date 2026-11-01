import { useEffect, useRef, useState } from 'react'
import { motion, useIsPresent } from 'framer-motion'
import type { Lesson } from '../data/mockData'
import { useT } from '../lib/i18n'
import { startCourseHomeworkRetake } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'

export default function TrackHomeworkButton({ lesson, resume }: { lesson: Lesson; resume: boolean }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const inFlight = useRef(false)
  const present = useIsPresent()
  const active = useRef(false)
  useEffect(() => {
    active.current = present
    return () => { active.current = false }
  }, [present])

  const label = resume ? 'Продолжить' : 'Пересдать ДЗ'

  async function open() {
    if (inFlight.current) return
    const dashboard = useDashboard.getState()
    if (resume) {
      dashboard.openHomeworkForLesson(lesson.id, 'basic')
      return
    }
    inFlight.current = true
    setBusy(true)
    setFailed(false)
    try {
      await startCourseHomeworkRetake(lesson.subject, lesson.id, lesson.result?.attemptId ?? null)
      if (active.current && useDashboard.getState().activePage === 'home') {
        dashboard.openHomeworkForLesson(lesson.id, 'basic')
      }
    } catch {
      if (active.current) setFailed(true)
    } finally {
      inFlight.current = false
      if (active.current) setBusy(false)
    }
  }

  return <>
    {failed && <span role="alert" style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--color-red-text)' }}>
      {t('Не удалось начать попытку. Предыдущая работа сохранена. Попробуй ещё раз.')}
    </span>}
    <motion.button
      type="button" disabled={busy} aria-busy={busy} onClick={open}
      aria-label={resume && !busy ? t('Продолжить пересдачу') : undefined}
      whileHover={busy ? undefined : { scale: 1.03 }}
      whileTap={busy ? undefined : { scale: 0.96 }}
      style={{
        minWidth: 0, minHeight: 40, borderRadius: 12, padding: '8px', whiteSpace: 'nowrap',
        fontSize: 13, fontWeight: 600, color: '#fff',
        background: 'var(--grad-purple)', cursor: busy ? 'wait' : 'pointer',
      }}
    >
      {busy ? t('Открываем…') : t(label)}
    </motion.button>
  </>
}
