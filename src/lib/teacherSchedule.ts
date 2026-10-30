import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useGroups, useAllStudents } from './useGroups'

/*
 * Расписание учителя на неделю + перенос занятий (экран «Расписание»).
 *
 * Читаем schedule_lessons напрямую: у таблицы нет владельца, поэтому, как и
 * виджет «Сегодня», оставляем строки своих групп и своих учеников. Групповое
 * занятие бывает строкой группы И строками её учеников с той же датой, временем
 * и темой (0117) — в ленте это одно занятие, строки учеников прячем.
 *
 * Меняем только через функции 0121 (schedule_move / _shift / _cancel): они
 * двигают двойники вместе, пишут дату в урок курса и сроки его ДЗ и шлют
 * ученикам уведомление. Каждая возвращает снимок `undo` для «Отменить» в тосте.
 */

export interface SchedItem {
  id: string
  /** YYYY-MM-DD — день по часам школы (Москва). */
  date: string
  time: string
  endTime: string
  title: string
  /** Номер урока, 0-based как в базе; подпись — +1. */
  number: number | null
  groupId: string | null
  studentId: string | null
  who: string
  color: string
  cancelled: boolean
  rec: boolean
  /** Строка родилась из урока курса — перенос пишет дату и в урок. */
  fromCourse: boolean
}

export type SchedUndo = Record<string, unknown>

const p2 = (n: number) => String(n).padStart(2, '0')
export const isoDay = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`

/** Сегодня по Москве — расписание школы живёт в её часах. */
export function todayMsk(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date())
  } catch {
    return isoDay(new Date())
  }
}

/** YYYY-MM-DD ± дни, без часовых поясов (полдень — чтобы перевод часов не съел день). */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00`)
  d.setDate(d.getDate() + n)
  return isoDay(d)
}

/** Понедельник недели, в которой лежит день. */
export function weekStart(day: string): string {
  const d = new Date(`${day}T12:00:00`)
  return addDays(day, -((d.getDay() + 6) % 7))
}

export function useTeacherWeek(start: string) {
  const { groups } = useGroups()
  const students = useAllStudents()
  const [items, setItems] = useState<SchedItem[] | null>(null)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick(n => n + 1), [])

  useEffect(() => {
    let alive = true
    // DEV без входа: групп нет (getOwnerId = null) — показываем пример недели,
    // как журнал и проверка (teacherDevDemo). Действия тогда упадут на сервере.
    if (import.meta.env.DEV && groups.length === 0) {
      setItems(devWeek(start))
      return
    }
    supabase
      .from('schedule_lessons')
      .select('id, date, time_start, time_end, lesson_title, lesson_number, group_id, student_id, status, node_type, lesson_id, groups(name, color)')
      .gte('date', start)
      .lte('date', addDays(start, 6))
      .then(({ data, error }) => {
        if (!alive) return
        if (error) { console.error('[schedule] week load failed', error); setItems([]); return }
        const myGroups = new Map(groups.map(g => [g.id, g]))
        const myStudents = new Map(students.map(s => [s.id, s]))
        type Row = {
          id: string; date: string; time_start: string | null; time_end: string | null
          lesson_title: string | null; lesson_number: number | null
          group_id: string | null; student_id: string | null; status: string | null
          node_type: string | null; lesson_id: string | null
          groups: { name: string; color: string | null } | null
        }
        const rows = ((data ?? []) as unknown as Row[]).filter(r =>
          (r.group_id && myGroups.has(r.group_id)) || (r.student_id && myStudents.has(r.student_id)))
        const key = (r: Row) => `${r.date}|${(r.time_start ?? '').padStart(5, '0')}|${r.lesson_title ?? ''}|${r.node_type ?? ''}`
        const groupKeys = new Set(rows.filter(r => r.group_id).map(r => `${r.group_id}|${key(r)}`))
        const out: SchedItem[] = []
        for (const r of rows) {
          const stu = r.student_id ? myStudents.get(r.student_id) : undefined
          // Строка ученика при строке его группы — двойник группового занятия.
          if (!r.group_id && stu?.groupId && groupKeys.has(`${stu.groupId}|${key(r)}`)) continue
          out.push({
            id: r.id,
            date: String(r.date).slice(0, 10),
            time: (r.time_start ?? '').padStart(5, '0').slice(0, 5),
            endTime: (r.time_end ?? '').slice(0, 5),
            title: r.lesson_title ?? '',
            number: r.lesson_number,
            groupId: r.group_id,
            studentId: r.student_id,
            who: r.groups?.name ?? stu?.name ?? '',
            color: r.groups?.color ?? 'var(--color-purple)',
            cancelled: r.status === 'cancelled',
            rec: r.node_type === 'rec',
            fromCourse: !!r.lesson_id,
          })
        }
        out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        setItems(out)
      })
    return () => { alive = false }
  }, [start, groups, students, tick])

  return { items, reload }
}

