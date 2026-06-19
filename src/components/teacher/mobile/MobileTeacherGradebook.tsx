import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckSquare, Check, X, CalendarCheck, Loader2 } from 'lucide-react'
import MobileScreen from '../../MobileScreen'
import MobileSheet from '../../MobileSheet'
import MobilePill from '../../MobilePill'
import { GlassPill } from '../../mobileChrome'
import { PAIR } from '../../../lib/mobileTokens'
import { tactile } from '../../../lib/feedback'
import { useGroups, useGroupLessons, useLessonRoster, useAttendance, type GroupLesson } from '../../../lib/useGroups'

// MOBILE ONLY journal: pick group → pick lesson → mark present/absent with a
// "все присутствовали" shortcut, then save (useAttendance.saveLesson).

function fmtDate(d: string) {
  const [, m, day] = d.split('-')
  return `${day}.${m}`
}

function AttendanceSheet({ lesson, groupId, onClose, onSaved }: {
  lesson: GroupLesson | null; groupId: string | null; onClose: () => void; onSaved: () => void
}) {
  const roster = useLessonRoster(lesson)
  const { saveLesson } = useAttendance(groupId)
  const [present, setPresent] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  // Default everyone to present when a fresh lesson opens.
  useEffect(() => {
    if (lesson) setPresent(Object.fromEntries(roster.map(r => [r.id, true])))
  }, [lesson?.id, roster.length])

  const allPresent = roster.length > 0 && roster.every(r => present[r.id])

  const save = async () => {
    if (!lesson || saving) return
    tactile(); setSaving(true)
    await saveLesson(
      lesson.groupId,
      lesson.date,
      roster.map(r => ({ studentId: r.id, present: !!present[r.id] })),
      lesson.title,
    )
    setSaving(false); onSaved(); onClose()
  }

  return (
    <MobileSheet open={!!lesson} onClose={onClose} title={lesson ? `${lesson.title || 'Урок'} · ${fmtDate(lesson.date)}` : ''}>
      {lesson && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
          <button
            onClick={() => { tactile(); setPresent(Object.fromEntries(roster.map(r => [r.id, true]))) }}
            className="cursor-pointer"
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 650, padding: '8px 14px', borderRadius: 999, background: allPresent ? PAIR.success.bg : 'var(--color-bg-4)', color: allPresent ? PAIR.success.text : 'var(--color-text-2)', border: '1px solid transparent' }}
          >
            <Check size={15} /> Все присутствовали
          </button>

          {roster.map(r => {
            const isPresent = !!present[r.id]
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px' }}>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{r.name}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { tactile(); setPresent(p => ({ ...p, [r.id]: true })) }}
                    className="cursor-pointer"
                    aria-label="присутствовал"
                    style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isPresent ? PAIR.success.bg : 'var(--color-bg-4)', color: isPresent ? PAIR.success.text : 'var(--color-text-4)', border: '1px solid transparent' }}
                  ><Check size={18} /></motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { tactile(); setPresent(p => ({ ...p, [r.id]: false })) }}
                    className="cursor-pointer"
                    aria-label="отсутствовал"
                    style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: !isPresent ? PAIR.error.bg : 'var(--color-bg-4)', color: !isPresent ? PAIR.error.text : 'var(--color-text-4)', border: '1px solid transparent' }}
                  ><X size={18} /></motion.button>
                </div>
              </div>
            )
          })}

          {roster.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--color-muted)', padding: '16px 0', textAlign: 'center' }}>Нет учеников для этого урока</div>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={save}
            disabled={saving || roster.length === 0}
            className="cursor-pointer"
            style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 16, background: 'var(--color-accent)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, opacity: roster.length === 0 ? 0.5 : 1 }}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckSquare size={18} />} Сохранить журнал
          </motion.button>
        </div>
      )}
    </MobileSheet>
  )
}

export default function MobileTeacherGradebook() {
  const { groups } = useGroups()
  const [groupId, setGroupId] = useState<string | null>(null)
  const lessons = useGroupLessons(groupId)
  const [openLesson, setOpenLesson] = useState<GroupLesson | null>(null)
  const [savedTick, setSavedTick] = useState(0)

  // Default to the first group once loaded.
  useEffect(() => {
    if (!groupId && groups.length) setGroupId(groups[0].id)
  }, [groups.length])

  const topZone = (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <GlassPill><CheckSquare size={15} /> Журнал</GlassPill>
    </div>
  )

  return (
    <MobileScreen topZone={topZone} topPad={64} scrollKey={`t-grade-${groupId}-${savedTick}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Group selector */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }} className="no-scrollbar">
          {groups.map(g => (
            <MobilePill key={g.id} active={g.id === groupId} onClick={() => setGroupId(g.id)} size="sm">
              {g.icon} {g.name}
            </MobilePill>
          ))}
        </div>

        {/* Lessons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lessons.map(l => (
            <motion.button
              key={l.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setOpenLesson(l)}
              className="cursor-pointer"
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 16, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', textAlign: 'left' }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--color-bg-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CalendarCheck size={18} style={{ color: 'var(--color-muted)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 650, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.title || 'Урок'}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-muted)' }}>{fmtDate(l.date)}{l.timeStart ? ` · ${l.timeStart}` : ''}</div>
              </div>
            </motion.button>
          ))}
          {lessons.length === 0 && (
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-muted)', padding: '40px 0', textAlign: 'center' }}>Нет запланированных уроков для этой группы</div>
          )}
        </div>
      </div>

      <AttendanceSheet
        lesson={openLesson}
        groupId={groupId}
        onClose={() => setOpenLesson(null)}
        onSaved={() => setSavedTick(t => t + 1)}
      />
    </MobileScreen>
  )
}
