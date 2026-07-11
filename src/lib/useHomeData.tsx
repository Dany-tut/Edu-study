import React, { useState, useEffect, useRef } from 'react'
import type { ScheduleItem, Reminder } from '../data/teacherMockData'
import { useTeacher } from '../store/teacherStore'
import { useGroups, useAllStudents, useJournalPending } from './useGroups'
import { useHomework, useHardSubmissions } from './useHomework'
import { supabase } from './supabase'

function diffDays(isoA: string, isoB: string) {
  return Math.round((new Date(isoA).getTime() - new Date(isoB).getTime()) / 86400000)
}

// Компактное «сдано N назад» для строк напоминаний.
function agoLabel(iso?: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(diff) || diff < 0) return 'сдано только что'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `сдано ${mins} мин назад`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `сдано ${hrs} ч назад`
  const days = Math.floor(hrs / 24)
  return `сдано ${days} дн назад`
}

export function useOverlayThumb() {
  const [m, setM] = useState({ st: 0, sh: 0, ch: 0 })
  const [hover, setHover] = useState(false)
  const [scrolling, setScrolling] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function update(el: HTMLElement) {
    setM(prev => (prev.st === el.scrollTop && prev.sh === el.scrollHeight && prev.ch === el.clientHeight
      ? prev : { st: el.scrollTop, sh: el.scrollHeight, ch: el.clientHeight }))
  }
  function onScroll(el: HTMLElement) {
    update(el)
    setScrolling(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setScrolling(false), 900)
  }

  const inset = 4
  const overflowing = m.sh > m.ch + 1
  const trackH = Math.max(0, m.ch - inset * 2)
  const thumbH = trackH > 0 ? Math.max(24, (m.ch / m.sh) * trackH) : 0
  const maxScroll = m.sh - m.ch
  const thumbTop = inset + (maxScroll > 0 ? (m.st / maxScroll) * (trackH - thumbH) : 0)

  const thumb = overflowing ? (
    <div style={{
      position: 'absolute', top: thumbTop, right: 2, width: 5, height: thumbH,
      borderRadius: 999, background: 'var(--scroll-thumb)', pointerEvents: 'none', zIndex: 3,
      transition: 'opacity 0.2s ease', opacity: hover || scrolling ? 1 : 0,
    }} />
  ) : null

  return { update, onScroll, setHover, thumb }
}

