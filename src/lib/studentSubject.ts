// ─────────────────────────────────────────────────────────────────────────────
// Предмет ученика — одно место для всех платформ
//
// Откуда берётся предмет (вариант Б, 08.11.2026):
//   1. Группа или карточка 1:1 — `groups.subject`. Если ученик в группе, это
//      главный источник: предмет занятий важнее записи в профиле.
//   2. Ученик без группы — своя колонка `students.subject`, учитель указывает
//      её при создании.
//   3. Ни того, ни другого — предмета нет. Тогда предметные виджеты не
//      показываются (см. widgetVisibility.ts).
//
// Значение — id реестра (`src/lib/subjects.ts`) или своя строка учителя.
// Кабинет учителя (ПК и мобильный) и главная ученика читают предмет только
// через этот модуль, чтобы платформы не расходились.
// ─────────────────────────────────────────────────────────────────────────────

import { getSubject } from './subjects'

/** id реестра для известного предмета, иначе обрезанная строка; пусто → null. */
export function normalizeStudentSubject(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return getSubject(trimmed)?.id ?? trimmed
}

/** Предмет ученика: группа или карточка 1:1 главнее собственной колонки. */
export function resolveStudentSubject(input: {
  groupSubject?: string | null
  ownSubject?: string | null
}): string | null {
  return normalizeStudentSubject(input.groupSubject) ?? normalizeStudentSubject(input.ownSubject)
}

/** Подпись предмета для интерфейса: имя из реестра или своя строка как есть. */
export function studentSubjectLabel(subject: string | null | undefined): string | null {
  const normalized = normalizeStudentSubject(subject)
  if (!normalized) return null
  return getSubject(normalized)?.name ?? normalized
}

/** Поле «Предмет» обязательно при создании ученика: пустая строка не подходит. */
export function isStudentSubjectValid(value: string | null | undefined): boolean {
  return normalizeStudentSubject(value) !== null
}

/**
 * Список предметов для выбора: предметы учителя (profiles.subjects), без дублей,
 * в исходном порядке. `selected`, которого нет в списке (старый черновик,
 * предмет группы), добавляется в конец, чтобы поле не показывало пустоту.
 */
export function studentSubjectOptions(teacherSubjects: readonly string[], selected?: string | null): string[] {
  const out: string[] = []
  for (const value of [...teacherSubjects, selected ?? '']) {
    const normalized = normalizeStudentSubject(value)
    if (normalized && !out.includes(normalized)) out.push(normalized)
  }
  return out
}

/** Если у учителя ровно один предмет — его подставляем сразу. */
export function defaultStudentSubject(teacherSubjects: readonly string[]): string {
  const options = studentSubjectOptions(teacherSubjects)
  return options.length === 1 ? options[0] : ''
}

/**
 * Скоуп предметов для виджетов главной ученика.
 *
 * `override` — предмет экрана (тренажёр). Иначе активный курс, затем все курсы
 * ученика. Курсов с предметом нет — собственный предмет ученика
 * (`students.subject`). Пустой набор после загрузки значит «предмета нет».
 */
export function widgetSubjectScope(input: {
  courses: ReadonlyArray<{ id: string; subject?: string | null }>
  activeCourseId?: string | null
  override?: string | null
  profileSubject?: string | null
}): Set<string> {
  const override = getSubject(input.override)?.id
  if (override) return new Set([override])
  const active = input.courses.find(course => course.id === input.activeCourseId) ?? input.courses[0]
  const one = getSubject(active?.subject)?.id
  if (one) return new Set([one])
  const all = input.courses.map(course => getSubject(course.subject)?.id).filter((id): id is string => !!id)
  if (all.length) return new Set(all)
  const own = getSubject(input.profileSubject)?.id
  return own ? new Set([own]) : new Set()
}
