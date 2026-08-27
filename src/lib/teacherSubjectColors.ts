// База цветов предметов на стороне учителя: profiles.subject_colors.
//
// Это НИЖНИЙ из двух настраиваемых слоёв. Ученик может перебить любой цвет у
// себя (students.preferences.subjectColors), но обратно к учителю его правка не
// приходит — здесь всегда лежит то, что выбрал он сам.

import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { setSubjectColorOverrides } from './subjects'
import { getOwnerId } from './owner'

export type SubjectColorMap = Record<string, string>

export async function loadTeacherSubjectColors(): Promise<SubjectColorMap> {
  const uid = await getOwnerId()
  if (!uid) return {}
  const { data } = await supabase
    .from('profiles')
    .select('subject_colors')
    .eq('id', uid)
    .maybeSingle()
  const map = data?.subject_colors
  return map && typeof map === 'object' ? (map as SubjectColorMap) : {}
}

export async function saveTeacherSubjectColors(map: SubjectColorMap): Promise<boolean> {
  const uid = await getOwnerId()
  if (!uid) return false
  const { error } = await supabase
    .from('profiles')
    .update({ subject_colors: map })
    .eq('id', uid)
  return !error
}

/**
 * Красит учительский кабинет его же цветами. Ставится один раз на корень:
 * карточки курсов, чипсы предметов и графики читают палитру через
 * resolveSubjectPalette, а он смотрит в эту карту.
 */
export function useTeacherSubjectColors() {
  const [colors, setColors] = useState<SubjectColorMap>({})
  useEffect(() => {
    let cancelled = false
    loadTeacherSubjectColors().then(map => {
      if (cancelled) return
      setColors(map)
      setSubjectColorOverrides(map)
    })
    return () => { cancelled = true; setSubjectColorOverrides({}) }
  }, [])
  return colors
}
