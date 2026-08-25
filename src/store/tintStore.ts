// ─────────────────────────────────────────────────────────────────────────────
// Хранилище цвета курса: три слоя (реестр → база учителя → правка ученика),
// глубина перекраски и предмет открытого сейчас курса.
//
// Слои держатся ОТДЕЛЬНЫМИ картами и никогда не сливаются в одну на запись:
// ученик правит только свою, учитель — только свою, и «сбросить» у ученика
// означает вернуться к учительскому цвету, а не к реестровому.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useEffect, useRef } from 'react'
import { setSubjectColorOverrides } from '../lib/subjects'
import { applyCourseTint, resolveAccent, subjectKey, DEFAULT_TINT_LEVEL, type TintLevel } from '../lib/courseTint'
import { useTheme } from './themeStore'

type ColorMap = Record<string, string>

interface TintStore {
  /** Глубина перекраски — настройка ученика. */
  level: TintLevel
  /** Личные цвета ученика: id предмета → hex. Бьют учительские. */
  studentColors: ColorMap
  /** База учителя, прочитанная из его профиля. Только чтение на стороне ученика. */
  teacherColors: ColorMap
  /** Предмет курса, открытого сейчас. null — «Все курсы», оттенка нет. */
  activeSubject: string | null
  /** Счётчик правок: подписчики перерисовываются, когда карта цветов сменилась. */
  version: number

  setLevel: (l: TintLevel) => void
  setStudentColor: (subject: string, hex: string | null) => void
  setStudentColors: (m: ColorMap) => void
  setTeacherColors: (m: ColorMap) => void
  setActiveSubject: (subject: string | null) => void
}

export const useTint = create<TintStore>()(persist((set, get) => ({
  level: DEFAULT_TINT_LEVEL,
  studentColors: {},
  teacherColors: {},
  activeSubject: null,
  version: 0,

  setLevel: (level) => set({ level }),

  setStudentColor: (subject, hex) => {
    const key = subjectKey(subject)
    if (!key) return
    const next = { ...get().studentColors }
    if (hex) next[key] = hex
    else delete next[key]   // сброс = отдать предмет обратно учителю, не реестру
    set({ studentColors: next, version: get().version + 1 })
    syncOverrides()
  },

  setStudentColors: (m) => { set({ studentColors: m ?? {}, version: get().version + 1 }); syncOverrides() },
  setTeacherColors: (m) => { set({ teacherColors: m ?? {}, version: get().version + 1 }); syncOverrides() },

  setActiveSubject: (subject) => {
    if (get().activeSubject === subject) return
    set({ activeSubject: subject })
  },
}), {
  name: 'course-tint',
  storage: createJSONStorage(() => localStorage),
  // Учительская база не кэшируется: она чужая и меняется без ведома этого
  // устройства — читается из БД при каждой загрузке кабинета.
  partialize: (s) => ({ level: s.level, studentColors: s.studentColors }),
}))

// После восстановления карту надо не только пересобрать, но и заставить
// перерисоваться тех, кто читает палитру напрямую (чипс курса, карточки): у них
// на руках цвет из реестра, и сам по себе он не обновится.
useTint.persist.onFinishHydration(() => {
  syncOverrides()
  useTint.setState(s => ({ version: s.version + 1 }))
})

/**
 * Слить слои и отдать реестру предметов — чтобы палитру предмета видели и те
 * места, что рисуют не через CSS-переменные (карточки курсов, чипсы, графики).
 */
function syncOverrides() {
  const { studentColors, teacherColors } = useTint.getState()
  setSubjectColorOverrides({ ...teacherColors, ...studentColors })
}

// Карта пересобирается на ЛЮБУЮ смену состояния, а не только из сеттеров.
// Причина — восстановление из localStorage: zustand считает своё хранилище
// асинхронным даже поверх синхронного localStorage, поэтому первый рендер
// проходит на реестровых цветах, а отдельный хук восстановления надёжно
// поймать этот момент не даёт. Подписка ловит его в любом случае.
syncOverrides()
useTint.subscribe((s, prev) => {
  if (s.studentColors !== prev.studentColors || s.teacherColors !== prev.teacherColors) syncOverrides()
})

/** Цвет активного курса с учётом слоёв и темы. null — оттенок не применяется. */
export function activeAccent(state: TintStore, dark: boolean): string | null {
  if (state.level === 'off' || !state.activeSubject) return null
  return resolveAccent(state.activeSubject, { student: state.studentColors, teacher: state.teacherColors }, dark)
}

/**
 * Держит переменные документа в согласии с состоянием. Вешается один раз на
 * корень кабинета: перекраска глобальна, второй вызов просто перепишет то же.
 */
export function useCourseTint() {
  const dark = useTheme(s => s.dark)
  const level = useTint(s => s.level)
  const activeSubject = useTint(s => s.activeSubject)
  const version = useTint(s => s.version)

  // Предыдущий акцент — чтобы отличить смену курса (цвет должен перетечь) от
  // первой отрисовки и от смены темы (там перетекать нечему).
  const prev = useRef<string | null | undefined>(undefined)
  const shiftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const accent = activeAccent(useTint.getState(), dark)
    const changed = prev.current !== undefined && prev.current !== accent
    prev.current = accent

    if (changed) {
      const root = document.documentElement
      root.setAttribute('data-tint-shift', '')
      if (shiftTimer.current) clearTimeout(shiftTimer.current)
      // Снять чуть позже конца перехода (0.42s): правило висит на каждом
      // элементе и в покое стоить ничего не должно.
      shiftTimer.current = setTimeout(() => root.removeAttribute('data-tint-shift'), 470)
    }
    applyCourseTint(accent, level, dark)
  }, [dark, level, activeSubject, version])

  useEffect(() => () => { if (shiftTimer.current) clearTimeout(shiftTimer.current) }, [])

  // Снять оттенок при выходе из кабинета — иначе цвет курса ученика остался бы
  // на экране входа и в учительской, открытой в той же вкладке.
  useEffect(() => () => applyCourseTint(null, 'off', useTheme.getState().dark), [])
}