export function useHomeData() {
  const openHardReview = useTeacher(s => s.openHardReview)
  const openHomeworkReview = useTeacher(s => s.openHomeworkReview)
  const openStudentDashboard = useTeacher(s => s.openStudentDashboard)
  const { openGradebook } = useTeacher()
  const { groups } = useGroups()
  const { homework: allHomework } = useHomework()
  const { submissions: hardSubs } = useHardSubmissions()
  const allStudents = useAllStudents()

  const [todaySchedule, setTodaySchedule] = useState<ScheduleItem[]>([])
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('schedule_lessons')
      .select('*, groups(name, icon, color, color_soft, students(count))')
      .eq('date', today)
      .order('time_start')
      .then(({ data }) => {
        if (!data) return
        const ownedGroups = new Set(groups.map(g => g.id))
        const ownedStudents = new Set(allStudents.map(s => s.id))
        const owned = data.filter((s: any) =>
          (s.group_id && ownedGroups.has(s.group_id)) ||
          (s.student_id && ownedStudents.has(s.student_id)))
        setTodaySchedule(owned.map((s: any) => {
          const stu = s.student_id ? allStudents.find((a: any) => a.id === s.student_id) : null
          return {
            id: String(s.id),
            groupId: s.group_id ?? null,
            studentId: s.student_id ?? null,
            groupName: s.groups?.name ?? stu?.name ?? '',
            icon: s.groups?.icon ?? '👤',
            time: (s.time_start ?? '').slice(0, 5),
            endTime: (s.time_end ?? '').slice(0, 5),
            topic: s.lesson_title ?? '',
            lessonNumber: s.lesson_number ?? 0,
            subject: s.subject ?? '',
            status: (s.status ?? 'upcoming') as ScheduleItem['status'],
            studentCount: s.groups?.students?.[0]?.count ?? (stu ? 1 : 0),
            color: s.groups?.color ?? 'var(--color-purple)',
            colorSoft: s.groups?.color_soft ?? 'var(--color-bg-3)',
          }
        }))
      })
  }, [groups, allStudents])

  const pendingJournals = useJournalPending(null)
  const pendingHomework = allHomework.filter(hw => hw.status === 'active')
  const totalStudents = groups.reduce((a, g) => a + g.studentCount, 0)
  const TODAY = new Date().toISOString().split('T')[0]

  const pendingHard = hardSubs.filter(s => s.status === 'submitted')
  const pendingCount =
    pendingHomework.reduce((a, hw) => a + Math.max(0, hw.submittedCount - hw.reviewedCount), 0) +
    pendingHard.length

  const doneCount = todaySchedule.filter(s => s.status === 'completed').length

  const reminders: Reminder[] = [
    ...pendingHomework.filter(hw => hw.submittedCount > 0).map(hw => ({
      id: `hw-${hw.id}`,
      type: 'check-hw' as Reminder['type'],
      text: `Проверить ДЗ — ${hw.groupName}`,
      detail: `${hw.submittedCount} из ${hw.totalCount} сдали`
        + (hw.lastSubmittedAt ? ` · ${agoLabel(hw.lastSubmittedAt)}` : ''),
      urgency: 'high' as Reminder['urgency'],
    })),
    ...pendingHard.map(s => ({
      id: `hard-${s.id}`,
      type: 'check-hw' as Reminder['type'],
      text: `Сложное ДЗ — ${s.studentName.split(' ')[0]}`,
      detail: s.updatedAt ? `${s.lessonTitle} · ${agoLabel(s.updatedAt)}` : s.lessonTitle,
      urgency: 'high' as Reminder['urgency'],
    })),
    ...allStudents.filter(s => s.paymentDue && diffDays(s.paymentDue, TODAY) <= 7).map(s => ({
      id: `pay-${s.id}`,
      type: 'payment-debt' as Reminder['type'],
      text: `Оплата — ${s.name.split(' ')[0]}`,
      detail: s.paymentAmount ? `${s.paymentAmount.toLocaleString('ru-RU')} ₽` : '',
      urgency: (diffDays(s.paymentDue!, TODAY) < 0 ? 'high' : 'medium') as Reminder['urgency'],
    })),
    ...pendingJournals.map(p => ({
      id: `journal-${p.scheduleId}`,
      type: 'fill-journal' as Reminder['type'],
      text: `Журнал — ${p.scopeName}`,
      detail: `${p.date.slice(5).replace('-', '.')} · ${p.title}`,
      urgency: 'medium' as Reminder['urgency'],
    })),
  ]

  const reminderDone = (r: Reminder) =>
    r.type === 'check-hw' &&
    pendingHomework.some(hw => r.text.includes(hw.groupName) && hw.reviewedCount >= hw.submittedCount)

  const reminderAction = (r: Reminder): (() => void) | undefined => {
    if (r.id.startsWith('hard-')) { const id = r.id.slice(5); return () => openHardReview(id) }
    if (r.id.startsWith('hw-')) { const id = r.id.slice(3); return () => openHomeworkReview(id) }
    if (r.id.startsWith('journal-')) { const sid = r.id.slice(8); return () => openGradebook(sid) }
    if (r.id.startsWith('pay-')) {
      const sid = r.id.slice(4)
      const stu = allStudents.find(s => s.id === sid)
      return stu ? () => openStudentDashboard(sid, stu.groupId) : undefined
    }
    return undefined
  }

  const schedThumb = useOverlayThumb()

  const nextLesson = todaySchedule.find(s => s.status === 'upcoming')
  const firstUpcomingIdx = todaySchedule.findIndex(s => s.status === 'upcoming')
  const hasLive = todaySchedule.some(s => s.status === 'live')
  const nowMarkerIndex = !hasLive && firstUpcomingIdx > 0 ? firstUpcomingIdx : -1

  return {
    groups,
    totalStudents,
    pendingCount,
    todaySchedule,
    nextLesson,
    doneCount,
    nowMarkerIndex,
    hasLive,
    firstUpcomingIdx,
    reminders,
    reminderDone,
    reminderAction,
    schedThumb,
    allStudents,
  }
}
