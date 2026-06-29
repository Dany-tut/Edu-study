import { create } from 'zustand'

type DeskStore = {
  editMode: boolean
  showWidgetLibrary: boolean
  setEditMode: (v: boolean) => void
  setShowWidgetLibrary: (v: boolean) => void
}

export const useDeskStore = create<DeskStore>(set => ({
  editMode: false,
  showWidgetLibrary: false,
  setEditMode: v => set({ editMode: v, showWidgetLibrary: false }),
  setShowWidgetLibrary: v => set({ showWidgetLibrary: v }),
}))
