import { create } from 'zustand'

interface TrainerProgressState {
  doneCount: number
  wrongCount: number
  totalCount: number
  favCount: number
  todayCorrect: number
  todayWrong: number
  subject: string
  openModal: boolean
  update: (p: Partial<Omit<TrainerProgressState, 'update' | 'setOpenModal'>>) => void
  setOpenModal: (v: boolean) => void
}

export const useTrainerProgress = create<TrainerProgressState>(set => ({
  doneCount: 0,
  wrongCount: 0,
  totalCount: 0,
  favCount: 0,
  todayCorrect: 0,
  todayWrong: 0,
  subject: '',
  openModal: false,
  update: p => set(p),
  setOpenModal: v => set({ openModal: v }),
}))
