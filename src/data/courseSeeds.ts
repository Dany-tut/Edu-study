// ─────────────────────────────────────────────────────────────────────────────
// Реестр готовых курсов-сидов
//
// Один список, из которого конструктор берёт готовые курсы. Добавить новый
// курс = добавить сюда строку; подписи и порядок берутся отсюда, а не
// собираются вручную в UI.
//
// Сид ничего не пишет в БД: он открывается в редакторе как обычный черновик и
// становится курсом учителя только после «Сохранить».
//
// КОНТЕНТ КУРСОВ СЮДА НЕ ИМПОРТИРУЕТСЯ. Двенадцать курсов — это мегабайты:
// схемы конспекта в data-URI, словари юнитов, полторы тысячи фраз разговорника.
// Пока реестр тянул их статически, всё это лежало в главном чанке и приезжало
// каждому ученику, открывшему любую страницу. Поэтому здесь только ключ, предмет
// и лёгкая карточка (courseSeedCards.ts), а сам курс подгружается динамическим
// импортом в момент, когда учитель открыл плитку.
//
// Побочный эффект, ради которого это тоже стоило сделать: разговорники теперь
// действительно лежат в отдельных чанках, как и задумано в survivalBooks.ts, —
// раньше статический импорт отсюда отменял их ленивую загрузку у ученика.
// ─────────────────────────────────────────────────────────────────────────────

import { SEED_CARDS } from './courseSeedCards'
import { countTasks, type CourseSummary } from './languageCourse'
import type { CourseEdData } from '../pages/teacher/TeacherCourseEditorPage'

export interface CourseSeed {
  /** Стабильный ключ — совпадает с key спецификации курса. */
  key: string
  /** Русское название предмета — подпись карточки и фильтр по предметам учителя. */
  subject: string
  /** Подписи плитки. Лежат отдельно от курса, чтобы не тянуть его контент. */
  summary: CourseSummary
  /**
   * Собрать курс. Асинхронно: контент приезжает своим чанком при открытии.
   *
   * Здесь же сверяются счётчики карточки с настоящей сводкой загруженного
   * курса — расхождение (кто-то дописал фразы, а подпись осталась старой)
   * попадает в консоль на первом же открытии.
   */
  build: (courseId: string) => Promise<CourseEdData>
}

/** Ленивая сборка: грузим модуль курса и попутно проверяем подпись карточки. */
function lazy(
  key: string,
  load: () => Promise<{ COURSE_SUMMARY: CourseSummary }>,
  pick: (m: any) => (courseId: string) => CourseEdData,
): (courseId: string) => Promise<CourseEdData> {
  return async courseId => {
    const m = await load()
    // Пустой модуль вместо курса — не «данные кривые», а недоехавший чанк.
    // Сообщение подобрано под isChunkError: одна перезагрузка вместо крика
    // «Cannot read properties of undefined» где-то ниже по коду.
    if (!m) throw new Error(`Failed to fetch dynamically imported module: seed ${key}`)
    const card = SEED_CARDS[key]
    const real = m.COURSE_SUMMARY
    const built = pick(m)(courseId)
    // Юниты и слова сверяются со сводкой спеки, а ЗАДАНИЯ — с собранным курсом.
    // Сводка знает только авторские задания юнитов; ученик получает вдесятеро
    // больше, потому что лестницу, экзамен порции и повторения дописывает
    // генератор. Плитка обязана обещать то, что доедет, а не то, что написано
    // в спеке (см. countTasks в languageCourse.ts).
    const drift = [
      ...(['units', 'vocabCount'] as const)
        .filter(f => card[f] !== real[f])
        .map(f => `${f}: карточка ${card[f]}, курс ${real[f]}`),
      ...(card.taskCount === countTasks(built.lessons)
        ? []
        : [`taskCount: карточка ${card.taskCount}, курс ${countTasks(built.lessons)}`]),
    ]
    if (drift.length > 0) {
      console.warn(`SEED_CARDS[${key}] разошлась с курсом — обновите courseSeedCards.ts:`, drift.join('; '))
    }
    return built
  }
}

