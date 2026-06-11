import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { useMemo } from 'react'
import { allHomework, getSubmitters } from '../../data/teacherMockData'
import { useTeacher } from '../../store/teacherStore'

export default function ReviewNavPill() {
  const reviewingHwId = useTeacher(s => s.reviewingHwId)
  const reviewIdx = useTeacher(s => s.reviewIdx)
  const setReviewIdx = useTeacher(s => s.setReviewIdx)
  const reviews = useTeacher(s => s.reviews)

  const hw = allHomework.find(h => h.id === reviewingHwId) ?? null
  const submitters = useMemo(() => (hw ? getSubmitters(hw) : []), [hw])
  const hwReviews = (reviewingHwId && reviews[reviewingHwId]) || {}
  const reviewedCount = submitters.filter(s => hwReviews[s.id]).length
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
        background: 'rgba(255,255,255,0.86)',
        border: '1px solid rgba(255,255,255,0.9)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 4px 14px rgba(21,18,31,0.08)',
      }}>
        <NavBtn disabled={reviewIdx === 0} onClick={() => go(reviewIdx - 1)} dir="left" />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#50505A', padding: '0 6px', minWidth: 44, textAlign: 'center' }}>
          {reviewIdx + 1} / {submitters.length}
        </span>
        <NavBtn disabled={reviewIdx === submitters.length - 1} onClick={() => go(reviewIdx + 1)} dir="right" />
      </div>

      {/* reviewed counter */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', borderRadius: 999,
        background: 'rgba(255,255,255,0.86)',
        border: '1px solid rgba(255,255,255,0.9)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 4px 14px rgba(21,18,31,0.08)',
      }}>
        <CheckCircle2 size={14} style={{ color: allDone ? '#1a7a3f' : '#C2C2C8', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: allDone ? '#1a7a3f' : '#50505A', whiteSpace: 'nowrap' }}>
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
        border: '1px solid rgba(0,0,0,0.06)', background: disabled ? 'transparent' : '#fff',
        boxShadow: disabled ? 'none' : '0 1px 6px rgba(0,0,0,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? '#C2C2C8' : '#0B0B0D',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon size={16} />
    </motion.button>
  )
}
