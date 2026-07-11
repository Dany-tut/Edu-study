import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { useMemo } from 'react'
import { useTeacher } from '../../store/teacherStore'
import { useHomework, useHomeworkSubmissions } from '../../lib/useHomework'
import { useStudents } from '../../lib/useGroups'

export default function ReviewNavPill() {
  const reviewingHwId = useTeacher(s => s.reviewingHwId)
  const reviewIdx = useTeacher(s => s.reviewIdx)
  const setReviewIdx = useTeacher(s => s.setReviewIdx)

  const { homework: allHomework } = useHomework()
  const hw = allHomework.find(h => h.id === reviewingHwId) ?? null

  const { submissions: rawSubmissions } = useHomeworkSubmissions(reviewingHwId)
  const { students: groupStudents } = useStudents(hw?.groupId ?? null)

  const submitters = useMemo(() => {
    if (!hw) return []
    const submittedIds = new Set(rawSubmissions.map(s => s.studentId))
    return groupStudents.filter(s => submittedIds.has(s.id))
  }, [hw, rawSubmissions, groupStudents])

  // «Проверено» = вердикт сдачи (lesson_progress), не in-memory стор.
  const reviewedIds = useMemo(
    () => new Set(rawSubmissions.filter(s => s.verdict !== 'pending').map(s => s.studentId)),
    [rawSubmissions],
  )
  const reviewedCount = submitters.filter(s => reviewedIds.has(s.id)).length
  const allDone = reviewedCount === submitters.length && submitters.length > 0

  if (!hw || submitters.length === 0) return null

  const go = (next: number) => {
    if (next < 0 || next >= submitters.length) return
    setReviewIdx(next)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* arrows */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '6px 8px', borderRadius: 999,
        background: 'rgba(var(--glass-rgb), 0.86)',
        border: '1px solid var(--color-border-glass)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        boxShadow: 'var(--shadow-pill)',
      }}>
        <NavBtn disabled={reviewIdx === 0} onClick={() => go(reviewIdx - 1)} dir="left" />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', padding: '0 6px', minWidth: 44, textAlign: 'center' }}>
          {reviewIdx + 1} / {submitters.length}
        </span>
        <NavBtn disabled={reviewIdx === submitters.length - 1} onClick={() => go(reviewIdx + 1)} dir="right" />
      </div>

      {/* reviewed counter */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', borderRadius: 999,
        background: 'rgba(var(--glass-rgb), 0.86)',
        border: '1px solid var(--color-border-glass)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        boxShadow: 'var(--shadow-pill)',
      }}>
        <CheckCircle2 size={14} style={{ color: allDone ? 'var(--color-green-text)' : 'var(--color-text-4)', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: allDone ? 'var(--color-green-accent)' : 'var(--color-text-2)', whiteSpace: 'nowrap' }}>
          {allDone ? 'Все проверены' : `Проверено ${reviewedCount} из ${submitters.length}`}
        </span>
      </div>
    </div>
  )
}

function NavBtn({ disabled, onClick, dir }: { disabled: boolean; onClick: () => void; dir: 'left' | 'right' }) {
  const Icon = dir === 'left' ? ChevronLeft : ChevronRight
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.1 }}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        border: '1px solid var(--color-border-soft)', background: disabled ? 'transparent' : 'var(--color-surface)',
        boxShadow: disabled ? 'none' : '0 1px 6px rgba(0,0,0,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'var(--color-text-4)' : 'var(--color-text)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon size={16} />
    </motion.button>
  )
}
