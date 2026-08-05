// ─────────────────────────────────────────────────────────────────────────────
// Реестр готовых курсов-сидов
//
// Один список, из которого конструктор строит меню «Готовый курс». Добавить
// новый курс = добавить сюда строку; кнопки, подписи и порядок берутся отсюда,
// а не собираются вручную в UI.
//
// Сид ничего не пишет в БД: он открывается в редакторе как обычный черновик и
// становится курсом учителя только после «Сохранить».
// ─────────────────────────────────────────────────────────────────────────────

import { buildEnglishDesignCareerCourse, COURSE_SUMMARY as ENDC } from './englishDesignCareer'
import { buildEnglishIeltsCourse, COURSE_SUMMARY as IELTS } from './englishIelts'
import { buildKoreanTopikCourse, COURSE_SUMMARY as KOREAN } from './koreanTopik'
import { buildJapaneseJlptCourse, COURSE_SUMMARY as JAPANESE } from './japaneseJlpt'
import { buildPortugueseCelpeCourse, COURSE_SUMMARY as PORTUGUESE } from './portugueseCelpe'
import { subjectIcon } from '../lib/subjects'
import type { CourseSummary } from './languageCourse'
import type { CourseEdData } from '../pages/teacher/TeacherCourseEditorPage'

export interface CourseSeed {
  /** Стабильный ключ — совпадает с key спецификации курса. */
  key: string
  /** Русское название предмета — для иконки и для фильтра по предметам учителя. */
  subject: string
  /** Короткая подпись в меню: «Корейский — с нуля до TOPIK I». */
  menuLabel: string
  summary: CourseSummary
  build: (courseId: string) => CourseEdData
}

export const COURSE_SEEDS: CourseSeed[] = [
  {
    key: 'endc',
    subject: 'Английский',
    menuLabel: 'Английский — карьера дизайнера',
    summary: ENDC,
    build: buildEnglishDesignCareerCourse,
  },
  {
    key: 'ielt',
    subject: 'Английский',
    menuLabel: 'Английский — IELTS Academic',
    summary: IELTS,
    build: buildEnglishIeltsCourse,
  },
  {
    key: 'kotp',
    subject: 'Корейский',
    menuLabel: 'Корейский — с нуля до TOPIK I',
    summary: KOREAN,
    build: buildKoreanTopikCourse,
  },
  {
    key: 'jajl',
    subject: 'Японский',
    menuLabel: 'Японский — с нуля до JLPT N5',
    summary: JAPANESE,
    build: buildJapaneseJlptCourse,
  },
  {
    key: 'ptbr',
    subject: 'Португальский',
    menuLabel: 'Португальский (Бразилия) — с нуля',
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

/** Иконка предмета курса — для меню. */
export function seedIcon(seed: CourseSeed): string {
  return subjectIcon(seed.subject)
}

/** Подпись-подсказка: уровень, объём, часы. */
export function seedTooltip(seed: CourseSeed): string {
  const s = seed.summary
  return `${s.level} · ${s.units} юнитов · ${s.taskCount} заданий · ${s.vocabCount} слов · ${s.guidedHours} ч`
}
