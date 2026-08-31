// ─────────────────────────────────────────────────────────────────────────────
// Предмет, открытый в тренажёре
//
// ЗАЧЕМ ОТДЕЛЬНОЕ СОСТОЯНИЕ. Раньше предмет тренажёра вообще не выбирался: он
// выводился из трека главной (`activeSubjectId` → курс → предмет). Пока курс на
// главной выбран — всё сходится, но стоит ученику зайти в тренажёр без
// выбранного курса, и предмет брать неоткуда: страница молча падала в банк ЕГЭ
// и показывала биологию человеку, который учит корейский.
//
// Теперь у тренажёра свой выбор со своей памятью. Приоритет:
//   1. явный выбор ученика в меню (переживает F5),
//   2. предмет активного курса на главной,
//   3. первый предмет из списка (курсы идут раньше банка).
//
// ЯЗЫК В КАБИНЕТЕ ОДИН, И ВЫБИРАЕТСЯ ОН ГДЕ УГОДНО. Связь двусторонняя: сменил
// курс на ГЛАВНОЙ — тренажёр переезжает следом; выбрал предмет в ТРЕНАЖЁРЕ —
// кабинет открывает курс этого языка. Раньше вторая половина была отключена
// нарочно («заглянул в другой язык и вернулся»), и получалось расхождение,
// которое ученик видел на одном экране: тренажёр читает корейский, а шапка,
// оттенок и трек — про английский. Одно место выбора, одно состояние.
//
// КАКОЙ ИМЕННО КУРС. У языка их бывает несколько («Кор к TOPIK I», «Кор для
// выживания»): если открытый курс уже этого языка — он и остаётся, иначе берём
// тот, в котором ученик сидел в прошлый раз (память по предметам ниже), и лишь
// затем первый по списку. Прыгать с «TOPIK II» на «TOPIK I» из-за выбора языка
// в тренажёре — терять место, где человек работал.
//
// СПИСОК — ОДИН НА ЯЗЫКИ И БАНК. Для ученика это одна кнопка, хотя под ней
// меняется движок: у языков свой тренажёр (чтение/карточки/аудирование), у
// биологии с химией — банк заданий ЕГЭ. Тип предмета не прячем, а пишем
// подписью в пункте меню.
//
// В СПИСКЕ ТОЛЬКО ПРЕДМЕТЫ УЧЕНИКА. Он строится по курсам ученика; банк
// заданий сам по себе предмет в меню не добавляет — банк общий на учителя, и
// без этого ограничения человек с корейским видел в «своих предметах»
// биологию. Единственное исключение — ученик вообще без подходящего курса:
// ему банк подставляется, иначе тренажёр был бы пустым.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getSubject, SUBJECTS, BANK_SUBJECT_IDS, type SubjectDef } from './subjects'
import { useStudentData, subjectAliases } from '../store/studentDataStore'
import { useTaskBank } from '../store/taskBankStore'
import { useDashboard } from '../store/dashboardStore'
// Счётчик, а не библиотека: сюда нужно одно число на язык, а READING_LIBRARY
// приехала бы во входной чанк вместе с телами текстов (см. readingCounts).
import { textCount } from '../data/readingCounts'
import { sceneCount } from '../data/scenes/counts'
import { hasSurvivalBook } from '../data/survivalBooks'
import { deckOwner, dueCount } from '../data/reviewDeck'
import { bootTrainerLink, linkSubjectId } from './trainerLink'

const KEY = 'trainer_subject'
/**
 * Предмет курса главной, с которым тренажёр синхронизировался в прошлый раз.
 *
 * Нужен, чтобы отличить «ученик сменил курс на главной» от «страницу
 * перезагрузили». Без этой памяти любой F5 выглядел как смена курса и затирал
 * явный выбор в тренажёре (см. эффект ниже).
 */
const COURSE_KEY = 'trainer_subject_course'
/**
 * Последний открытый курс каждого предмета: id предмета → id курса.
 *
 * Пишется при каждой смене курса в кабинете, читается, когда язык выбирают в
 * тренажёре и курс надо подобрать обратно.
 */
const COURSE_BY_SUBJECT_KEY = 'trainer_course_by_subject'

function read(key: string): string {
  try { return localStorage.getItem(key) ?? '' } catch { return '' }
}

function write(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* приватный режим */ }
}

/**
 * Языки, пришедшие ссылкой.
 *
 * Отметка «этот язык у меня есть», поставленная не курсом, а присланным
 * адресом: материал тренажёра общий, и человек, которому прислали корейский
 * ряд созвучий, должен увидеть его, даже если корейского курса у него нет.
 * Список, а не одно значение: ссылок может прийти несколько, и вторая не
 * должна стирать первую.
 */
