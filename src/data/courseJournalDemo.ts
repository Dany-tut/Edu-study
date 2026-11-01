import { DEMO_GROUPS, DEMO_STUDENTS_BY_GROUP } from './teacherDevDemo'
import type { CourseJournalData, CourseJournalLesson, JournalWork } from '../lib/courseJournal'

/** Only imported in development without a teacher session; never persists fake ids. */
export function journalDemo(): CourseJournalData {
  const day = (offset: number) => {
    const date = new Date(); date.setDate(date.getDate() + offset)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  const group = DEMO_GROUPS[0]
  const students = [...DEMO_STUDENTS_BY_GROUP[group.id], {
    ...DEMO_STUDENTS_BY_GROUP['demo-g-sonya'][0], groupId: '',
  }]
  const courses = [
    { id: 'demo-chem', short_id: 'demo-chem', title: 'ЕГЭ по химии · 2026/27', subject: 'Химия', kind: 'course', group_ids: [group.id], student_ids: [students[6].id] },
    { id: 'demo-bio', short_id: 'demo-bio', title: 'ЕГЭ по биологии · 2026/27', subject: 'Биология', kind: 'course', group_ids: [group.id], student_ids: [] },
    { id: 'demo-intensive', short_id: 'demo-intensive', title: 'Органика за 14 дней', subject: 'Химия', kind: 'intensive', group_ids: [group.id], student_ids: [students[6].id] },
  ]
  const titles = [
    ['Строение атома', 'Периодический закон', 'Химическая связь', 'Контрольная работа', 'Степени окисления', 'Окислительно-восстановительные реакции', 'Неорганические вещества', 'Итоговый тест'],
    ['Клеточная теория', 'Органоиды клетки', 'Обмен веществ', 'Контрольная работа', 'Фотосинтез', 'Клеточное дыхание', 'Деление клетки', 'Итоговый тест'],
    ['Углеводороды', 'Алканы и циклоалканы', 'Алкены', 'Контрольная работа', 'Алкины', 'Арены', 'Цепочки превращений', 'Итоговый тест'],
  ]
  const data: CourseJournalData = { courses, students, groups: [group], lessons: [], modules: [], events: [], work: [], assignments: [], marks: [], legacy: [], attempts: [], warnings: [], demo: true }
  for (const [ci, course] of courses.entries()) {
    data.modules.push({ id: `${course.id}-m1`, course_id: course.id, label: ci === 2 ? 'Углеводороды' : 'Основы предмета', position: 0 },
      { id: `${course.id}-m2`, course_id: course.id, label: 'Практика и закрепление', position: 1 })
    for (const [li, title] of titles[ci].entries()) {
      const lesson: CourseJournalLesson = {
        id: `${course.id}-l${li}`, short_id: `${course.id}-l${li}`, course_id: course.id,
        module_id: `${course.id}-m${li < 4 ? 1 : 2}`, title, kind: li === 3 || li === 7 ? 'test' : 'lesson', position: li, lesson_number: li,
        scheduled_date: day(-18 + li * 3), scheduled_time: ci === 0 ? '16:00' : ci === 1 ? '18:00' : '19:30',
        rec_date: null, rec_time: null, lesson_sched_manual: false, delivery_mode: 'live', youtube_url: 'demo-video',
        hwTask: {}, recTask: null, hwDate: day(-16 + li * 3), recHwDate: null,
      }
      data.lessons.push(lesson)
      const event = { id: `demo-event-${ci}-${li}`, lesson_id: lesson.id, node_type: 'lesson', group_id: group.id, student_id: null,
        date: lesson.scheduled_date!, time_start: lesson.scheduled_time!, time_end: ci === 0 ? '17:30' : '20:00', lesson_title: title, subject: course.subject, status: li < 6 ? 'completed' : 'upcoming' }
      data.events.push(event)
      const marks: Record<string, boolean | null> = {}
      for (const [si, student] of students.entries()) {
        if (si === 6 && ci === 1) continue
        if (si === 6) data.events.push({ ...event, id: `${event.id}-direct`, group_id: null, student_id: student.id })
        const key = (si * 3 + li + ci * 2) % 9
        const past = li < 6
        const present = past && lesson.kind !== 'test' ? key === 4 ? false : key === 5 ? null : true : null
        if (si < 6) marks[student.id] = present
        else data.marks.push({ schedule_id: `${event.id}-direct`, attendance: { [student.id]: present } })
        if (present !== null && past) data.legacy.push({ student_id: student.id, lesson_date: event.date, lesson_title: title, present, grade: present ? 4 : null })
        if (!past || key === 6) continue
        const status = key === 2 ? 'submitted' : key === 3 ? 'returned' : 'completed'
        const score = key === 7 ? 48 : key === 8 ? 0 : 80 + (si + li + ci * 3) % 21
        const row: JournalWork = { id: `demo-work-${ci}-${li}-${si}`, student_id: student.id, lesson_ref: lesson.short_id,
          status, score: status === 'submitted' ? null : score,
          attachments: { v: 'basic-1', recommendationScore: 80, rows: [{ type: 'text', verdict: status === 'submitted' ? 'review' : 'correct' }] },
          updated_at: `${day(-17 + li * 3)}T12:00:00Z`, review_comment: status === 'returned' ? 'Проверьте ход решения и пришлите исправленный ответ.' : null }
        data.work.push(row)
        data.attempts.push({ id: `demo-attempt-${row.id}`, student_id: student.id, lesson_ref: lesson.short_id, number: 1,
          status, score: row.score, passing_score: 80, submitted_at: row.updated_at, review_comment: row.review_comment ?? null })
        if (key === 1) data.attempts.push({ ...data.attempts[data.attempts.length - 1], id: `demo-retake-${row.id}`, number: 2, score: 96, status: 'completed' })
        if (present === false || key === 5) data.work.push({ ...row, id: `demo-watch-${row.id}`, lesson_ref: `video-${lesson.short_id}`, status: 'completed', score: null,
          attachments: { video: { completed: present === false, ranges: [[0, 900]], duration: 1000 } } })
      }
      data.marks.push({ schedule_id: event.id, attendance: marks })
    }
  }
  // Two independent subjects really share a date; filtering never merges them.
  data.events.push({ id: 'demo-outside-event', lesson_id: null, node_type: 'lesson', group_id: group.id, student_id: null,
    date: day(-1), time_start: '15:00', time_end: '16:00', lesson_title: 'Разбор вопросов перед пробником', subject: 'Химия', status: 'completed' })
  return data
}
