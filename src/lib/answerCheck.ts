// ─────────────────────────────────────────────────────────────────────────────
// Задание без ответа не сохраняется — и учитель узнаёт почему
//
// Раньше такое задание либо молча не сохранялось (кнопка серая, клик — тишина),
// либо уезжало в базу как есть, и ученику засчитывался «неверный» ответ на
// вопрос, у которого верного нет. Теперь каждое сохранение спрашивает эту
// проверку и, если где-то ответа нет, говорит алертом, где именно.
// ─────────────────────────────────────────────────────────────────────────────

import { alertDialog } from '../components/ConfirmHost'
import { taskTypeDef, type TaskPayload } from '../data/taskTypes'
import type { DiagQuestion } from '../data/diagnosticData'
import { t } from './i18n'

/**
 * Задание ждёт ответ от учителя, а он не проставлен.
 * Типы на проверку учителем (развёрнутый ответ, эссе, речь) ответа не требуют,
 * сложные задания тоже — их разбирают раундами.
 */
export function isMissingAnswer(task: TaskPayload): boolean {
  if (task.isHard) return false
  const d = taskTypeDef(task.type)
  if (d.needsTeacherReview) return false
  if (!d.isGradable(task)) return true
  // У выбора заготовка сразу отмечает первый вариант — пустой отмеченный вариант
  // тоже «ответа нет».
  if (d.id === 'single' || d.id === 'multi') {
    const choices = task.choices ?? []
    return !(task.correctChoices ?? []).some(i => !!choices[i]?.trim())
  }
  return false
}

/**
 * Вопрос теста/диагностики без ответа: у термина пустой список принимаемых,
 * у выбора отмеченный вариант пуст (или вариантов меньше двух).
 * Блоки скрининга устроены иначе и сюда не попадают.
 */
export function isDiagMissingAnswer(q: DiagQuestion): boolean {
  if ((q as { type?: string }).type === 'screening') return false
  if (q.kind === 'term') return !(q.accepts ?? []).some(a => a.trim())
  return q.options.filter(o => o.trim()).length < 2 || !q.options[q.correct]?.trim()
}

/** «Задание 2, Задание 5» — номера по порядку, с единицы. */
export function missingAnswerLabels(tasks: TaskPayload[], prefix = t('Задание')): string[] {
  return tasks.flatMap((task, i) => (isMissingAnswer(task) ? [`${prefix} ${i + 1}`] : []))
}

/**
 * Заголовок «что не вышло — почему» переносится только по тире: тире остаётся
 * в конце первой строки, причина целиком уходит на вторую. Иначе выходило
 * «…сохранить — не / проставлен ответ» с висящим «не».
 */
export function breakAtDash(title: string): string {
  const i = title.indexOf(' — ')
  if (i < 0) return title
  return `${title.slice(0, i)}\u00A0— ${title.slice(i + 3).replace(/ /g, '\u00A0')}`
}

/**
 * Алерт «не получится сохранить». `where` — что именно без ответа
 * («Задание 3», «Урок 2 · Задание 1»); `null` — речь об одном открытом задании,
 * перечислять нечего. Возвращает true, если алерт показан — вызывающий в этом
 * случае прекращает сохранение.
 */
export function alertMissingAnswers(where: string[] | null, hint?: string): boolean {
  if (where && !where.length) return false
  const tail = hint ?? t('Отметьте правильный ответ и сохраните ещё раз.')
  const list = !where ? '' : where.length > 6 ? `${where.slice(0, 6).join(', ')} ${t('и ещё')} ${where.length - 6}` : where.join(', ')
  void alertDialog({
    title: breakAtDash(t('Не получится сохранить — не проставлен ответ')),
    message: where ? `${t('Без ответа:')} ${list}. ${tail}` : tail,
    tone: 'danger',
  })
  return true
}
