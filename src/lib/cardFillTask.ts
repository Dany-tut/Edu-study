// ── Задача «заполнить карточку» ──────────────────────────────────────────────
// ЗАЧЕМ. Карточку-направление заводят на бегу — из карточки ученика или (дальше)
// прямо при выдаче курса. Заводится она из того, что известно в этот момент:
// имя, предмет, уровень, контакты и связка с аккаунтом. Не заполнены цена
// занятия, дата старта, желаемый балл — то, о чём в тот момент не спрашивают и
// что потом всплывает в финансах и журнале пустотой.
//
// Поэтому создание карточки оставляет след в «Моих задачах» со ссылкой на саму
// карточку: клик по задаче открывает её. Гасится задача обычной галочкой —
// «заполненность» карточки формально не определить, и автоснятие врало бы.

import { useTeacher } from '../store/teacherStore'
import { t } from './i18n'

/** Тип задачи. По нему же ищем дубль, чтобы не плодить строку на каждый курс. */
export const CARD_FILL_TASK = 'card-fill'

function todayStr(): string {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

/**
 * Завести напоминание про новую карточку. Повторный вызов по той же карточке
 * ничего не делает, пока прошлая задача не закрыта: два курса по японскому — не
 * повод для двух одинаковых строк в списке.
 */
export function ensureCardFillTask(opts: {
  studentId: string
  groupId: string
  name: string
  subject: string
}): void {
  const st = useTeacher.getState()
  const dup = st.tasks.some(task =>
    !task.done && task.typeId === CARD_FILL_TASK && task.studentId === opts.studentId)
  if (dup) return
  st.addTask({
    typeId: CARD_FILL_TASK,
    typeLabel: t('Карточка'),
    typeBg: 'var(--color-blue-pill-bg)',
    typeColor: 'var(--color-blue-pill-text)',
    title: `${t('Заполнить карточку')}: ${opts.name}${opts.subject ? ` · ${opts.subject}` : ''}`,
    date: todayStr(),
    time: '',
    comment: t('Карточка заведена автоматически: проверьте уровень, цену занятия, дату старта и желаемый балл.'),
    studentId: opts.studentId,
    groupId: opts.groupId,
  })
}
