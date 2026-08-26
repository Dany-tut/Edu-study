// ─────────────────────────────────────────────────────────────────────────────
// Разбор слова по корням — общий вход для языков, где он вообще возможен
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. Экраны «Конструктора» (trainer/RootBuilder) написаны
// над одной структурой HanjaRoot и языка не знают: им всё равно, корейский это
// слог или японский иероглиф. А вот ИСТОЧНИК данных у языков разный, и до сих
// пор он был жёстко один — корейский. Из-за этого режим, который отвечает на
// вопрос «из чего собрано слово», открывался ровно у одного языка из шести,
// хотя у японского тот же вопрос стоит ещё острее: там кирпич виден глазом
// прямо в строке.
//
// ЧЕГО ЗДЕСЬ НЕТ. Своей структуры данных: интерфейсы живут в koreanHanja.ts,
// где они появились, и переносить их сюда значило бы устроить правку в десяти
// файлах ради переименования. Здесь только диспетчеризация по языку.
//
// ПОЧЕМУ НЕ ВСЕ ЯЗЫКИ. У английского словообразование латинско-греческое и
// работает иначе: корень там не слог и не знак, а морфема с чередованием
// (port → import, portable, transport). Это отдельная модель, и подсовывать её
// в эту структуру значило бы соврать в обе стороны.
// ─────────────────────────────────────────────────────────────────────────────

import {
  HANJA_ROOTS, HANJA_GROUPS, wordBricks,
  type HanjaBrick, type HanjaGroup, type HanjaRoot,
} from './koreanHanja'
import { KANJI_ROOTS } from './japaneseKanji'

/** Базовый код языка: pt-BR → pt. */
const base = (lang: string | undefined) => (lang ?? '').split('-')[0].toLowerCase()

const SOURCES: Record<string, HanjaRoot[]> = {
  ko: HANJA_ROOTS,
  ja: KANJI_ROOTS,
}

/** Есть ли у языка разбор по корням. Синхронно — по нему решается, рисовать ли раздел. */
export const hasRoots = (lang: string | undefined): boolean => base(lang) in SOURCES

/** Корни языка. Пустой список у языка без разбора — раздел до него не доходит. */
export const rootsForLang = (lang: string | undefined): HanjaRoot[] =>
  SOURCES[base(lang)] ?? []

/**
 * Группы, в которых у языка реально есть корни.
 *
 * Порядок берётся из общего списка HANJA_GROUPS, но пустые полки отсекаются:
 * у японского может не оказаться корня какой-то группы, и пустая вкладка в
 * рейле хуже её отсутствия.
 */
export const rootGroupsForLang = (lang: string | undefined): HanjaGroup[] => {
  const present = new Set(rootsForLang(lang).map(r => r.group))
  return HANJA_GROUPS.filter(g => present.has(g))
}

/** Корень по его записи — экран открывает гнездо по id из адреса. */
export const rootByIdForLang = (lang: string | undefined, id: string): HanjaRoot | undefined =>
  rootsForLang(lang).find(r => r.ko === id)

/** Сколько слов разобрано у языка — для подписи раздела. */
export const rootWordCount = (lang: string | undefined): number =>
  rootsForLang(lang).reduce((n, r) => n + r.words.length, 0)

/**
 * Все кирпичи языка — пул отвлекающих плиток для сборки слова.
 *
 * Пул обязан быть СВОИМ: подставить японцу корейский слог значит дать задание,
 * в котором неверный вариант виден по письменности, а не по смыслу.
 */
export function bricksForLang(lang: string | undefined): HanjaBrick[] {
  const seen = new Map<string, HanjaBrick>()
  for (const root of rootsForLang(lang)) {
    for (const word of root.words) {
      for (const brick of wordBricks(word) ?? []) {
        if (!seen.has(brick.ko)) seen.set(brick.ko, brick)
      }
    }
  }
  return [...seen.values()]
}
