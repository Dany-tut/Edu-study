import { isNewYearLive, useSeason } from '../../../lib/season'

/**
 * Новогодний скин видеоурока (Figma «Искра», стр. 19, секция F). Только
 * оформление: гирлянда, снежная шапка, Огонёк-бегунок, главы-снежинки, снег.
 * Включается вместе с темой — выбрал «Без темы», плеер прежний.
 */
export function useNewYearSkin(): boolean {
  const s = useSeason()
  return s.active && s.season?.key === 'new-year' && s.on('video')
}

/**
 * Идёт ли сезон стикеров. useSeason() здесь — ради подписки: без неё карточка
 * не перерисуется, когда сезон догрузится из базы. Стикеры копятся и без темы.
 */
export function useNewYearLive(): boolean {
  useSeason()
  return isNewYearLive()
}
