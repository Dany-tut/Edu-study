import { useEffect } from 'react'
import { create } from 'zustand'
import { addTime, addVerdict, todayStat, weekStat, streakDays } from '../lib/trainerDay'

/** Каким тренажёром открыт предмет — от этого зависят подписи в виджете. */
export type TrainerKind = 'bank' | 'lang'

interface TrainerProgressState {
  doneCount: number
  wrongCount: number
  totalCount: number
  favCount: number
  todayCorrect: number
  todayWrong: number
  subject: string
  /** Слаг предмета из реестра (lib/subjects) — по нему виджет берёт палитру. */
  subjectId: string
  kind: TrainerKind
  /** Активные миллисекунды в тренажёре: сегодня, за неделю, в этом заходе. */
  todayMs: number
  weekMs: number
  sessionMs: number
  /** Дней подряд с занятиями, включая сегодня. */
  streak: number
  /** Идёт ли счёт прямо сейчас — виджет показывает это точкой-пульсом. */
  counting: boolean
  /**
   * Открыт ли экран занятия (стопка, текст, запись, задания банка).
   *
   * Отдельно от `counting`, потому что у остановленного счёта две разные
   * причины и разные подписи: «ты выбираешь материал» и «ты отошёл».
   */
  engaged: boolean
  lastAnswerAt: number
  openModal: boolean
  update: (p: Partial<Omit<TrainerProgressState, 'update' | 'setOpenModal'>>) => void
  setOpenModal: (v: boolean) => void
  /** Начало захода: предмет, вид тренажёра и подтянутый из дневника «сегодня». */
  beginSession: (subjectId: string, kind: TrainerKind) => void
  /** Прибавить активное время (зовёт часы, см. useTrainerClock). */
  tick: (ms: number) => void
  /** Ответ по карточке — единственный источник «сегодня» у языкового тренажёра. */
  noteAnswer: (correct: boolean) => void
}

export const useTrainerProgress = create<TrainerProgressState>((set, get) => ({
  doneCount: 0,
  wrongCount: 0,
  totalCount: 0,
  favCount: 0,
  todayCorrect: 0,
  todayWrong: 0,
  subject: '',
  subjectId: '',
  kind: 'bank',
  todayMs: 0,
  weekMs: 0,
  sessionMs: 0,
  streak: 0,
  counting: false,
  engaged: false,
  lastAnswerAt: 0,
  openModal: false,
  update: p => set(s => {
    const hasNewAnswer =
      (p.doneCount !== undefined && p.doneCount !== s.doneCount) ||
      (p.wrongCount !== undefined && p.wrongCount !== s.wrongCount)
    return { ...s, ...p, lastAnswerAt: hasNewAnswer ? Date.now() : s.lastAnswerAt }
  }),
  setOpenModal: v => set({ openModal: v }),

  beginSession: (subjectId, kind) => {
    const day = todayStat(subjectId)
    set(s => ({
      ...s,
      subjectId,
      kind,
      sessionMs: 0,
      todayMs: day.ms,
      weekMs: weekStat(subjectId).ms,
      streak: streakDays(subjectId),
      // У банка «сегодня» считается по его собственному журналу ответов
      // (TaskBankPage), и подменять его дневником нельзя — задание, решённое
      // на другом устройстве, там тоже учтено. У языка другого источника нет.
      ...(kind === 'lang' ? { todayCorrect: day.right, todayWrong: day.wrong } : null),
    }))
  },

  tick: ms => {
    const { subjectId, sessionMs } = get()
    if (!subjectId || ms <= 0) return
    const day = addTime(subjectId, ms)
    set({ todayMs: day.ms, sessionMs: sessionMs + ms, weekMs: weekStat(subjectId).ms })
  },

  noteAnswer: correct => {
    const { subjectId, kind } = get()
    if (!subjectId) return
    const day = addVerdict(subjectId, correct)
    set(s => ({
      ...s,
      lastAnswerAt: Date.now(),
      ...(kind === 'lang' ? { todayCorrect: day.right, todayWrong: day.wrong } : null),
    }))
  },
}))

// ── Что считается занятием ───────────────────────────────────────────────────
//
// Открытый экран работы: стопка карточек, набор фраз, текст, запись, задание на
// говорение, список заданий банка. ВИТРИНА ВЫБОРА — НЕ ЗАНЯТИЕ. Раньше часы
// тикали от одного факта «страница тренажёра смонтирована», и минуты капали,
// пока ученик листал наборы фраз, выбирал уровень или просто оставил открытым
// список тем: в виджете горело «Сейчас идёт», хотя не делалось ничего.
//
// Считаем экраны, а не флаг: телефонная и десктопная вёрстки обе живут в DOM
// (см. dual-layout), и одно открытие темы даёт два монтирования.
let engagedScreens = 0
/**
 * Позвать часы прямо сейчас, не дожидаясь своего тика.
 *
 * `restart` — начать отрезок заново: время, накопленное с прошлого тика, к
 * занятию не относится (ученик выбирал материал) и в зачёт не идёт.
 */
