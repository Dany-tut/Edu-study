import { useEffect } from 'react'
import { useSeason } from '../../../lib/season'
import { getStudentSession } from '../../../lib/studentSession'
import { devFakeSticker, unseenGifts, useStickerAlbum, useStickers, type AchievementKey, type StickerKey } from '../../../lib/seasonStickers'
import StickerAlbum from './StickerAlbum'
import StickerToast from './StickerToast'
import TeacherGift from './TeacherGift'
import { useNewYearAskOpen } from './NewYearAsk'

/*
 * Слой новогодней коллекции на главной ученика: альбом (openStickerAlbum),
 * всплывашка «Новый стикер!» и окно «Подарок от учителя». Окно выбора темы —
 * отдельно, в SeasonAsk. Монтируется один раз в DashboardPage на всех версиях.
 *
 * Ученик — строка активной сессии (getStudentSession). У человека с несколькими
 * строками зачисления стикеры, выданные на другую строку (ownerStudentIdFor),
 * в этот альбом не попадут — коллекция ведётся по строке сессии.
 */
export default function SeasonStickerLayer() {
  const season = useSeason()
  const studentId = getStudentSession()?.id ?? null
  const newYear = season.season?.key === 'new-year' && season.live
  const { owned } = useStickers(newYear ? studentId : null)
  const album = useStickerAlbum()
  const askOpen = useNewYearAskOpen()
  const gift = newYear ? unseenGifts(owned)[0] ?? null : null

  // DEV: window.stkDev.earn('rocket') — всплывашка; .gift('deer', 'perfect', 'Молодец!') — подарок.
  useEffect(() => {
    if (!import.meta.env.DEV || !studentId) return
    const w = window as unknown as { stkDev?: unknown }
    w.stkDev = {
      earn: (k: StickerKey = 'rocket') => devFakeSticker(studentId, k, 'hw'),
      gift: (k: StickerKey = 'flask', achievement: AchievementKey = 'perfect', note = 'Отличный электронный баланс!') =>
        devFakeSticker(studentId, k, 'teacher', { achievement, note }),
    }
    return () => { delete w.stkDev }
  }, [studentId])

  if (!studentId) return null
  return (
    <>
      <StickerAlbum studentId={newYear || album.open ? studentId : null} />
      <StickerToast />
      <TeacherGift studentId={studentId} gift={gift} suspended={askOpen || album.open} />
    </>
  )
}
