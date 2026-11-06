import { useMemo } from 'react'
import { useFeatureMap } from '../../../lib/teacherFeatures'
import { WIDGET_REGISTRY } from './registry'

/** Скрытые виджеты = скрытые админом + виджеты невыключенных функций.
 *  Сохранённые на столе остаются в раскладке и вернутся, когда функцию включат. */
export function useHiddenWidgets(base: string[] | undefined): string[] | undefined {
  const map = useFeatureMap()
  return useMemo(() => {
    const off = WIDGET_REGISTRY.filter(d => d.feature && map[d.feature] !== true).map(d => d.type)
    return off.length ? [...(base ?? []), ...off] : base
  }, [map, base])
}