export const COURSE_SEEDS: CourseSeed[] = [
  {
    key: 'endc',
    subject: 'Английский',
    summary: SEED_CARDS.endc,
    build: lazy('endc', () => import('./englishDesignCareer'), m => m.buildEnglishDesignCareerCourse),
  },
  {
    // Стоит между карьерным курсом и IELTS: он продолжает общий английский
    // (B2→C1), тогда как IELTS — уже подготовка к формату экзамена.
    key: 'enac',
    subject: 'Английский',
    summary: SEED_CARDS.enac,
    build: lazy('enac', () => import('./englishAdvanced'), m => m.buildEnglishAdvancedCourse),
  },
  {
    key: 'ielt',
    subject: 'Английский',
    summary: SEED_CARDS.ielt,
    build: lazy('ielt', () => import('./englishIelts'), m => m.buildEnglishIeltsCourse),
  },
  {
    key: 'ensv',
    subject: 'Английский',
    summary: SEED_CARDS.ensv,
    build: lazy('ensv', () => import('./survivalEn'), m => m.buildEnglishSurvivalCourse),
  },
  {
    // Стоит перед TOPIK-курсами: он для человека, который ещё не читает, а те
    // оба начинаются с того, что читать он уже умеет.
    key: 'kohg',
    subject: 'Корейский',
    summary: SEED_CARDS.kohg,
    build: lazy('kohg', () => import('./koreanHangul'), m => m.buildKoreanHangulCourse),
  },
  {
    key: 'kotp',
    subject: 'Корейский',
    summary: SEED_CARDS.kotp,
    build: lazy('kotp', () => import('./koreanTopik'), m => m.buildKoreanTopikCourse),
  },
  {
    key: 'kot2',
    subject: 'Корейский',
    summary: SEED_CARDS.kot2,
    build: lazy('kot2', () => import('./koreanTopik2'), m => m.buildKoreanTopik2Course),
  },
  {
    // Разговорник, а не экзаменационный курс: темы — ситуации, а не грамматика.
    // Стоит после TOPIK-курсов, потому что он для другой задачи — не «сдать», а
    // «завтра выйти из аэропорта».
    key: 'kosv',
    subject: 'Корейский',
    summary: SEED_CARDS.kosv,
    build: lazy('kosv', () => import('./survivalKo'), m => m.buildKoreanSurvivalCourse),
  },
  {
    key: 'jajl',
    subject: 'Японский',
    summary: SEED_CARDS.jajl,
    build: lazy('jajl', () => import('./japaneseJlpt'), m => m.buildJapaneseJlptCourse),
  },
  {
    key: 'jan3',
    subject: 'Японский',
    summary: SEED_CARDS.jan3,
    build: lazy('jan3', () => import('./japaneseJlptN3'), m => m.buildJapaneseJlptN3Course),
  },
  {
    key: 'jasv',
    subject: 'Японский',
    summary: SEED_CARDS.jasv,
    build: lazy('jasv', () => import('./survivalJa'), m => m.buildJapaneseSurvivalCourse),
  },
  {
    key: 'ptbr',
    subject: 'Португальский',
    summary: SEED_CARDS.ptbr,
    build: lazy('ptbr', () => import('./portugueseCelpe'), m => m.buildPortugueseCelpeCourse),
  },
  {
    key: 'ptb2',
    subject: 'Португальский',
    summary: SEED_CARDS.ptb2,
    build: lazy('ptb2', () => import('./portugueseIntermediate'), m => m.buildPortugueseIntermediateCourse),
  },
  {
    key: 'ptsv',
    subject: 'Португальский',
    summary: SEED_CARDS.ptsv,
    build: lazy('ptsv', () => import('./survivalPt'), m => m.buildPortugueseSurvivalCourse),
  },
  {
    // Немецкий пока один курс — бытовой. Экзаменационного (Goethe, telc) нет
    // намеренно: предмет заведён ради «завтра выйти из аэропорта и дожить до
    // Anmeldung», а не ради сертификата.
    key: 'deab',
    subject: 'Немецкий',
    summary: SEED_CARDS.deab,
    build: lazy('deab', () => import('./germanA1B1'), m => m.buildGermanA1B1Course),
  },
  {
    key: 'desv',
    subject: 'Немецкий',
    summary: SEED_CARDS.desv,
    build: lazy('desv', () => import('./survivalDe'), m => m.buildGermanSurvivalCourse),
  },
  {
    // Русский и литература — курсы РОДНОГО языка: карточка в них перевёрнута
    // (толкование на лице, слово в ответе), а экзаменационных форматов нет
    // намеренно. Подробности — в docs/RUSSIAN_GERMAN_PLAN.md.
    key: 'ruzh',
    subject: 'Русский',
    summary: SEED_CARDS.ruzh,
    build: lazy('ruzh', () => import('./russianSpeech'), m => m.buildRussianSpeechCourse),
  },
  {
    key: 'ruvo',
    subject: 'Русский',
    summary: SEED_CARDS.ruvo,
    build: lazy('ruvo', () => import('./russianVoice'), m => m.buildRussianVoiceCourse),
  },
  {
    key: 'rulit',
    subject: 'Литература',
    summary: SEED_CARDS.rulit,
    build: lazy('rulit', () => import('./russianLiterature'), m => m.buildRussianLiteratureCourse),
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
