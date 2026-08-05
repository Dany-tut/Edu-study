// ─────────────────────────────────────────────────────────────────────────────
// Реестр готовых курсов-сидов
//
// Один список, из которого конструктор берёт готовые курсы. Добавить новый
// курс = добавить сюда строку; подписи и порядок берутся отсюда, а не
// собираются вручную в UI.
//
// Сид ничего не пишет в БД: он открывается в редакторе как обычный черновик и
// становится курсом учителя только после «Сохранить».
// ─────────────────────────────────────────────────────────────────────────────

import { buildEnglishDesignCareerCourse, COURSE_SUMMARY as ENDC } from './englishDesignCareer'
import { buildEnglishIeltsCourse, COURSE_SUMMARY as IELTS } from './englishIelts'
import { buildKoreanTopikCourse, COURSE_SUMMARY as KOREAN } from './koreanTopik'
import { buildJapaneseJlptCourse, COURSE_SUMMARY as JAPANESE } from './japaneseJlpt'
import { buildPortugueseCelpeCourse, COURSE_SUMMARY as PORTUGUESE } from './portugueseCelpe'
import type { CourseSummary } from './languageCourse'
import type { CourseEdData } from '../pages/teacher/TeacherCourseEditorPage'

export interface CourseSeed {
  /** Стабильный ключ — совпадает с key спецификации курса. */
  key: string
  /** Русское название предмета — подпись карточки и фильтр по предметам учителя. */
  subject: string
  summary: CourseSummary
  build: (courseId: string) => CourseEdData
}

export const COURSE_SEEDS: CourseSeed[] = [
  {
    key: 'endc',
    subject: 'Английский',
    summary: ENDC,
    build: buildEnglishDesignCareerCourse,
  },
  {
    key: 'ielt',
    subject: 'Английский',
    summary: IELTS,
    build: buildEnglishIeltsCourse,
  },
  {
    key: 'kotp',
    subject: 'Корейский',
    summary: KOREAN,
    build: buildKoreanTopikCourse,
  },
  {
    key: 'jajl',
    subject: 'Японский',
    summary: JAPANESE,
    build: buildJapaneseJlptCourse,
  },
  {
    key: 'ptbr',
    subject: 'Португальский',
    summary: PORTUGUESE,
    build: buildPortugueseCelpeCourse,
  },
]

/**
 * Стабильный id курса, собранного из сида. Не случайный: если учитель уже
 * сохранил этот готовый курс, его карточка вытесняет карточку сида, а не
 * ложится рядом дублем.
 *
 * Владелец входит в id обязательно: id становится courses.short_id, а он
 * уникален глобально. Без скоупа второй учитель, сохранивший тот же сид,
 * попал бы upsert'ом в чужую строку — и RLS отбила бы запись молча.
 */
export function seedCourseId(seed: CourseSeed, ownerId: string | null): string {
  return ownerId ? `seed-${seed.key}-${ownerId.slice(0, 8)}` : `seed-${seed.key}`
}

/** Подпись-подсказка: уровень, объём, часы. */
export function seedTooltip(seed: CourseSeed): string {
  const s = seed.summary
  // Часы в футере плитки — время занятий; здесь показываем полный ориентир,
  // в него входит и самостоятельная работа ученика.
  return `${s.level} · ${s.units} юнитов по ${s.lessonMinutes} мин · ${s.taskCount} заданий · `
    + `${s.vocabCount} слов · с самостоятельной — ${s.guidedHours} ч`
}
