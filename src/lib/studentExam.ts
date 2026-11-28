// ─────────────────────────────────────────────────────────────────────────────
// Экзамен ученика по предмету банка (ЕГЭ / ОГЭ)
//
// Экзамен уже известен из карточки предмета: в профиле выбрано «Химия · ЕГЭ» —
// это группа ученика с уровнем «ЕГЭ». Спрашивать в тренажёре ещё раз «ЕГЭ или
// ОГЭ?» незачем (слова Дани 28.11: «если предмет одного типа, то вообще убирай
// этот пункт экзамен»). Тренажёр показывает банк только этого экзамена.
//
// Экзамен НЕ известен, когда:
//   • у ученика нет карточки этого предмета (учитель, гость, предмет из банка
//     по запасному пути), или в уровне группы нет «ЕГЭ»/«ОГЭ»;
//   • карточек этого предмета две с разными экзаменами и открыта чужая.
// Тогда остаётся прежний выбор ЕГЭ/ОГЭ в тренажёре с памятью на предмет.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { getSubject } from './subjects'
import { useSubjectCards, type Card } from '../components/SubjectSwitcher'

export type BankExam = 'ege' | 'oge'

/** «ЕГЭ 2027», «Проба · ЕГЭ» → ege; «ОГЭ» → oge; прочее → undefined. */
export function examFromLevel(level: string | undefined | null): BankExam | undefined {
  const s = level ?? ''
  const oge = /огэ/i.test(s), ege = /егэ/i.test(s)
  if (oge === ege) return undefined
  return oge ? 'oge' : 'ege'
}

/** Экзамен предмета по карточкам ученика; undefined — выбирать в тренажёре. */
export function examForSubject(cards: Card[], current: Card | null, subjectId: string): BankExam | undefined {
  const mine = cards.filter(c => getSubject(c.subject)?.id === subjectId)
  // Открытая карточка этого предмета решает сама: «Химия · ЕГЭ» выбрана — ЕГЭ.
  if (current && getSubject(current.subject)?.id === subjectId) {
    const e = examFromLevel(current.level)
    if (e) return e
  }
  const exams = new Set(mine.map(c => examFromLevel(c.level)).filter(Boolean) as BankExam[])
  return exams.size === 1 ? [...exams][0] : undefined
}

/** Экзамен, выбранный в тренажёре вручную (когда его не задаёт карточка). */
export function storedExam(subjectId: string): BankExam {
  try { return localStorage.getItem(`trainer_exam_${subjectId}`) === 'oge' ? 'oge' : 'ege' } catch { return 'ege' }
}

const EVENT = 'trainer-exam-changed'

/** Запомнить ручной выбор экзамена и сказать меню предметов пересчитать число. */
export function rememberExam(subjectId: string, exam: BankExam): void {
  try { localStorage.setItem(`trainer_exam_${subjectId}`, exam) } catch { /* приватный режим */ }
  try { window.dispatchEvent(new Event(EVENT)) } catch { /* вне браузера */ }
}

/** Счётчик смен ручного выбора — зависимость для пересчёта списков. */
export function useExamVersion(): number {
  const [v, setV] = useState(0)
  useEffect(() => {
    const on = () => setV(x => x + 1)
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  return v
}

/** Хук: экзамен из карточек ученика или undefined. */
export function useStudentExam(subjectId: string): BankExam | undefined {
  const { cards, current } = useSubjectCards()
  return examForSubject(cards, current, subjectId)
}

/** Хук для списков: функция «предмет → экзамен из карточек». */
export function useStudentExamFn(): (subjectId: string) => BankExam | undefined {
  const { cards, current } = useSubjectCards()
  return useCallback((subjectId: string) => examForSubject(cards, current, subjectId), [cards, current])
}

