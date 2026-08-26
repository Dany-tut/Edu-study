import { useEffect, useSyncExternalStore } from 'react'
import { ensureGloss, subscribeGloss, glossRev } from './lexicon'

/**
 * «Словарь загружен» для компонентов, которые разбирают текст по словам.
 *
 * Сам словарь едет отдельным чанком (см. lexicon.ts), поэтому первый рендер
 * может застать его пустым: текст покажется без переводов. Хук делает две
 * вещи — просит словарь загрузиться и возвращает номер ревизии, который
 * достаточно положить в зависимости useMemo, чтобы разбор пересчитался, когда
 * словарь доедет.
 */
export function useGloss(): number {
  useEffect(() => { void ensureGloss().catch(() => { /* без переводов, но живой */ }) }, [])
  return useSyncExternalStore(subscribeGloss, glossRev, glossRev)
}
