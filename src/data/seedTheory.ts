// ─────────────────────────────────────────────────────────────────────────────
// Возврат конспекта урокам готового курса
//
// Конспект сида живёт в коде, а в БД попадает при сохранении курса. Если урок
// сохранился с пустым `content`, дальше включается храповик: редактор читает из
// БД пустоту, показывает пустое поле «Конспект», и следующее сохранение
// записывает эту пустоту обратно. Так корейский курс доехал до состояния «текст
// есть у трёх уроков из тридцати», и своими силами уже не чинился — пересоздание
// с карточки сида стирает даты занятий, домашки и назначения.
//
// Поэтому у курса, собранного из сида, пустой конспект добирается из кода при
// открытии в редакторе. Непустой не трогаем никогда: правки учителя главнее.
//
// ПОЧЕМУ В РЕДАКТОРЕ, А НЕ ПРИ ЗАГРУЗКЕ ИЗ БД
// Курс приезжает в редактор тремя путями: снимок из БД, черновик несохранённых
// правок (sessionStorage) и свежесобранный сид с карточки. Починка на пути из БД
// лечила бы только первый — залипший черновик прошёл бы мимо неё.
// ─────────────────────────────────────────────────────────────────────────────

import { COURSE_SEEDS } from './courseSeeds'
import { lessonBody } from '../lib/lessonKey'
import type { CourseEdData } from '../pages/teacher/TeacherCourseEditorPage'

/** Название урока без номера — тот же ключ, что у сверки (см. lib/lessonKey). */
const norm = (title: string) => lessonBody(title ?? '')

/**
 * Добрать конспект из сида тем урокам курса, где он пуст.
 *
 * Курс не из сида и курс, где все конспекты на месте, возвращаются как есть —
 * сборка сида стоит заметно дороже проверки.
 *
 * Уроки сопоставляются по названию: short_id выдаётся по порядку добавления
 * урока и с порядком в курсе не связан, а номер в названии съезжает, когда в
 * сид добавляют юнит в середину.
 */
export async function restoreSeedTheory(course: CourseEdData): Promise<CourseEdData> {
  // Курс из сида опознаётся по id вида `seed-<ключ>-<владелец>`. Смотрим и на
  // dbCourseId: это тот же идентификатор со стороны БД (courses.short_id), и он
  // переживает пути, на которых локальный id мог быть перевыдан.
  const key = [course.id, course.dbCourseId]
    .map(id => id?.match(/^seed-([a-z0-9]+)(?:-|$)/)?.[1])
    .find(Boolean)
  const seed = key ? COURSE_SEEDS.find(s => s.key === key) : undefined
  if (!seed || !course.lessons.some(l => !l.theory?.trim())) return course

  const built = await seed.build(course.id)
  const bySeedTitle = new Map(built.lessons.map(l => [norm(l.title), l]))
  return {
    ...course,
    lessons: course.lessons.map(lesson => {
      if (lesson.theory?.trim()) return lesson
      const fromSeed = bySeedTitle.get(norm(lesson.title ?? ''))
      if (!fromSeed?.theory) return lesson
      return { ...lesson, theory: fromSeed.theory, theoryImages: fromSeed.theoryImages ?? [] }
    }),
  }
}