const LINKS_KEY = 'trainer_link_subjects'

function linkSubjects(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LINKS_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter(x => typeof x === 'string') : []
  } catch {
    return []
  }
}

function rememberLinkSubject(id: string): void {
  const list = linkSubjects()
  if (list.includes(id)) return
  try { localStorage.setItem(LINKS_KEY, JSON.stringify([...list, id])) } catch { /* приватный режим */ }
}

/** Предмет курса: русское имя из реестра, с запасным путём по id (демо, старые курсы). */
function courseSubjectId(c: { subject?: string; id: string }): string | undefined {
  return (getSubject(c.subject) ?? getSubject(c.id))?.id
}

function courseMemory(): Record<string, string> {
  try {
    const raw = JSON.parse(localStorage.getItem(COURSE_BY_SUBJECT_KEY) ?? '{}')
    return raw && typeof raw === 'object' ? raw as Record<string, string> : {}
  } catch {
    return {}
  }
}

function rememberCourse(subjectId: string, courseId: string): void {
  const map = courseMemory()
  if (map[subjectId] === courseId) return
  try { localStorage.setItem(COURSE_BY_SUBJECT_KEY, JSON.stringify({ ...map, [subjectId]: courseId })) } catch { /* приватный режим */ }
}

/**
 * Открыть в кабинете курс выбранного языка.
 *
 * Тихо ничего не делает, когда курса нет вовсе: предмет мог прийти ссылкой или
 * подставиться банком заданий, и гасить из-за этого открытый курс — значит
 * ронять трек, расписание и статистику на главной ради экрана, который к ним
 * отношения не имеет.
 */
export function syncCourseToSubject(id: string): void {
  const courses = useStudentData.getState().subjects
  const mine = courses.filter(c => courseSubjectId(c) === id)
  if (mine.length === 0) return
  const dash = useDashboard.getState()
  // Уже в этом языке — курс не трогаем: выбор «Кор к TOPIK II» на главной
  // старше, чем выбор «корейского» в тренажёре, он про то же самое, но точнее.
  if (mine.some(c => c.id === dash.activeSubjectId)) return
  const last = courseMemory()[id]
  const target = mine.find(c => c.id === last) ?? mine[0]
  dash.setActiveSubject(target.id)
}

/**
 * Выбрать предмет тренажёра ИЗВНЕ — с главной, до того как тренажёр смонтирован.
 *
 * Пишем прямо в ту же память, из которой useTrainerSubject читает свой
 * стартовый выбор: виджет главной открывает ленту конкретного языка, и предмет
 * должен быть выбран к первому кадру тренажёра, а не после него. Кабинет
 * переезжает на курс этого языка вместе с тренажёром — правило одно на все
 * места выбора (см. шапку файла).
 */
export function pickTrainerSubject(id: string): void {
  write(KEY, id)
  syncCourseToSubject(id)
}

export interface TrainerSubjectOption {
  def: SubjectDef
  /** Каким тренажёром открывается предмет. */
  kind: 'lang' | 'bank'
  /** Материалов у предмета: текстов у языка, заданий в банке. */
  count: number
  /** У языка есть разговорник — в подписи это отдельный аргумент открыть предмет. */
  hasBook: boolean
}

export interface TrainerSubjectState {
  /** Предметы ученика: сначала его курсы, затем предметы с банком заданий. */
  options: TrainerSubjectOption[]
  /** Открытый предмет. undefined только пока не приехали ни курсы, ни задания. */
  current: TrainerSubjectOption | undefined
  /** Явный выбор в меню. Кабинет открывает курс этого языка (syncCourseToSubject). */
  pick: (id: string) => void
  /** Карточек «на повтор» по предметам — считается лениво, при открытии меню. */
  due: Record<string, number>
  loadDue: () => void
}

/**
 * Предметы ученика для тренажёра.
 *
 * Курсы схлопываются по слагу реестра: два корейских курса — один предмет в
 * меню, иначе ученик выбирал бы между двумя одинаковыми строчками.
 */
