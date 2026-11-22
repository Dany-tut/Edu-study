import { t } from './i18n'
import { trackEvent } from './analytics'

/**
 * Причина сбоя сохранения курса — для карточки «Не сохранено» (docs/saving.md §4.5).
 *
 * Два адресата, два текста. Учителю — что случилось его словами и что делать:
 * перезайти, проверить интернет, написать в поддержку. Коды Postgres/PostgREST
 * ему ничего не говорят. Технические подробности (шаг, код, сообщение базы)
 * уходят в аналитику событием `db_error` — его показывают админская сводка
 * ошибок и Stata, там сбой и разбирают.
 *
 * Шаг называем и учителю: сохранение идёт по очереди (курс → уроки → доступ →
 * расписание), и без этого «Не сохранено» при упавшем расписании выглядело
 * враньём — после обновления страницы уроки были на месте.
 */
export type CourseSaveStage = 'course' | 'lessons' | 'lessonsDelete' | 'access' | 'schedule' | 'status' | 'exception'

export type CourseSaveError = { code?: string; message?: string; details?: string; hint?: string } | null | undefined

const STAGE: Record<CourseSaveStage, () => string> = {
  course: () => t('Курс не сохранился.'),
  lessons: () => t('Уроки не сохранились.'),
  lessonsDelete: () => t('Удалённые уроки пока остаются у учеников.'),
  access: () => t('Уроки сохранены, а доступ учеников — нет.'),
  schedule: () => t('Уроки сохранены, а расписание — нет.'),
  status: () => t('Всё сохранено, кроме статуса публикации.'),
  exception: () => t('Сохранение прервалось.'),
}

export function courseSaveStageText(stage: CourseSaveStage): string {
  return STAGE[stage]()
}

type Kind = 'auth' | 'network' | 'server'

function classify(error: CourseSaveError): Kind {
  const code = error?.code ?? ''
  const message = error?.message ?? ''
  if (/^PGRST30\d$/.test(code) || code === '42501' || /jwt|token.*expired|row-level security|permission denied/i.test(message)) return 'auth'
  if (!code && /failed to fetch|load failed|networkerror|network request|abort|timeout|timed out/i.test(message)) return 'network'
  return 'server'
}

/** Что делать учителю — без кодов и терминов. */
export function courseSaveCause(error: CourseSaveError): string {
  if (error?.code === 'ISKRA_DATA_PRESERVATION' || error?.message?.includes('ISKRA_DATA_PRESERVATION')) {
    return t('Сохранение остановлено, чтобы защитить данные. Сохраните копию черновика и откройте курс заново в другой вкладке.')
  }
  if (error?.code === '23505') return t('Совпало время начала занятий.')
  switch (classify(error)) {
    case 'auth': return t('Похоже, вход в аккаунт истёк. Войдите в Искру заново в новой вкладке, вернитесь сюда и нажмите «Повторить».')
    case 'network': return t('Не получилось связаться с Искрой. Проверьте интернет и нажмите «Повторить».')
    default: return t('Сбой на нашей стороне, мы уже получили отчёт. Если «Повторить» не поможет, напишите в поддержку.')
  }
}

/**
 * Текст для учителя + отчёт в админку. Отчёт — с шагом, кодом и сообщением
 * базы: по ним сбой можно найти и исправить, не спрашивая учителя.
 */
export function courseSaveReason(stage: CourseSaveStage, error: CourseSaveError, courseId?: string): string {
  try {
    trackEvent('db_error', {
      ctx: `course_save:${stage}`,
      kind: classify(error),
      code: error?.code ?? null,
      msg: String(error?.message ?? (error ? '' : 'no row returned')).slice(0, 200),
      details: error?.details ? String(error.details).slice(0, 300) : null,
      course: courseId ?? null,
    })
  } catch { /* отчёт — по возможности, сохранение от него не зависит */ }
  return `${courseSaveStageText(stage)} ${courseSaveCause(error)}`
}
