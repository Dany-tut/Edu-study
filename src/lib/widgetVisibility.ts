// ─────────────────────────────────────────────────────────────────────────────
// Какие виджеты уместны прямо сейчас
//
// Реестр виджетов (data/widgets.ts) — общий на всех, а главная теперь работает
// в рамках выбранного курса. Два разных «не показывать»:
//
//   1. ПРЕДМЕТ. «Реакции» и «Научные факты» писались под химию с биологией.
//      Ученику, который учит корейский, они не «редко нужны» — они не нужны
//      никогда, и место в карусели занимают зря.
//   2. ПУСТОТА. Контентные виджеты берут материал из таблиц, которые сейчас
//      пустые: викторина рисует заголовок «…» и кнопку «Начать», после которой
//      ничего не происходит. Пустой виджет — хуже отсутствующего.
//
// Оба правила — про показ, а не про настройки: сохранённый порядок ученика не
// трогается, и виджет вернётся на своё место сам, как только сменится курс или
// появится контент.
//
// СКОУП ПРЕДМЕТА — активный курс, тот же, что у статистики. Если у него нет
// предмета из реестра (внекурсовая домашка, курс со свободным тегом), берём
// предметы всех курсов ученика: лучше показать лишнее, чем спрятать нужное.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useMemo } from 'react'
import { WIDGET_META } from '../data/widgets'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import { getSubject } from './subjects'

/** Предикат «показывать ли виджет с таким id». */
export function useWidgetRelevance(): (id: number) => boolean {
  const subjects = useStudentData(s => s.subjects)
  const loaded = useStudentData(s => s.loaded)
  const quiz = useStudentData(s => s.quizQuestions.length)
  const facts = useStudentData(s => s.scienceFacts.length)
  const memes = useStudentData(s => s.scienceMemes.length)
  const reactions = useStudentData(s => s.courseReactions.length)
  const activeSubjectId = useDashboard(s => s.activeSubjectId)

  const scope = useMemo(() => {
    const active = subjects.find(s => s.id === activeSubjectId) ?? subjects[0]
    const one = getSubject(active?.subject)?.id
    if (one) return new Set([one])
    const all = subjects.map(s => getSubject(s.subject)?.id).filter((x): x is string => !!x)
    return new Set(all)
  }, [subjects, activeSubjectId])

  return useCallback((id: number) => {
    const meta = WIDGET_META.find(w => w.id === id)
    // Незнакомый id (виджет из будущей версии, чужая запись в настройках) не
    // наше дело прятать — этим занимается сама карусель.
    if (!meta) return true
    // Пока курсы не приехали, предмет неизвестен: фильтровать нечем и незачем.
    if (meta.subjects && scope.size > 0 && !meta.subjects.some(s => scope.has(s))) return false
    if (meta.content && loaded) {
      const count = { quiz, facts, memes, reactions }[meta.content]
      if (count === 0) return false
    }
    return true
  }, [scope, loaded, quiz, facts, memes, reactions])
}