export function useTrainerSubject(): TrainerSubjectState {
  const courses = useStudentData(s => s.subjects)
  const tasks = useTaskBank(s => s.tasks)
  const activeSubjectId = useDashboard(s => s.activeSubjectId)
  const coursesLoaded = useStudentData(s => s.loaded)

  /**
   * Предмет из присланной ссылки. Он СИЛЬНЕЕ и памяти, и курса главной: человек
   * открыл конкретный экран, и показать ему вместо него прошлый предмет —
   * значит потерять то единственное, зачем он пришёл по этой ссылке.
   *
   * Стоит ВЫШЕ списка предметов, потому что заодно ставит отметку «этот язык у
   * меня есть»: список ниже читает её, и посчитайся он первым — присланный язык
   * появился бы в меню только со второго рендера.
   */
  const linkedSubject = useMemo(() => {
    const link = bootTrainerLink()
    const id = link ? linkSubjectId(link) : undefined
    if (id) rememberLinkSubject(id)
    return id
  }, [])

  const options = useMemo<TrainerSubjectOption[]>(() => {
    const seen = new Set<string>()
    const out: TrainerSubjectOption[] = []

    const add = (def: SubjectDef, kind: 'lang' | 'bank', count: number) => {
      if (seen.has(def.id)) return
      seen.add(def.id)
      out.push({ def, kind, count, hasBook: !!def.langCode && hasSurvivalBook(def.langCode) })
    }

    // 1. Предметы курсов ученика — в порядке реестра, а не в порядке курсов:
    // порядок курсов зависит от того, когда их назначили, и меню от этого
    // перетасовывалось бы после каждой новой записи.
    // `c.subject` — русское название из реестра. Запасной путь по `c.id` нужен
    // демо-данным и старым курсам, где предмет не проставлен, а id и есть слаг:
    // без него ученик-языковик из демо снова открывал бы банк ЕГЭ.
    const mine = new Set(
      courses.map(c => (getSubject(c.subject) ?? getSubject(c.id))?.id).filter(Boolean) as string[],
    )
    for (const def of SUBJECTS) {
      if (!mine.has(def.id)) continue
      // Предмет попадает в меню, только если тренажёру есть что по нему
      // открыть: язык (своя библиотека) или предмет с банком заданий. У физики
      // с историей нет ни того, ни другого — пункт вёл бы на чужой экран.
      if (!def.isLanguage && !def.hasBank) continue
      add(def, def.isLanguage ? 'lang' : 'bank', def.isLanguage
        // Тексты вместе со сценами — столько же, сколько показывает «Чтение» в
        // самом тренажёре. Разные числа в меню предметов и в меню режимов
        // читаются как ошибка одного из них.
        ? textCount(def.langCode) + sceneCount(def.langCode)
        : tasks.filter(t => t.subject === def.id).length)
    }

    // 2. Предметы с банком заданий — ТОЛЬКО как запасной вариант, когда по
    // курсам ученика тренажёру открыть нечего.
    //
    // Раньше банк добавлялся всегда, и ученик, который учит корейский,
    // видел в своих предметах биологию: банк заданий общий на учителя, а не
    // выданный конкретному ученику. «Мои предметы» должны быть его — если
    // курса по биологии нет, то и пункта быть не должно.
    //
    // Запасной путь остаётся для ученика, которого готовят к ЕГЭ без курса
    // (задания приходят из банка) — иначе тренажёр у него был бы пустым.
    // Ждём загрузки курсов: до неё список пуст у всех, и без ожидания банк
    // подставлялся бы каждому на первом кадре.
    if (out.length === 0 && coursesLoaded) {
      // Только предметы, по которым задания реально загрузились: ученику с
      // одной химией второй пункт не нужен. Пока банк не приехал — показываем
      // весь список, иначе меню на первом кадре пустое.
      const present = new Set(tasks.map(t => t.subject))
      const bank = BANK_SUBJECT_IDS.filter(id => present.has(id))
      for (const id of (bank.length ? bank : BANK_SUBJECT_IDS)) {
        const def = getSubject(id)
        if (def) add(def, 'bank', tasks.filter(t => t.subject === id).length)
      }
    }

    // 3. Языки, пришедшие ссылкой, — даже если такого курса у ученика нет.
    //
    // Материал тренажёра не выдаётся курсом: полка отрывков, учебные тексты,
    // созвучия и разговорник общие. Если человеку прислали корейский рассказ,
    // ссылка обязана его открыть, иначе «уникальный адрес» работает только у
    // тех, кто и так этот язык учит. Пункт появляется в меню предметов —
    // вернуться к своему языку есть чем, и видно, куда именно попал.
    //
    // ЯЗЫК ЗАПОМИНАЕТСЯ, А НЕ ЖИВЁТ ОДНУ ЗАГРУЗКУ. Пока он держался только на
    // самой ссылке, обещание «добавили в мои предметы» было неправдой: стоило
    // уйти на главную и вернуться в тренажёр — адрес уже другой, ссылки нет,
    // и присланный язык пропадал из меню вместе со всем, что человек в нём
    // успел открыть. Теперь это отметка того же веса, что и явный выбор в
    // меню: список лежит рядом с ним, в localStorage.
    for (const id of linkSubjects()) {
      if (seen.has(id)) continue
      const def = getSubject(id)
      if (def?.isLanguage) {
        add(def, 'lang', textCount(def.langCode) + sceneCount(def.langCode))
      }
    }

    return out
  }, [courses, tasks, coursesLoaded, linkedSubject])

  const [picked, setPicked] = useState(() => {
    if (linkedSubject) { write(KEY, linkedSubject); return linkedSubject }
    return read(KEY)
  })

  /**
   * Предмет курса, открытого на главной.
   *
   * Считается ТОЛЬКО по курсам самого ученика и только когда они уже приехали.
   * Прежний запасной путь `getSubject(activeSubjectId)` срабатывал на стартовом
   * значении стора (`activeSubjectId: 'chemistry'`) — то есть на каждом первом
   * кадре после F5 главная «говорила», что открыта химия, хотя курсов ещё нет
   * вовсе. Дальше приезжали настоящие курсы, значение менялось, и эффект ниже
   * честно принимал это за смену курса учеником.
   */
  const courseSubject = useMemo(() => {
    if (!coursesLoaded) return undefined
    const c = courses.find(x => x.id === activeSubjectId)
    if (!c) return undefined
    // `c.subject` — русское название из реестра; запасной путь по `c.id` нужен
    // демо-данным и старым курсам, где предмет не проставлен, а id и есть слаг.
    return (getSubject(c.subject) ?? getSubject(c.id))?.id
  }, [coursesLoaded, courses, activeSubjectId])

  // Сменился курс на ГЛАВНОЙ — тренажёр едет следом и забывает прежний выбор.
  //
  // ПЕРЕЗАГРУЗКА СМЕНОЙ НЕ СЧИТАЕТСЯ. Сравниваем не с памятью компонента (после
  // F5 она пустая, и первое же значение выглядело бы как «пришли из другого
  // курса»), а с тем, что синхронизировали в прошлый раз. Пока курс главной не
  // изменился, явный выбор в тренажёре остаётся выбором ученика — иначе
  // «АНГЛИЙСКИЙ», выбранный в меню, слетал на предмет курса при каждом F5.
  const lastCourse = useRef<string>(read(COURSE_KEY))
  // Курсы приезжают ПОСЛЕ первого кадра, и первый же их приезд выглядит как
  // смена курса, если в прошлый раз тренажёр синхронизировался с другим. Для
  // ссылки это означало бы: предмет из ссылки поставили и тут же затёрли
  // предметом курса главной. Первую синхронизацию после перехода по ссылке
  // пропускаем — она про память, а не про действие ученика.
  const linkFresh = useRef(!!linkedSubject)
  useEffect(() => {
    if (!courseSubject) return
    if (linkFresh.current) {
      linkFresh.current = false
      lastCourse.current = courseSubject
      write(COURSE_KEY, courseSubject)
      rememberCourse(courseSubject, activeSubjectId)
      return
    }
    if (lastCourse.current && lastCourse.current !== courseSubject) {
      write(KEY, courseSubject)
      setPicked(courseSubject)
    }
    lastCourse.current = courseSubject
    write(COURSE_KEY, courseSubject)
    // Какой именно курс языка был открыт — чтобы выбор языка в тренажёре вернул
    // ученика в него, а не в первый курс списка.
    rememberCourse(courseSubject, activeSubjectId)
  }, [courseSubject, activeSubjectId])

  const current = useMemo(
    () => options.find(o => o.def.id === picked)
      ?? options.find(o => o.def.id === courseSubject)
      ?? options[0],
    [options, picked, courseSubject],
  )

  const pick = useCallback((id: string) => {
    write(KEY, id)
    setPicked(id)
    // Кабинет едет следом. Эффект выше увидит новый курс и запишет ту же пару в
    // память синхронизации — сменой курса это не считается, значение то же.
    syncCourseToSubject(id)
  }, [])

  // ── Долг по повторению ─────────────────────────────────────────────────────
  // Единственная причина переключиться прямо сейчас — «там семь карточек ждут».
  // Считается по запросу, при открытии меню: держать N запросов на каждом
  // открытии тренажёра ради цифры, которую могут и не увидеть, незачем.
  const [due, setDue] = useState<Record<string, number>>({})
  const owner = useMemo(() => deckOwner(), [])
  const loadDue = useCallback(() => {
    if (!owner.studentId) return
    for (const o of options) {
      dueCount(owner, subjectAliases(o.def.id))
        .then(n => setDue(prev => (prev[o.def.id] === n ? prev : { ...prev, [o.def.id]: n })))
        .catch(() => { /* цифра в меню — не повод ронять тренажёр */ })
    }
  }, [options, owner])

  return { options, current, pick, due, loadDue }
}