function devWeek(start: string): SchedItem[] {
  const base = { endTime: '', number: null, studentId: null, cancelled: false, rec: false, fromCourse: false }
  const mk = (d: number, time: string, who: string, title: string, color: string, extra: Partial<SchedItem> = {}): SchedItem =>
    ({ ...base, id: `dev-${d}-${time}`, date: addDays(start, d), time, endTime: time.replace(/^(\d\d)/, h => String(Number(h) + 1).padStart(2, '0')).replace(/:00$/, ':30'), who, title, color, groupId: 'dev', ...extra })
  return [
    mk(1, '16:00', 'Био ОГЭ 2027', 'Клетка', '#3FCC8A'),
    mk(3, '12:00', 'Хим ЕГЭ 2027', 'Электролиз', '#786AD7', { number: 6, fromCourse: true }),
    mk(3, '17:30', 'Аня К.', 'Индивидуально', '#F59E0B', { groupId: null, studentId: 'dev-s' }),
    mk(4, '16:00', 'Хим ЕГЭ 2027', 'Гидролиз', '#786AD7', { number: 7, fromCourse: true }),
    mk(5, '12:00', 'Био ЕГЭ 2027', 'Ботаника: ткани', '#3FCC8A', { cancelled: true }),
  ]
}

type Result = { undo: SchedUndo; moved: number }

async function call(fn: string, args: Record<string, unknown>): Promise<Result> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as Result
}

export const scheduleMove = (id: string, date: string, time: string | null, notify = true) =>
  call('schedule_move', { p_id: id, p_date: date, p_time: time, p_notify: notify })

export const scheduleShift = (id: string, notify = true) =>
  call('schedule_shift', { p_id: id, p_notify: notify })

export const scheduleCancel = (id: string, notify = true) =>
  call('schedule_cancel', { p_id: id, p_notify: notify })

/** Разовое занятие «+» на выбранный день (0122_schedule_add.sql). */
export const scheduleAdd = (groupId: string | null, studentId: string | null, title: string, date: string, time: string, notify = true) =>
  call('schedule_add', { p_group: groupId, p_student: studentId, p_title: title, p_date: date, p_time: time, p_notify: notify })

/**
 * Будущие занятия группы на ~6 недель вперёд — список для «+»: какой урок уже
 * стоит в расписании и на какой день. Групповое занятие бывает строкой группы и
 * двойниками учеников (0117) — берём одно, строку группы предпочитаем.
 */
export async function fetchGroupUpcoming(groupId: string): Promise<SchedItem[]> {
  const today = todayMsk()
  const { data } = await supabase
    .from('schedule_lessons')
    .select('id, date, time_start, time_end, lesson_title, lesson_number, group_id, student_id, status, node_type, lesson_id')
    .eq('group_id', groupId)
    .gte('date', today)
    .lte('date', addDays(today, 42))
    .neq('status', 'cancelled')
    .order('date')
    .order('time_start')
  type Row = {
    id: string; date: string; time_start: string | null; time_end: string | null
    lesson_title: string | null; lesson_number: number | null
    group_id: string | null; student_id: string | null
    status: string | null; node_type: string | null; lesson_id: string | null
  }
  const seen = new Set<string>()
  const out: SchedItem[] = []
  for (const r of (data ?? []) as Row[]) {
    const key = `${r.date}|${(r.time_start ?? '').padStart(5, '0')}|${r.lesson_title ?? ''}|${r.node_type ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      id: r.id,
      date: String(r.date).slice(0, 10),
      time: (r.time_start ?? '').padStart(5, '0').slice(0, 5),
      endTime: (r.time_end ?? '').slice(0, 5),
      title: r.lesson_title ?? '',
      number: r.lesson_number,
      groupId: r.group_id,
      studentId: r.student_id,
      who: '',
      color: 'var(--color-purple)',
      cancelled: false,
      rec: r.node_type === 'rec',
      fromCourse: !!r.lesson_id,
    })
  }
  return out
}

export async function scheduleUndo(undo: SchedUndo) {
  const { error } = await supabase.rpc('schedule_undo', { p_undo: undo })
  if (error) throw new Error(error.message)
}

/** Текст ошибки функции для тоста: «Это занятие не ваше» и т. п. — как есть, прочее — общее. */
export function scheduleError(e: unknown): string {
  const m = e instanceof Error ? e.message : ''
  return /[а-яё]/i.test(m) ? m : 'Не получилось — попробуйте ещё раз'
}
