// Виджеты стола, привязанные к функции учителя (teacherFeatures.ts): без
// включённой функции виджета нет ни на столе, ни в окне «Добавить виджет».
// Раскладка не трогается — включили функцию снова, виджет на месте.
import { useMemo } from 'react'
import { WIDGET_REGISTRY } from '../components/teacher/widgets/registry'
import { useFeature, useTeacherFeatures } from './teacherFeatures'

/** hidden_widgets от админа + виджеты выключенных функций. */
export function useFeatureHiddenWidgets(hidden: string[] | undefined): string[] {
  useFeature('reminders') // запускает загрузку доступов
  const map = useTeacherFeatures(s => s.map)
  return useMemo(() => {
    const off = WIDGET_REGISTRY.filter(def => def.feature && map[def.feature] !== true).map(def => def.type)
    if (off.length === 0) return hidden ?? []
    return [...new Set([...(hidden ?? []), ...off])]
  }, [hidden, map])
}
