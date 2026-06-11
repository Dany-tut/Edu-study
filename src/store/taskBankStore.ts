import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { tasks as seedTasks, type Task } from '../data/taskBankData'

type NewTask = Omit<Task, 'id'>

type TaskBankStore = {
  tasks: Task[]
  addTask: (t: NewTask) => number
  replaceTask: (id: number, patch: Partial<Task>) => void
  removeTask: (id: number) => void
}

export const useTaskBank = create<TaskBankStore>()(
  persist(
    (set, get) => ({
      tasks: seedTasks,
      addTask: t => {
        const id = get().tasks.reduce((max, x) => Math.max(max, x.id), 0) + 1
        set(s => ({ tasks: [...s.tasks, { ...t, id }] }))
        return id
      },
      replaceTask: (id, patch) => set(s => ({
        tasks: s.tasks.map(t => (t.id === id ? { ...t, ...patch } : t)),
      })),
      removeTask: id => set(s => ({ tasks: s.tasks.filter(t => t.id !== id) })),
    }),
    {
      name: 'task-bank-store',
      // Merge persisted tasks with seed so static tasks are never lost,
      // but teacher-created tasks (id > max seed) survive reloads.
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<TaskBankStore>
        if (!p?.tasks) return current
        const seedIds = new Set(seedTasks.map(t => t.id))
        const extra = p.tasks.filter(t => !seedIds.has(t.id))
        return { ...current, tasks: [...seedTasks, ...extra] }
      },
    }
  )
)
