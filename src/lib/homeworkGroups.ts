import type { Lesson } from '../data/mockData'
import { getDisplayLessonStatus, type LessonDisplayStatus } from './lessonStatus'

// ─────────────────────────────────────────────────────────────────────────────
// Список «ДЗ» ученика: группы, фильтр, сортировка и поиск — БЕЗ разметки.
//
// Одна логика на все версии (iPhone, iPad, Android): каждая рисует группы по
// своим правилам (platforms.md), но что куда попадает и в каком порядке —
// решается здесь, чтобы ученик видел одно и то же на любом устройстве.
// ─────────────────────────────────────────────────────────────────────────────

/** Группа на экране, сверху вниз: что исправить → что сделать → что сдано → что ещё закрыто. */
export type HomeworkGroupId = 'fix' | 'active' | 'done' | 'locked'
/** «Показывать»: все группы или одна. */
export type HomeworkShow = 'all' | 'fix' | 'active' | 'done'
/** Порядок внутри группы. */
export type HomeworkSort = 'order' | 'recent' | 'score'

export type HomeworkFilters = {
  show: HomeworkShow
  sort: HomeworkSort
  /** Спрятать ещё закрытые уроки (группа «Скоро»). */
  hideLocked: boolean
  search: string
}

export const DEFAULT_HOMEWORK_FILTERS: HomeworkFilters = { show: 'all', sort: 'order', hideLocked: false, search: '' }

/** Подписи групп и вариантов — русские ключи словаря (переводятся через t()). */
export const HOMEWORK_GROUP_LABEL: Record<HomeworkGroupId, string> = {
  fix: 'Исправить',
  active: 'Текущие',
  done: 'Сдано',
  locked: 'Скоро',
}
export const HOMEWORK_SHOW_OPTIONS: Array<{ id: HomeworkShow; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'fix', label: 'Исправить' },
  { id: 'active', label: 'Текущие' },
  { id: 'done', label: 'Сдано' },
]
export const HOMEWORK_SORT_OPTIONS: Array<{ id: HomeworkSort; label: string }> = [
  { id: 'order', label: 'По порядку уроков' },
  { id: 'recent', label: 'Сначала новые' },
  { id: 'score', label: 'По баллу' },
]

/** В какую группу попадает урок с таким статусом. */
export function homeworkGroupOf(status: LessonDisplayStatus): HomeworkGroupId {
  switch (status) {
    case 'returned':
    case 'test_low':
      return 'fix'
    case 'completed':
    case 'test_passed':
      return 'done'
    case 'locked':
      return 'locked'
    default:
      // current, unviewed, submitted, submitted_unknown — в работе или на проверке.
      return 'active'
  }
}

export type HomeworkRow = { lesson: Lesson; status: LessonDisplayStatus; group: HomeworkGroupId }
export type HomeworkGroup = { id: HomeworkGroupId; label: string; rows: HomeworkRow[] }

const GROUP_ORDER: HomeworkGroupId[] = ['fix', 'active', 'done', 'locked']

/** Сколько фильтров отличается от умолчания — для точки на кнопке «Фильтры». */
export function activeHomeworkFilterCount(f: HomeworkFilters): number {
  return (f.show !== 'all' ? 1 : 0) + (f.sort !== 'order' ? 1 : 0) + (f.hideLocked ? 1 : 0)
}

/** Разложить уроки по группам с учётом фильтров. Пустые группы не возвращаются. */
export function groupHomework(lessons: Lesson[], filters: HomeworkFilters, now: Date = new Date()): HomeworkGroup[] {
  const q = filters.search.trim().toLowerCase()
  const rows: HomeworkRow[] = []
  for (const lesson of lessons) {
    if (q && !(lesson.title.toLowerCase().includes(q) || String(lesson.number + 1).includes(q))) continue
    const status = getDisplayLessonStatus(lesson, now)
    const group = homeworkGroupOf(status)
    if (filters.hideLocked && group === 'locked') continue
    if (filters.show !== 'all' && group !== filters.show) continue
    rows.push({ lesson, status, group })
  }
  const byOrder = (a: HomeworkRow, b: HomeworkRow) => a.lesson.number - b.lesson.number
  const sorter =
    filters.sort === 'recent' ? (a: HomeworkRow, b: HomeworkRow) => b.lesson.number - a.lesson.number
    : filters.sort === 'score' ? (a: HomeworkRow, b: HomeworkRow) => (a.lesson.points ?? Infinity) - (b.lesson.points ?? Infinity) || byOrder(a, b)
    : byOrder
  return GROUP_ORDER
    .map(id => ({ id, label: HOMEWORK_GROUP_LABEL[id], rows: rows.filter(r => r.group === id).sort(sorter) }))
    .filter(g => g.rows.length > 0)
}
