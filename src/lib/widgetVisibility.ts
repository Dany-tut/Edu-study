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
// Курсов с предметом нет — собственный предмет ученика (students.subject).
// Правило живёт в studentSubject.ts → widgetSubjectScope.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useMemo } from 'react'
import { WIDGET_META } from '../data/widgets'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import { isLanguageSubject } from './subjects'
import { widgetSubjectScope } from './studentSubject'

/**
 * Предикат «показывать ли виджет с таким id».
 *
 * `subjectOverride` — предмет экрана, если он свой: в тренажёре ученик может
 * решать английский, пока на главной открыт другой курс, и виджеты в шапке
 * должны быть про то, чем он занят сейчас. Не задан или не опознан — скоуп
 * прежний, по активному курсу.
 */
export function useWidgetRelevance(subjectOverride?: string | null): (id: number) => boolean {
  const subjects = useStudentData(s => s.subjects)
  const loaded = useStudentData(s => s.loaded)
  const quiz = useStudentData(s => s.quizQuestions.length)
  const facts = useStudentData(s => s.scienceFacts.length)
  const memes = useStudentData(s => s.scienceMemes.length)
  const reactions = useStudentData(s => s.courseReactions.length)
  const activeSubjectId = useDashboard(s => s.activeSubjectId)

  const profileSubject = useStudentData(s => s.profileSubject)

  const scope = useMemo(() => widgetSubjectScope({
    courses: subjects, activeCourseId: activeSubjectId, override: subjectOverride, profileSubject,
  }), [subjects, activeSubjectId, subjectOverride, profileSubject])

  return useCallback((id: number) => {
    const meta = WIDGET_META.find(w => w.id === id)
    // Незнакомый id (виджет из будущей версии, чужая запись в настройках) не
    // наше дело прятать — этим занимается сама карусель.
    if (!meta) return true
    // Пока курсы не приехали, предмет неизвестен: фильтровать нечем и незачем.
    // Курсы приехали, а предмета нет (ни одного курса, свободные теги) —
    // предметные виджеты прячем: «Реакции Zn + 2HCl» ученику без химии
    // не нужны. Нейтральные («Фокус», «Твои дела», вопрос дня) остаются.
    const subjectless = loaded && scope.size === 0
    if (meta.subjects && (subjectless || (scope.size > 0 && !meta.subjects.some(s => scope.has(s))))) return false
    // Языковой виджет — на любом языке и ни на одном экзаменационном предмете.
    if (meta.languagesOnly && (subjectless || (scope.size > 0 && ![...scope].some(isLanguageSubject)))) return false
    if (meta.content && loaded) {
      const count = { quiz, facts, memes, reactions }[meta.content]
      if (count === 0) return false
    }
    return true
  }, [scope, loaded, quiz, facts, memes, reactions])
}
