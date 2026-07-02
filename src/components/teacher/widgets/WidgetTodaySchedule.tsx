import { motion } from 'framer-motion'
import { Users, Clock, CheckCircle2 } from 'lucide-react'
import type { ScheduleItem } from '../../../data/teacherMockData'
import { useTeacher } from '../../../store/teacherStore'
import { useHomeData, useOverlayThumb } from '../../../lib/useHomeData'
import { mskToVietnam } from '../../../lib/utils'

function nowMskHHMM(): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date())
  } catch {
    return new Date().toTimeString().slice(0, 5)
  }
}

function ScheduleRow({ item, isFirst, isLast }: { item: ScheduleItem; isFirst: boolean; isLast: boolean }) {
  const openLessonEditor = useTeacher(s => s.openLessonEditor)
  const isLive = item.status === 'live'
  const isDone = item.status === 'completed'

  const dot = isDone ? (
    <CheckCircle2 size={17} strokeWidth={2.2} style={{ color: 'var(--color-green-text)', background: 'var(--color-bg)', borderRadius: '50%' }} />
  ) : isLive ? (
    <span style={{ position: 'relative', display: 'flex' }}>
      <span style={{ width: 13, height: 13, borderRadius: '50%', background: item.color, boxShadow: `0 0 0 3px color-mix(in srgb, ${item.color} 28%, transparent)` }} />
      <span style={{ position: 'absolute', inset: -1, borderRadius: '50%', background: item.color, opacity: 0.35, animation: 'ping 1.4s infinite' }} />
    </span>
  ) : (
    <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-bg)', border: `2px solid ${item.color}` }} />
  )

  const liveBg = isLive ? `color-mix(in srgb, ${item.color} 9%, transparent)` : 'transparent'
  const hoverBg = isLive ? `color-mix(in srgb, ${item.color} 22%, var(--color-bg-3))` : 'var(--color-bg-3)'

  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={() => openLessonEditor(item.id)}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hoverBg }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = liveBg }}
      style={{
        width: '100%', display: 'flex', alignItems: 'stretch', gap: 12,
        padding: '8px 12px 8px 4px', borderRadius: 14, border: 'none', cursor: 'pointer',
        background: liveBg,
        textAlign: 'left', transition: 'background 0.15s', position: 'relative',
        opacity: isDone ? 0.62 : 1,
      }}
    >
      <div style={{ position: 'relative', width: 22, flexShrink: 0, alignSelf: 'stretch' }}>
        <span style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 2,
          top: isFirst ? 'calc(50% - 2px)' : 0,
          bottom: isLast ? 'calc(50% - 2px)' : 0,
          background: 'var(--color-border-medium)',
        }} />
        <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex' }}>
          {dot}
        </span>
      </div>

      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, flexShrink: 0, width: 62, alignSelf: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: isLive ? 'var(--color-text)' : 'var(--color-text-2)' }}>
          {item.time}{item.endTime ? `–${item.endTime}` : ''}
        </span>
        {item.time && (
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-4)' }}>
            {mskToVietnam(item.time)} ВН
          </span>
        )}
      </span>

      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3, alignSelf: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: `color-mix(in srgb, ${item.color} 16%, transparent)`,
            borderRadius: 8, padding: '3px 9px', flexShrink: 0, maxWidth: '100%',
          }}>
            <span style={{ fontSize: 13, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: item.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.groupName}</span>
          </span>
          {isLive && (
            <span style={{ fontSize: 10.5, fontWeight: 700, color: item.color, letterSpacing: 0.3, flexShrink: 0 }}>
              ИДЁТ СЕЙЧАС
            </span>
          )}
        </span>
        {(item.subject || item.topic || item.lessonNumber > 0) && (
          <span style={{ fontSize: 12, color: 'var(--color-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[item.subject, item.lessonNumber > 0 ? `Урок ${item.lessonNumber}` : '', item.topic].filter(Boolean).join(' · ')}
          </span>
        )}
      </span>

      <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, color: 'var(--color-text-3)', alignSelf: 'center' }}>
        <Users size={13} strokeWidth={1.8} />
        <span style={{ fontSize: 12, fontWeight: 600 }}>{item.studentCount}</span>
      </span>
    </motion.button>
  )
}

function NowMarker({ time }: { time: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 12px 2px 4px' }}>
      <div style={{ width: 22, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-red-text)', boxShadow: '0 0 0 3px var(--color-red-soft)' }} />
      </div>
      <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4, color: 'var(--color-red-text)', flexShrink: 0 }}>
        СЕЙЧАС · {time}
      </span>
      <span style={{ flex: 1, height: 1, background: 'linear-gradient(to right, var(--color-red-soft), transparent)' }} />
    </div>
  )
}

export default function WidgetTodaySchedule() {
  const { todaySchedule, doneCount, nowMarkerIndex } = useHomeData()
  const schedThumb = useOverlayThumb()

  return (
    <div style={{
      height: '100%', width: '100%', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid var(--color-border-medium)',
      borderRadius: 24,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
      padding: 20,
    }}>
      {/* Title */}
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-muted)', letterSpacing: 0.2, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <Clock size={14} strokeWidth={2} />
        Расписание сегодня
        {todaySchedule.length > 0 && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: 0 }}>
            <span style={{ color: 'var(--color-green-text)' }}>{doneCount} провед.</span>
            <span style={{ color: 'var(--color-text-4)' }}>·</span>
            <span style={{ color: 'var(--color-accent)' }}>{todaySchedule.length - doneCount} впереди</span>
          </span>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <div
          ref={el => { if (el) schedThumb.update(el) }}
          onScroll={e => schedThumb.onScroll(e.currentTarget)}
          onMouseEnter={() => schedThumb.setHover(true)}
          onMouseLeave={() => schedThumb.setHover(false)}
          className="no-scrollbar"
          style={{
            position: 'absolute', inset: 0,
            overflowY: 'auto', overflowX: 'hidden',
            display: 'flex', flexDirection: 'column', gap: 1,
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 14px, black calc(100% - 20px), transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 14px, black calc(100% - 20px), transparent 100%)',
            paddingBlock: 6, paddingLeft: 0, paddingRight: 12,
          }}
        >
          {todaySchedule.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--color-text-4)', padding: '24px 0' }}>
              <Clock size={26} strokeWidth={1.5} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Сегодня уроков нет</span>
            </div>
          ) : todaySchedule.map((item, i) => (
            <div key={item.id}>
              {i === nowMarkerIndex && <NowMarker time={nowMskHHMM()} />}
              <ScheduleRow item={item} isFirst={i === 0} isLast={i === todaySchedule.length - 1} />
            </div>
          ))}
        </div>
        {schedThumb.thumb}
      </div>
      <style>{`
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
