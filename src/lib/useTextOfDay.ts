// ─────────────────────────────────────────────────────────────────────────────
// Текст дня — с ленивой библиотекой
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. «Дозу дня» показывают два места сразу: виджет
// карусели и пилюля верхней строки. Оба доставали текст одинаково — синхронным
// textsForLang(), — и через них READING_LIBRARY вместе с телами всех текстов и
// словарями (200 КБ на входном чанке) ехала КАЖДОМУ ученику, включая того, у
// кого языкового курса нет вовсе.
//
// ПОЧЕМУ ЭТО МОЖНО ОТЛОЖИТЬ, А КОНСПЕКТ УРОКА — НЕТ. Доза — анонс на главной, и
// первый кадр у неё всё равно скелетный (курсы ещё едут из Supabase). Один
// лишний кадр без названия текста здесь ничего не ломает; ради него держать во
// входном чанке всю библиотеку — держать её ради секунды на телефоне.
//
// Библиотека грузится ОДИН раз на вкладку: промис живёт в модуле, и второй
// потребитель получает уже готовый массив.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import type { ReadingText } from '../data/readingLibrary'
import { dayKey } from './trainerDay'

/** Обещание «пять минут» — в отбор идут только короткие тексты (см. виджет). */
const MAX_MINUTES = 3

let libPromise: Promise<ReadingText[]> | null = null
function library(): Promise<ReadingText[]> {
  libPromise ??= import('../data/readingLibrary')
    .then(m => m.READING_LIBRARY)
    // Не доехало — виджет покажет своё «появится, когда выбран курс»: молчание
    // здесь честнее пустого экрана с ошибкой.
    .catch(e => { console.error('[useTextOfDay]', e); libPromise = null; return [] })
  return libPromise
}

/**
 * Текст дня: тот же на весь день, разный у разных языков.
 *
 * Ключ дня превращается в число сложением кодов символов — этого достаточно:
 * от выбора требуется устойчивость в течение суток и подвижность между ними, а
 * не равномерность распределения.
 */
export function textOfDay(texts: ReadingText[], day: string): ReadingText | undefined {
  if (texts.length === 0) return undefined
  let n = 0
  for (let i = 0; i < day.length; i++) n = (n * 31 + day.charCodeAt(i)) % 100000
  return texts[n % texts.length]
}

/** undefined — библиотека ещё едет, языка нет или коротких текстов под него нет. */
export function useTextOfDay(langCode: string | undefined): ReadingText | undefined {
  const day = dayKey()
  const [text, setText] = useState<ReadingText | undefined>()

  useEffect(() => {
    if (!langCode) { setText(undefined); return }
    let alive = true
    void library().then(all => {
      if (!alive) return
      setText(textOfDay(all.filter(x => x.lang === langCode && x.minutes <= MAX_MINUTES), day))
    })
    return () => { alive = false }
  }, [langCode, day])

  return text
}