let flushNow: ((restart?: boolean) => void) | null = null

function syncEngaged() {
  const on = engagedScreens > 0
  if (useTrainerProgress.getState().engaged !== on) useTrainerProgress.setState({ engaged: on })
  // Пересчёт `counting` сразу: остановка должна быть видна в ту же секунду,
  // иначе точка «время идёт» живёт ещё до пяти секунд после выхода из стопки.
  if (flushNow) flushNow()
  else if (!on) useTrainerProgress.setState({ counting: false })
}

/**
 * «Занятие идёт» — зовётся с экрана, который И ЕСТЬ работа.
 *
 * Живёт рядом с часами намеренно: два места, решающих, что считать занятием,
 * разойдутся на первой же новой вкладке тренажёра.
 */
export function useTrainerEngaged(active: boolean): void {
  useEffect(() => {
    if (!active) return
    // Порядок здесь — не стиль, а честность счёта на границах отрезка.
    // На входе: обнуляем накопленное ДО увеличения счётчика, иначе последние
    // секунды витрины достались бы занятию.
    flushNow?.(true)
    engagedScreens += 1
    syncEngaged()
    return () => {
      // На выходе: дописываем отработанное, пока экран ещё считается открытым,
      // иначе терялся бы хвост до пяти секунд на каждом закрытии стопки.
      flushNow?.()
      engagedScreens -= 1
      syncEngaged()
    }
  }, [active])
}

// ── Часы тренажёра ───────────────────────────────────────────────────────────
//
// Тикают, пока открыт экран занятия (см. выше), вкладка на экране и ученик хоть
// чем-то шевелит. Без проверки простоя счётчик мерил бы не занятие, а время, на
// которое забыли закрыть вкладку.
//
// ШАГ 5 СЕКУНД, А НЕ 1. Виджет показывает минуты, секундная точность в нём не
// видна, а лишний ререндер раз в секунду висел бы на всём кабинете.

const TICK_MS = 5_000
/** Три минуты без единого события — считаем, что ученик отошёл. */
const IDLE_MS = 180_000

// Страница тренажёра смонтирована ДВАЖДЫ — десктопная и мобильная вёрстки обе
// живут в DOM (одна спрятана display:none, см. DashboardPage). Без счётчика
// владельцев тикали бы двое часов, и десять минут занятия превращались бы в
// двадцать. Первый смонтированный экземпляр ведёт время, второй молчит.
let clockOwners = 0

export function useTrainerClock(subjectId: string, kind: TrainerKind): void {
  const beginSession = useTrainerProgress(s => s.beginSession)

  useEffect(() => {
    if (!subjectId) return
    beginSession(subjectId, kind)
  }, [subjectId, kind, beginSession])

  useEffect(() => {
    if (!subjectId) return
    clockOwners += 1
    if (clockOwners > 1) return () => { clockOwners -= 1 }

    const tick = useTrainerProgress.getState().tick

    let last = Date.now()
    let lastAct = Date.now()
    const act = () => { lastAct = Date.now() }
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']
    events.forEach(e => window.addEventListener(e, act, { passive: true }))

    function flush() {
      const now = Date.now()
      const delta = now - last
      last = now
      // Порядок проверок неважен, важен состав: без `engagedScreens` часы мерили
      // выбор материала наравне с работой над ним.
      const active = engagedScreens > 0 && !document.hidden && now - lastAct <= IDLE_MS
      // Виджет обязан показывать, идёт счёт или нет: молчащий счётчик и
      // считающий выглядели одинаково, и «а он вообще работает?» —
      // единственный возможный вопрос к такому виджету.
      if (useTrainerProgress.getState().counting !== active) useTrainerProgress.setState({ counting: active })
      if (!active) return
      // Ограничение сверху: вкладку усыпили — интервал не сработал, а delta
      // накопилась. Засчитываем один шаг, не полчаса сна.
      tick(Math.min(delta, TICK_MS * 2))
    }

    const iv = setInterval(flush, TICK_MS)
    flushNow = restart => {
      // Открытие материала — это и есть действие: простой обнуляем вместе с
      // отрезком, иначе первые секунды в стопке считались бы «ученик отошёл».
      if (restart) { last = Date.now(); lastAct = Date.now() }
      flush()
    }
    // Уход со страницы не должен терять последние секунды захода.
    const onHide = () => { if (document.hidden) flush(); else { last = Date.now(); lastAct = Date.now(); flush() } }
    document.addEventListener('visibilitychange', onHide)

    return () => {
      flush()
      flushNow = null
      useTrainerProgress.setState({ counting: false })
      clockOwners -= 1
      clearInterval(iv)
      document.removeEventListener('visibilitychange', onHide)
      events.forEach(e => window.removeEventListener(e, act))
    }
  }, [subjectId])
}
