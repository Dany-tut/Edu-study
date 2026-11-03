/**
 * Ответы базового уровня домашки — снимок для преподавателя.
 *
 * ЗАЧЕМ. Базовый уровень сдавался «в никуда»: `submitToSupabase('basic', …)`
 * писал в lesson_progress только балл, а сами ответы оставались в localStorage
 * ученика. Из-за этого плашка «На проверке у преподавателя» на устном задании
 * была неправдой — преподаватель не видел ни записи, ни текста, ни того, где
 * именно ученик ошибся.
 *
 * ПОЧЕМУ СНИМОК, А НЕ ССЫЛКИ НА ЗАДАНИЯ. Ответ хранится вместе с формулировкой
 * и эталоном на момент сдачи. Так преподавателю не нужно вытаскивать задания из
 * банка и повторять логику разбора (варианты хранятся по id, выбор — строкой,
 * порядок — индексами), а работа ученика не «переписывается», если задание
 * потом отредактируют. Цена — несколько килобайт JSONB на сдачу.
 *
 * Пишется в lesson_progress.attachments базовой строки (у хард-уровня своя
 * строка `<lessonId>-hard` и свой формат `{v:2, tasks}` — они не пересекаются).
 */
import { t } from './i18n'
import { parseLessonSelfAssessment, type LessonSelfAssessment } from './lessonSelfAssessment'


/** Как машина оценила один ответ. */
export type BasicAnswerVerdict =
  | 'correct'  // автопроверка сошлась
  | 'wrong'    // автопроверка не сошлась
  | 'hint'     // ответ открыт подсказкой — балл не начислен
  | 'review'   // без автопроверки: устное, описание картинки, доска
  | 'skip'     // устное задание, от записи отказались («не могу записать»)
  | 'empty'    // задание оставлено пустым

export interface BasicAnswerRow {
  /** Номер задания в домашке, как его видел ученик. */
  n: number
  /** Формулировка на момент сдачи (обрезана — длинные тексты не храним). */
  prompt: string
  /** Нормализованный тип задания (flashcard / listenType / single / …). */
  type: string
  /** Ответ ученика в читаемом виде: текст, подпись варианта, собранная фраза. */
  answer: string
  /** Эталон — только там, где он есть. */
  correct?: string
  verdict: BasicAnswerVerdict
  /** `answer` — путь к голосовой записи в бакете task-media, а не текст. */
  voice?: boolean
  /**
   * Устное задание с эталоном: что услышала распознавалка. Нужно ровно там,
   * где не сошлось, — по расшифровке сразу видно, ученик сказал не то или
   * машина не расслышала исправно сказанное (второе бывает чаще).
   */
  heard?: string
  /** Сколько раз перезаписывал. Про беглость, а не про правильность. */
  attempts?: number
  /**
   * Тест из Тестли: балл на момент сдачи и чем спросить свежий (у теста с
   * ручной частью итог приходит после проверки в Тестли).
   */
  testly?: { testId: string; updatedAt?: string; got?: number; max?: number; pending?: boolean; submittedAt?: string; returned?: boolean; returnedAt?: string }
}

export interface BasicAnswersPayload {
  v: 'basic-1'
  selfAssessment?: LessonSelfAssessment | null
  attemptId?: string
  testlyKey?: string
  draft?: boolean
  reviewedAt?: string | null
  /** Manual tasks, independently of the automatic score or skipped answers. */
  reviewRequired?: boolean
  recommendationScore?: number
  /** Сколько заданий с автопроверкой и сколько из них верно — для шапки (тест из Тестли — долей). */
  gradable: number
  correct: number
  rows: BasicAnswerRow[]
}

/** Полная формулировка; видимый объём задаётся текстовым фейдом в интерфейсе. */
export function shortPrompt(text: string): string {
  const one = text.replace(/\s+/g, ' ').trim()
  return one
}

/** Разбор attachments базовой строки. Старые сдачи снимка не содержат — null. */
export function parseBasicAnswers(attachments: unknown): BasicAnswersPayload | null {
  if (!attachments || typeof attachments !== 'object') return null
  const a = attachments as Partial<BasicAnswersPayload>
  if (a.v !== 'basic-1' || !Array.isArray(a.rows)) return null
  return {
    v: 'basic-1',
    attemptId: a.attemptId, testlyKey: a.testlyKey, draft: a.draft, reviewedAt: a.reviewedAt,
    reviewRequired: a.reviewRequired,
    recommendationScore: a.recommendationScore,
    selfAssessment: parseLessonSelfAssessment(a.selfAssessment),
    gradable: typeof a.gradable === 'number' ? a.gradable : 0,
    correct: typeof a.correct === 'number' ? a.correct : 0,
    // Older snapshots can contain only the answer/verdict. Normalize at the
    // storage boundary so both teacher review layouts can render them safely.
    rows: a.rows.flatMap((row, index) => {
      if (!row || typeof row !== 'object') return []
      const n = Number.isInteger(row.n) && row.n > 0 ? row.n : index + 1
      const answer = typeof row.answer === 'string' ? row.answer : ''
      const verdict: BasicAnswerVerdict = ['correct', 'wrong', 'hint', 'review', 'skip', 'empty'].includes(row.verdict)
        ? row.verdict : answer ? 'review' : 'empty'
      return [{
        ...row, n, answer, verdict,
        prompt: typeof row.prompt === 'string' ? row.prompt : `${t('Задание')} ${n}`,
        type: typeof row.type === 'string' ? row.type : 'unknown',
      }]
    }),
  }
}

/** Подпись и цвет вердикта — общие для всех витрин проверки. */
export function verdictLabel(v: BasicAnswerVerdict): string {
  switch (v) {
    case 'correct': return t('Верно')
    case 'wrong': return t('Неверно')
    case 'hint': return t('По подсказке')
    case 'review': return t('На проверке')
    case 'skip': return t('Без записи')
    case 'empty': return t('Пропущено')
  }
}
