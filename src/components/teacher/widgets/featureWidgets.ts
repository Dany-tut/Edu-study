import { useMemo } from 'react'
import { useTeacherFeatures, useFeature } from '../../../lib/teacherFeatures'
import { WIDGET_REGISTRY } from './registry'

/**
 * Виджеты функций-автоматизаций (поле `feature` в реестре) видны только при
 * выданной и включённой функции. Без неё их нет ни на столе, ни в «Добавить
 * виджет»; сохранённое место на столе остаётся — включили снова, вернулся.
 */
export function useFeatureHiddenWidgets(): string[] {
  // Загружает доступы один раз (общий загрузчик функций).
  useFeature('payment_reminders')
  const map = useTeacherFeatures(s => s.map)
  return useMemo(
    () => WIDGET_REGISTRY.filter(def => def.feature && map[def.feature] !== true).map(def => def.type),
    [map],
  )
}
