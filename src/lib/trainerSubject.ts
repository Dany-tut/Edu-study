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
// ТРЕК НА ГЛАВНОЙ ПРИ ЭТОМ НЕ ТРОГАЕТСЯ. Переключение в тренажёре — это смена
// вида, а не смена курса: ученик заглянул в другой язык и вернулся, а прогресс,
// уроки и расписание на главной остались там же, где были. Обратная связь
// односторонняя и осознанная: сменил курс на ГЛАВНОЙ — тренажёр переезжает
// следом (иначе он врал бы про «твой предмет»), сменил предмет в ТРЕНАЖЁРЕ —
// главная не шевелится.
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
import { textsForLang } from '../data/readingLibrary'
import { hasSurvivalBook } from '../data/survivalBooks'
import { deckOwner, dueCount } from '../data/reviewDeck'

const KEY = 'trainer_subject'
/**
 * Предмет курса главной, с которым тренажёр синхронизировался в прошлый раз.
 *
 * Нужен, чтобы отличить «ученик сменил курс на главной» от «страницу
 * перезагрузили». Без этой памяти любой F5 выглядел как смена курса и затирал
 * явный выбор в тренажёре (см. эффект ниже).
 */
const COURSE_KEY = 'trainer_subject_course'

function read(key: string): string {
  try { return localStorage.getItem(key) ?? '' } catch { return '' }
}

function write(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* приватный режим */ }
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
  /** Явный выбор в меню. Трек на главной не меняет. */
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
        ? textsForLang(def.langCode ?? '').length
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

    return out
  }, [courses, tasks, coursesLoaded])

  const [picked, setPicked] = useState(() => read(KEY))

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
  useEffect(() => {
    if (!courseSubject) return
    if (lastCourse.current && lastCourse.current !== courseSubject) {
      write(KEY, courseSubject)
      setPicked(courseSubject)
    }
    lastCourse.current = courseSubject
    write(COURSE_KEY, courseSubject)
  }, [courseSubject])

  const current = useMemo(
    () => options.find(o => o.def.id === picked)
      ?? options.find(o => o.def.id === courseSubject)
      ?? options[0],
    [options, picked, courseSubject],
  )

  const pick = useCallback((id: string) => {
    write(KEY, id)
    setPicked(id)
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
