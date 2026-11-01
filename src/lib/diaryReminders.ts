import { useEffect, useState } from 'react'
import { t } from './i18n'
import { getStudentSession } from './studentSession'
import { useNotificationsStore } from '../store/notificationsStore'
import type { ProgressMap } from './db'
import { useStudentData } from '../store/studentDataStore'

export type DiaryReminder = { id: string; title: string; course: string; at: number }
const event = 'iskra:diary-reminders'
const key = (owner: string) => 'iskra:diary-reminders:v1:' + owner
export function readDiaryReminders(owner: string): DiaryReminder[] {
  try {
    const value = JSON.parse(localStorage.getItem(key(owner)) ?? '[]')
    return Array.isArray(value)
      ? value
          .filter(
            (r): r is DiaryReminder =>
              r &&
              typeof r.id === 'string' &&
              typeof r.title === 'string' &&
              typeof r.course === 'string' &&
              typeof r.at === 'number' &&
              Number.isFinite(r.at),
          )
          .slice(0, 200)
      : []
  } catch {
    return []
  }
}
export function writeDiaryReminders(owner: string, items: DiaryReminder[]) {
  try {
    localStorage.setItem(key(owner), JSON.stringify(items))
    window.dispatchEvent(new Event(event))
    return true
  } catch {
    return false
  }
}
export function useDiaryReminders() {
  const owner = getStudentSession()?.id ?? ''
  const [items, setItems] = useState<DiaryReminder[]>(() => readDiaryReminders(owner))
  useEffect(() => {
    const sync = () => setItems(readDiaryReminders(owner))
    sync()
    window.addEventListener(event, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(event, sync)
      window.removeEventListener('storage', sync)
    }
  }, [owner])
  return {
    items,
    save: (item: DiaryReminder) =>
      writeDiaryReminders(owner, [...readDiaryReminders(owner).filter((r) => r.id !== item.id), item]),
    remove: (id: string) =>
      writeDiaryReminders(
        owner,
        readDiaryReminders(owner).filter((r) => r.id !== id),
      ),
  }
}
/** A low grade is still actionable even when a legacy row says completed. */
export function diaryReminderResolved(progress: ProgressMap, id: string): boolean {
  const row = progress[id]
  return row?.result
    ? row.result.passed || row.result.pending === true
    : row?.status === 'completed' || row?.status === 'submitted'
}
/** Local, persistent reminders appear in Iskra while the student's cabinet is open. */
export function useDiaryRemindersInit() {
  const owner = getStudentSession()?.id ?? ''
  useEffect(() => {
    if (!owner) return
    const check = () => {
      if (getStudentSession()?.id !== owner || !useStudentData.getState().loaded) return
      const items = readDiaryReminders(owner),
        progress = useStudentData.getState().progress,
        now = Date.now()
      const done = (r: DiaryReminder) => diaryReminderResolved(progress, r.id)
      const due = items.filter((r) => r.at <= now && !done(r))
      const keep = items.filter((r) => r.at > now && !done(r))
      if (keep.length === items.length || !writeDiaryReminders(owner, keep)) return
      for (const item of due)
        useNotificationsStore.getState().add({
          type: 'deadline_approaching',
          title: t('Напоминание о задании'),
          body: item.title + ' · ' + item.course,
          link: { lessonRef: item.id },
        })
    }
    check()
    const timer = window.setInterval(check, 15_000)
    window.addEventListener('focus', check)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', check)
    }
  }, [owner])
}
