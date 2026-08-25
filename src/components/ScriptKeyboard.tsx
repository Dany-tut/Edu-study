// ─────────────────────────────────────────────────────────────────────────────
// Какую экранную клавиатуру дать полю ответа — и отдавать ли ему системную
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ. Полей свободного ответа четыре штуки в трёх файлах
// (домашка, диалог, тест), а раскладок уже две. Без общего входа каждое поле
// решало бы за себя, какую из них показать, — и третья письменность
// потребовала бы править снова все четыре.
//
// РЕШАЕТ ЭТАЛОН, А НЕ ЯЗЫК КУРСА: в корейском курсе половина заданий
// отвечается по-русски, и клавиатура там только мешала бы.
// ─────────────────────────────────────────────────────────────────────────────

import HangulKeyboard, { needsHangul } from './HangulKeyboard'
import KanaKeyboard, { needsKana } from './KanaKeyboard'

/** Нужна ли ученику раскладка, которой у него нет. */
export const needsScriptKeyboard = (...refs: (string | undefined | null)[]): boolean =>
  needsHangul(...refs) || needsKana(...refs)

/** Знаки, которые не набирают: пробелы и знаки препинания. Они ответу не мешают. */
const IGNORED = /[\s\p{P}\p{S}]/u

/**
 * Наберётся ли ответ ОДНОЙ нашей клавиатурой — от этого зависит, глушить ли
 * системную (`inputMode="none"`).
 *
 * ЗАЧЕМ. Ответ «ICカードをなくしました» наполовину латиница, «A4로 해 주세요» —
 * цифра и латиница, а кандзи не набираются вовсе: заглушив системную
 * клавиатуру на таких заданиях, мы бы поменяли одну невыполнимость на другую.
 * Их немного (восемнадцать заданий с латиницей, сорок с кандзи), но каждое —
 * тупик ровно того же вида.
 */
export const scriptKeyboardCovers = (...refs: (string | undefined | null)[]): boolean => {
  if (!needsScriptKeyboard(...refs)) return false
  return refs.every(ref => {
    if (!ref) return true
    const rest = [...ref].filter(ch => !IGNORED.test(ch))
    return rest.every(ch => needsHangul(ch) || needsKana(ch))
  })
}

export default function ScriptKeyboard({ answer, value, onChange, disabled }: {
  /** Эталон задания — по нему и выбирается раскладка. */
  answer: string | undefined | null
  value: string | undefined
  onChange: (next: string) => void
  disabled?: boolean
}) {
  if (needsHangul(answer)) {
    return <HangulKeyboard value={value} onChange={onChange} disabled={disabled} />
  }
  if (needsKana(answer)) {
    return <KanaKeyboard value={value} onChange={onChange} disabled={disabled} />
  }
  return null
}
