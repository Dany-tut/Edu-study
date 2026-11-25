// Модель курса «Бухгалтерия» поверх общей модели предметных курсов.
//
// Урок = AuthoredLessonContent (конспект + домашка + хард) — ровно то, что
// получают AP-химия и биология. Сверху — метаданные, которые нужны бухгалтеру
// и сопровождению курса: какие темы ТЗ закрыты, откуда пришёл материал,
// какие источники подтверждают нормы, когда проверено и к каким периодам
// относится. Они не едут ученику в домашку, но собираются в отчёт, реестр
// источников и справочник.
import type { AuthoredLessonContent } from '../lessonAuthoring'

export type SourceKind =
  | 'law'          // федеральный закон, кодекс
  | 'regulation'   // приказ, постановление, ФСБУ, форма
  | 'letter'       // письмо, разъяснение, информационное сообщение
  | 'vendor-doc'   // документация Microsoft, Google, 1С
  | 'service'      // официальный сервис (ФНС «Проверить статус»)
  | 'secondary'    // профильное издание, правовая система — только вспомогательно
  | 'competitor'   // программа конкурента — для сравнения, не для норм

export interface AccSource {
  id: string
  title: string
  url: string
  publisher: string
  kind: SourceKind
  /** Дата, когда автор урока открыл и сверил страницу (ГГГГ-ММ-ДД). */
  checked: string
  /** opened — страница открыта и содержание сверено; unreachable — не открылась, утверждение помечено; not-checked. */
  status: 'opened' | 'unreachable' | 'not-checked'
  note?: string
}

export interface AccLesson {
  /** Локальный стабильный ключ: m03-02. Глобальный short_id назначается сборкой. */
  key: string
  title: string
  /** Точные строки required_topics из ТЗ, которые закрывает урок. */
  topics: string[]
  /** Исходные уроки пособия (L01…L34), чей материал вошёл в урок. */
  origin: string[]
  /** Ориентир по времени, минут. */
  minutes: number
  /** Где тренироваться: файл/лист/среда. */
  practice: string
  /** ПО и версии, к которым относится инструкция; '' — не про ПО. */
  software: string
  /** Периоды/режимы применимости норм: «2026», «с 01.01.2027», «ОСНО, коммерческие организации». */
  applies?: string
  /** id источников из реестра модуля. */
  sources: string[]
  /** Рабочие вопросы, по которым урок ищут в справочнике. */
  queries: string[]
  /** Нерешённое: что требует проверки специалистом или ответа Дани. */
  open?: string[]
  content: AuthoredLessonContent
}

export interface AccModule {
  /** EXP01…EXP21 — id модуля ТЗ. */
  id: string
  title: string
  lessons: AccLesson[]
  sources: AccSource[]
}
