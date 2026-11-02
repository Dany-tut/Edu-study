import React, { useState, useEffect, useRef } from 'react'
import type { Reminder } from '../data/teacherMockData'
import { useTeacher } from '../store/teacherStore'
import { useGroups, useAllStudents, useJournalPending } from './useGroups'
import { useHomework, useHardSubmissions } from './useHomework'
import { useTeacherTodaySchedule } from './teacherToday'
import { useT } from './i18n'
import { buildTeacherReminders } from './reminderContent'
import { scheduleHasEnded, todayMsk } from './teacherSchedule'

export function useOverlayThumb() {
  const [m, setM] = useState({ st: 0, sh: 0, ch: 0 })
  const [hover, setHover] = useState(false)
  const [scrolling, setScrolling] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

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
      transition: 'opacity 0.22s ease', opacity: hover || scrolling ? 1 : 0,
    }} />
  ) : null

  return { update, onScroll, setHover, thumb }
}

export function useHomeData() {
  const t = useT()
  const openHardReview = useTeacher(s => s.openHardReview)
  const openHomeworkReview = useTeacher(s => s.openHomeworkReview)
  const openStudentDashboard = useTeacher(s => s.openStudentDashboard)
  const { openGradebook } = useTeacher()
  const { groups, loading: groupsLoading } = useGroups()
  const { homework: allHomework } = useHomework()
  const { submissions: hardSubs } = useHardSubmissions()
  const allStudents = useAllStudents()

  const { schedule: todaySchedule } = useTeacherTodaySchedule()
  const [scheduleClock, setScheduleClock] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setScheduleClock(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const pendingJournals = useJournalPending(null)
  const pendingHomework = allHomework.filter(hw => hw.status === 'active')
  const totalStudents = new Set(allStudents.map(s => s.personId || s.authUserId || s.id)).size

  const pendingHard = hardSubs.filter(s => s.status === 'submitted')
  const pendingCount =
    pendingHomework.reduce((a, hw) => a + Math.max(0, hw.submittedCount - hw.reviewedCount), 0) +
    pendingHard.length

  const doneCount = todaySchedule.filter(s => s.status === 'completed').length

  const reminders = buildTeacherReminders({ homework: allHomework, hard: hardSubs, students: allStudents, journals: pendingJournals, today: todayMsk(), now: scheduleClock, t })
  const reminderDone = (r: Reminder) => r.done === true

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

  const now = new Date(scheduleClock)
  const isStillUpcoming = (s: ScheduleItem) => s.status === 'upcoming' && !scheduleHasEnded(todayMsk(), s.time, s.endTime, now)
  const nextLesson = todaySchedule.find(isStillUpcoming)
  const firstUpcomingIdx = todaySchedule.findIndex(isStillUpcoming)
  const hasLive = todaySchedule.some(s => s.status === 'live')
  const nowMarkerIndex = !hasLive && firstUpcomingIdx > 0 ? firstUpcomingIdx : -1

  return {
    groups,
    // Группы — основа всех цифр стола: пока их нет, любой ноль ниже ничего не
    // значит. Виджеты по нему рисуют скелетон вместо нуля.
    loading: groupsLoading,
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
