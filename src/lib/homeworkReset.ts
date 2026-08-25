// ─────────────────────────────────────────────────────────────────────────────
// Сверка сданной домашки с базой
//
// ЗАЧЕМ. Учитель обнуляет курс (Конструктор → «Кому дать доступ» → ↺) — строки
// lesson_progress по этому курсу удаляются, и трек ученика честно возвращается
// в начало. Но домашка живёт не только в базе: ответы, отметки «проверено»,
// подсказки, балл, самооценка и просмотр записи лежат в localStorage — чтобы
// недоделанная домашка переживала перезагрузку. После сброса курс становился
// пустым, а домашка первого юнита продолжала показывать «Домашка сдана · 25 из
// 100» с разбором ошибок: сдачи нет ни у кого, кроме одного браузера.
//
// ПРАВИЛО. Сдача — факт со стороны базы. Нет строки lesson_progress — нет и
// сдачи: локальный результат урока стирается целиком (ответы вместе с баллом и
// просмотром видео), урок открывается заново.
//
// ЧЕГО НЕ ТРОГАЕМ.
// • Недоделанную домашку. Пока ученик не сдал, строки в базе НЕТ и быть не
//   должно — это нормальное состояние черновика, а не сброс. Чистим только то,
//   что само объявило себя сданным.
// • Свежую сдачу. Запись могла не дойти (сеть, истёкшая сессия): на экране
//   висит «Отправить ещё раз», и стереть в этот момент ответы — потерять
//   работу. Первые GRACE_MS после сдачи урок неприкосновенен.
// • Уроки курсов, которых нет в загруженном каталоге, и всё вообще, если базу
//   спросить не удалось. Каталог и прогресс читаются одним охватом
//   (fetchPersonScope) и одним запросом: отвалилась сеть — оба пусты, и пустая
//   карта «мы не знаем» не должна выглядеть как «ничего не сдано».
// ─────────────────────────────────────────────────────────────────────────────

import { clearVideoWatchLocal } from './videoProgress'

/** Ключ черновика домашки урока в localStorage. Один на приложение. */
export function homeworkStorageKey(lessonId: string): string {
  return `student-dashboard:homework:${lessonId}`
}

/**
 * Отметка «курс обнулён» — строка lesson_progress, которую пишет учитель.
 *
 * Момент сброса больше негде хранить: строк по курсу после удаления нет, а
 * localStorage знает только тот браузер, где нажали кнопку — с другого
 * устройства (и у второго учителя) подпись превращалась в «прогресса нет», а
 * после сброса, которому нечего было удалять, показывала время ПРЕДЫДУЩЕГО.
 * Ключ включает курс: пара (student_id, lesson_ref) уникальна, и общий
 * 'course-reset' затирал бы отметку соседнего курса того же ученика.
 *
 * Время лежит в `comment` (ISO): ProgressMap не носит updated_at.
 * Строка служебная — исключается из статистики ученика (lib/db.ts) и из счёта
 * прогресса в редакторе курса.
 */
export const COURSE_RESET_PREFIX = 'course-reset:'
export const courseResetRef = (courseId: string): string => `${COURSE_RESET_PREFIX}${courseId}`
export const isCourseResetRef = (ref: string): boolean => ref.startsWith(COURSE_RESET_PREFIX)
/** Курс из ключа отметки: 'course-reset:seed-kohg-1' → 'seed-kohg-1'. */
export const courseOfResetRef = (ref: string): string => ref.slice(COURSE_RESET_PREFIX.length)

/** Сколько сдача считается «свежей» и не сверяется с базой. */
const GRACE_MS = 15 * 60 * 1000

/** Только те поля черновика, которые нужны сверке. */
type DraftShape = {
  basicSubmitted?: boolean
  hardSubmitted?: boolean
  /** ISO-время сдачи. У черновиков до этой правки поля нет — они заведомо старые. */
  submittedAt?: string
  /** ISO-время последней правки: черновик тоже имеет возраст, а не только сдача. */
  touchedAt?: string
}

function readDraft(lessonId: string): DraftShape | null {
  let raw: string | null = null
  try { raw = localStorage.getItem(homeworkStorageKey(lessonId)) } catch { return null }
  if (!raw) return null
  try { return JSON.parse(raw) as DraftShape } catch { return null }
}

/** Возраст черновика в мс, NaN — если он его не помнит (черновики до этой правки). */
function draftAge(draft: DraftShape): number {
  return Date.parse(draft.touchedAt ?? draft.submittedAt ?? '')
}

function localClaimsSubmitted(lessonId: string, now: number): boolean {
  const draft = readDraft(lessonId)
  if (!draft) return false
  if (!draft.basicSubmitted && !draft.hardSubmitted) return false
  const at = draft.submittedAt ? Date.parse(draft.submittedAt) : NaN
  if (Number.isFinite(at) && now - at < GRACE_MS) return false
  return true
}

/** Забыть локальный результат урока: ответы домашки и просмотр записи. */
export function forgetLessonHomework(lessonId: string): void {
  try { localStorage.removeItem(homeworkStorageKey(lessonId)) } catch { /* приватный режим */ }
  clearVideoWatchLocal(lessonId)
}

/**
 * Сверить локально сданные домашки с базой и стереть те, которых там нет.
 *
 * @param lessonIds уроки загруженных курсов — сверяем только их
 * @param submittedRefs lesson_ref строк, которые СВИДЕТЕЛЬСТВУЮТ О СДАЧЕ
 *   (статус submitted/returned/completed или ненулевой балл). Просто наличия
 *   строки мало: учитель открывает урок — и появляется строка со статусом
 *   'current', в которой ни ответов, ни балла. Открытый заново после сброса
 *   урок иначе выглядел бы как «сдача на месте», и стирать было бы нечего.
 * @returns id уроков, локальный результат которых стёрт
 */
export function reconcileLocalHomework(
  lessonIds: Iterable<string>,
  submittedRefs: Set<string>,
  now: number = Date.now(),
): string[] {
  const wiped: string[] = []
  for (const id of lessonIds) {
    // Базовый уровень и хард — разные строки; жива любая → сдача на месте.
    if (submittedRefs.has(id) || submittedRefs.has(`${id}-hard`)) continue
    if (!localClaimsSubmitted(id, now)) continue
    forgetLessonHomework(id)
    wiped.push(id)
  }
  return wiped
}

/**
 * Сброс по отметке учителя: стереть ВСЁ, что сделано до обнуления курса.
 *
 * Здесь, в отличие от сверки выше, стираются и недоделанные черновики: отметка
 * — это прямое «курс начат заново», а не догадка по отсутствию строки. Работа
 * ПОСЛЕ обнуления остаётся: ученик мог сесть за курс раньше, чем его браузер
 * узнал новость.
 *
 * @param lessonIds уроки обнулённого курса
 * @param resetAt момент обнуления, мс
 * @returns id уроков, локальный результат которых стёрт
 */
export function reconcileCourseReset(lessonIds: Iterable<string>, resetAt: number): string[] {
  const wiped: string[] = []
  for (const id of lessonIds) {
    const draft = readDraft(id)
    if (!draft) continue
    const age = draftAge(draft)
    if (Number.isFinite(age) && age > resetAt) continue
    forgetLessonHomework(id)
    wiped.push(id)
  }
  return wiped
}
