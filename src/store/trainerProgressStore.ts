import { create } from 'zustand'

interface TrainerProgressState {
  doneCount: number
  wrongCount: number
  totalCount: number
  favCount: number
  todayCorrect: number
  todayWrong: number
  subject: string
  lastAnswerAt: number
  openModal: boolean
  update: (p: Partial<Omit<TrainerProgressState, 'update' | 'setOpenModal'>>) => void
  setOpenModal: (v: boolean) => void
}

export const useTrainerProgress = create<TrainerProgressState>((set, get) => ({
  doneCount: 0,
  wrongCount: 0,
  totalCount: 0,
  favCount: 0,
  todayCorrect: 0,
  todayWrong: 0,
  subject: '',
  lastAnswerAt: 0,
  openModal: false,
  update: p => set(s => {
    const hasNewAnswer =
      (p.doneCount !== undefined && p.doneCount !== s.doneCount) ||
      (p.wrongCount !== undefined && p.wrongCount !== s.wrongCount)
    return { ...s, ...p, lastAnswerAt: hasNewAnswer ? Date.now() : s.lastAnswerAt }
  }),
  setOpenModal: v => set({ openModal: v }),
}))
