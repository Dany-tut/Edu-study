import { t } from './i18n'

/**
 * Причина сбоя сохранения курса — для карточки «Не сохранено» (docs/saving.md §4.5).
 *
 * Раньше любой сбой без своей подсказки показывался одной догадкой «сервер не
 * ответил или вход в аккаунт учителя истёк». Учитель видел её, обновлял
 * страницу — а курс и уроки на месте: сохранение пишет по шагам, и упал только
 * последний (расписание). Поэтому причина говорит две вещи: какой шаг не
 * записался (и что до него уже в базе) и почему — по коду ошибки Postgres/PostgREST.
 */
export type CourseSaveStage = 'course' | 'lessons' | 'lessonsDelete' | 'access' | 'schedule' | 'status'

export type CourseSaveError = { code?: string; message?: string; details?: string } | null | undefined

const STAGE: Record<CourseSaveStage, () => string> = {
  course: () => t('курс не записан'),
  lessons: () => t('курс записан, а уроки — нет'),
  lessonsDelete: () => t('уроки записаны, но удалённые уроки остались в базе'),
  access: () => t('уроки записаны, а доступ учеников — нет'),
  schedule: () => t('уроки записаны, а расписание — нет'),
  status: () => t('всё записано, кроме статуса публикации'),
}

export function courseSaveStageText(stage: CourseSaveStage): string {
  const text = STAGE[stage]()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function courseSaveCause(error: CourseSaveError): string {
  if (!error) return t('сервер не подтвердил запись.')
  const code = error.code ?? ''
  const message = error.message ?? ''
  if (code === 'PGRST301' || code === 'PGRST302' || code === 'PGRST303' || /jwt|token.*expired/i.test(message)) {
    return t('вход в аккаунт учителя истёк. Войдите заново и нажмите «Повторить».')
  }
  if (code === '42501' || /row-level security|permission denied/i.test(message)) {
    return t('база не дала прав на запись — обычно это значит, что вход в аккаунт учителя истёк.')
  }
  if (!code && /failed to fetch|load failed|network|abort|timeout|timed out/i.test(message)) {
    return t('нет связи с сервером.')
  }
  if (code === '23505') return `${t('такая запись уже есть в базе.')}${error.details ? ` ${error.details}` : ''}`
  if (code === '23503') return t('запись ссылается на то, чего в базе уже нет.')
  return `${t('ошибка базы')}${code ? ` ${code}` : ''}${message ? `: ${message}` : '.'}`
}

/** «Уроки записаны, а расписание — нет: нет связи с сервером.» */
export function courseSaveReason(stage: CourseSaveStage, error: CourseSaveError): string {
  return `${courseSaveStageText(stage)}: ${courseSaveCause(error)}`
}
