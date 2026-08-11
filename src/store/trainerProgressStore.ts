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

// ── Часы тренажёра ───────────────────────────────────────────────────────────
//
// Тикают, пока страница тренажёра смонтирована, вкладка на экране и ученик
// хоть чем-то шевелит. Без проверки простоя счётчик мерил бы не занятие, а
// время, на которое забыли закрыть вкладку.
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
      const active = !document.hidden && now - lastAct <= IDLE_MS
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
    // Уход со страницы не должен терять последние секунды захода.
    const onHide = () => { if (document.hidden) flush(); else { last = Date.now(); lastAct = Date.now(); flush() } }
    document.addEventListener('visibilitychange', onHide)

    return () => {
      flush()
      useTrainerProgress.setState({ counting: false })
      clockOwners -= 1
      clearInterval(iv)
      document.removeEventListener('visibilitychange', onHide)
      events.forEach(e => window.removeEventListener(e, act))
    }
  }, [subjectId])
}
