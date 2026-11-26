import { create } from 'zustand'
import { useEffect, useRef } from 'react'
import type { LucideIcon } from '../components/icons/appIcons'

// Действия текущего экрана в капсуле iPad (docs/platforms.md §1.1, пункт 2:
// «экран — 0–3 действия текущего экрана»). Экран регистрирует их хуком
// useIpadScreenActions, TeacherIpadRail рисует между профилем и главным кругом.
// На ПК и телефонах экран рисует эти кнопки у себя сам — хук там не зовут.

export type RailAction = {
  id: string
  icon: LucideIcon
  label: string
  onClick: () => void
  /** Включённый режим (фильтр): ячейка вытягивается в таблетку с подписью. */
  pressed?: boolean
  disabled?: boolean
}

type State = { owner: symbol | null; actions: RailAction[] }

export const useIpadRailActions = create<State>(() => ({ owner: null, actions: [] }))

/** Зарегистрировать до трёх действий экрана; снимаются при уходе с экрана. */
export function useIpadScreenActions(actions: RailAction[] | null) {
  const owner = useRef(Symbol('screen'))
  const latest = useRef(actions)
  latest.current = actions
  const key = actions?.map(a => `${a.id}:${a.label}:${a.pressed ? 1 : 0}:${a.disabled ? 1 : 0}`).join('|') ?? ''
  useEffect(() => {
    if (!latest.current) return
    // Обработчики берутся из последнего рендера — без пересоздания на каждый кадр.
    const list = latest.current.slice(0, 3).map(a => ({ ...a, onClick: () => latest.current?.find(x => x.id === a.id)?.onClick() }))
    useIpadRailActions.setState({ owner: owner.current, actions: list })
  }, [key])
  useEffect(() => () => {
    if (useIpadRailActions.getState().owner === owner.current) useIpadRailActions.setState({ owner: null, actions: [] })
  }, [])
}
