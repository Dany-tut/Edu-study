import { useT } from '../../../lib/i18n'
import { nextCommon, stickerDef, stickerImg, useStickers } from '../../../lib/seasonStickers'
import { COMPLETE_RATIO, watchRatio, withCompletion, type VideoWatch } from '../../../lib/videoProgress'
import { SnowCap } from './PlayerSkin'
import { useNewYearLive, useNewYearSkin } from './useNewYearSkin'
import './videoSkin.css'

/** source_ref стикера за просмотр записи урока — один на урок. */
export const videoStickerRef = (lessonId: string) => `video:${lessonId}`

/**
 * Карточка «Стикер за просмотр» под записью урока (Figma стр. 19, секция F).
 * Прогресс — к тем же 90%, что открывают домашку (COMPLETE_RATIO): до порога
 * следующий стикер коллекции показан силуэтом, после — цветным. Показывается,
 * пока идёт сезон, даже если ученик выключил тему: стикеры копятся всё равно.
 * Всплывашку «Новый стикер!» рисует общий слушатель onStickerEarned, не карточка.
 */
export default function VideoStickerCard({ studentId, lessonId, watch, duration }: {
  studentId: string | null | undefined
  lessonId: string
  watch: VideoWatch
  duration: number
}) {
  const t = useT()
  const live = useNewYearLive()
  const skin = useNewYearSkin()
  const { owned, loaded } = useStickers(live ? studentId : null)
  if (!live || !studentId || !loaded) return null

  const progress = { ...watch, duration: duration || watch.duration }
  const completed = withCompletion(progress).completed
  const earned = owned.find(o => o.source === 'video' && o.sourceRef === videoStickerRef(lessonId))
  const key = earned?.stickerKey ?? nextCommon(owned)
  // Вся обычная коллекция собрана, а за этот урок ничего не выдано — обещать нечего.
  if (!key) return null

  const toGoal = completed ? 1 : Math.min(1, watchRatio(progress) / COMPLETE_RATIO)
  const percent = Math.round(watchRatio(progress) * 100)
  const name = t(stickerDef(key)?.title ?? '')
  const got = !!earned

  return (
    <section className="ny-sticker-card" data-skin={skin} aria-label={t('Стикер за просмотр')}>
      {skin && <SnowCap />}
      <div className="ny-sticker-card__art" data-earned={got}>
        <img src={stickerImg(key)} alt={got ? name : ''} draggable={false} />
      </div>
      <div className="ny-sticker-card__body">
        <span className="ny-sticker-card__eyebrow">{got ? `${t('Стикер за просмотр')} · ${name}` : t('Стикер за просмотр')}</span>
        <span className="ny-sticker-card__title">
          {got ? t('Досмотрено 90% — стикер твой!') : t('Досмотри до 90% — стикер твой')}
        </span>
        <div className="ny-sticker-card__bar" role="progressbar" aria-label={t('Прогресс к стикеру')}
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(toGoal * 100)}>
          <div style={{ width: `${toGoal * 100}%` }} />
        </div>
      </div>
      <span className="ny-sticker-card__pct">{percent}%</span>
    </section>
  )
}
