import { saveTeacherLesson } from './teacherLessonSession'
import { todayMsk, type SchedItem } from './teacherSchedule'

/*
 * «Начать урок / Завершить урок» из календаря учителя на ПК.
 *
 * Завершённое занятие (schedule_lessons.status = 'completed') сразу открывает
 * ученикам ДЗ живого урока (lib/homeworkAccess). Не нажали — ДЗ откроется по
 * концу урока по расписанию. У записи этих кнопок нет: она не идёт, а
 * открывается в момент «Запись доступна с».
 */

export type LessonLifecycleAction = 'start' | 'complete'

type LifecycleItem = Pick<SchedItem, 'id' | 'date' | 'time' | 'cancelled' | 'rec' | 'recording' | 'status'>

/** Какое действие уместно сейчас, или null — кнопку не показываем. */
export function lessonLifecycleAction(item: LifecycleItem, now = Date.now()): LessonLifecycleAction | null {
  if (item.cancelled || item.rec || item.recording || item.status === 'cancelled' || item.status === 'completed') return null
  if (item.status === 'live') return 'complete'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !/^\d{2}:\d{2}$/.test(item.time)) return null
  const start = Date.parse(`${item.date}T${item.time}:00+03:00`) // расписание — по Москве
  if (!Number.isFinite(start)) return null
  // Время урока уже пришло, а «Начать» не нажимали — сразу «Завершить».
  if (now >= start) return 'complete'
  return item.date === todayMsk() ? 'start' : null
}

/**
 * Точка расширения для внешних систем урока (ONIX и т. п.): подписчик узнаёт,
 * что учитель начал или завершил занятие. Интеграций пока нет — список пуст.
 */
type LifecycleListener = (event: { action: LessonLifecycleAction; scheduleId: string }) => void
const listeners = new Set<LifecycleListener>()
export function onLessonLifecycle(listener: LifecycleListener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export async function runLessonLifecycle(item: LifecycleItem, action: LessonLifecycleAction): Promise<void> {
  // Сервер завершает только начатое занятие: не нажатое «Начать» ставим сами.
  if (action === 'complete' && item.status !== 'live') await saveTeacherLesson(item.id, { action: 'start' })
  await saveTeacherLesson(item.id, { action })
  for (const listener of listeners) {
    try { listener({ action, scheduleId: item.id }) } catch { /* чужая интеграция не ломает урок */ }
  }
}
