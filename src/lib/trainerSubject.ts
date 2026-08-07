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

function readPick(): string {
  try { return localStorage.getItem(KEY) ?? '' } catch { return '' }
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

    // 2. Предметы с банком заданий. Только те, по которым задания реально
    // загрузились: ученику с одной химией второй пункт не нужен. Пока банк не
    // приехал — показываем весь список, иначе меню на первом кадре пустое.
    const present = new Set(tasks.map(t => t.subject))
    const bank = BANK_SUBJECT_IDS.filter(id => present.has(id))
    for (const id of (bank.length ? bank : BANK_SUBJECT_IDS)) {
      const def = getSubject(id)
      if (def) add(def, 'bank', tasks.filter(t => t.subject === id).length)
    }

    return out
  }, [courses, tasks])

  const [picked, setPicked] = useState(readPick)

  // Предмет курса, открытого на главной.
  const courseSubject = useMemo(
    () => (getSubject(courses.find(c => c.id === activeSubjectId)?.subject)
      ?? getSubject(activeSubjectId))?.id,
    [courses, activeSubjectId],
  )

  // Сменился курс на ГЛАВНОЙ — тренажёр едет следом и забывает прежний выбор.
  // Первое значение (курсы доехали) сменой не считается: это не действие
  // ученика, а загрузка данных, и затирать ей его выбор нельзя.
  const lastCourse = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!courseSubject) return
    if (lastCourse.current && lastCourse.current !== courseSubject) {
      try { localStorage.setItem(KEY, courseSubject) } catch { /* приватный режим */ }
      setPicked(courseSubject)
    }
    lastCourse.current = courseSubject
  }, [courseSubject])

  const current = useMemo(
    () => options.find(o => o.def.id === picked)
      ?? options.find(o => o.def.id === courseSubject)
      ?? options[0],
    [options, picked, courseSubject],
  )

  const pick = useCallback((id: string) => {
    try { localStorage.setItem(KEY, id) } catch { /* приватный режим */ }
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
