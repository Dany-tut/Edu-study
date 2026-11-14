import { useEffect, useRef, useState, type ComponentProps, type ReactNode, type RefObject } from 'react'
import LessonVideoPlayer, { PLAYER_MAX_H, PLAYER_MAX_W, type LessonVideoHandle } from './LessonVideoPlayer'
import LessonVideoProgress from './LessonVideoProgress'
import { ListVideo } from './icons/appIcons'
import { activeTimecodeIndex } from '../data/lessonContent'
import { useScrollFades } from '../lib/useScrollFades'
import { useT } from '../lib/i18n'
import { emptyWatch, type VideoWatch } from '../lib/videoProgress'

type PlayerProps = ComponentProps<typeof LessonVideoPlayer>
type RecordingProps = Pick<PlayerProps, 'source' | 'title' | 'badge' | 'durationLabel' | 'montage'> & {
  recordingKey: string
  timecodes: NonNullable<PlayerProps['timecodes']>
  playerRef: RefObject<LessonVideoHandle | null>
  watch: VideoWatch
  onPersist: PlayerProps['onPersist']
  onTime: NonNullable<PlayerProps['onTime']>
  videoTime: number
  videoDuration: number
  progressFooter?: ReactNode
}

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`
}

/** The student's actual recording UI, shared with the teacher's read-only preview. */
export default function LessonRecordingView({ recordingKey, source, title, badge, durationLabel,
  timecodes, playerRef, watch, onPersist, onTime, videoTime, videoDuration, montage, progressFooter,
}: RecordingProps) {
  const t = useT()
  const playing = videoDuration > 0
  const activeChapter = activeTimecodeIndex(timecodes, videoTime)
  const chapterListRef = useRef<HTMLDivElement>(null)
  const chapterRowRefs = useRef<Record<number, HTMLButtonElement | null>>({})
  useScrollFades(chapterListRef, timecodes.length > 0)
  // Подтянуть активную строку в видимую часть списка. Скроллим сам контейнер, а
  // не через scrollIntoView: тот тянет за собой и страницу целиком.
  useEffect(() => {
    if (!playing) return
    const list = chapterListRef.current
    const row = chapterRowRefs.current[activeChapter]
    if (!list || !row) return
    const top = row.offsetTop
    const bottom = top + row.offsetHeight
    if (top < list.scrollTop) list.scrollTo({ top, behavior: 'smooth' })
    else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: bottom - list.clientHeight, behavior: 'smooth' })
    }
  }, [activeChapter, playing])

  return (
    <div
      className={timecodes.length ? 'grid lg:grid-cols-[minmax(0,1fr)_320px] items-stretch' : 'grid'}
      style={{ gap: 16 }}
    >
      {/* Плеер: свой корпус поверх YouTube/RuTube/файла + учёт просмотра.
          Ширину колонки ограничиваем ровно там, где 16:9 упирается в
          потолок высоты (PLAYER_MAX_W) — иначе на широком мониторе видео
          растянулось бы в полосу. Без панели справа колонка встаёт по
          центру; с панелью она прижата к ней, чтобы зазор между видео и
          списком глав оставался тем же, что и всюду в сетке. */}
      <div
        className="flex flex-col min-w-0"
        style={{ gap: 10, width: '100%', maxWidth: PLAYER_MAX_W, marginInline: timecodes.length ? 'auto 0' : 'auto' }}
      >
        <LessonVideoPlayer
          key={recordingKey}
          ref={playerRef}
          source={source}
          title={title}
          badge={badge}
          durationLabel={durationLabel}
          timecodes={timecodes}
          initialWatch={watch}
          onPersist={onPersist}
          onTime={onTime}
          montage={montage}
        />

        {/* Сколько записи реально отсмотрено. Перемотка в конец сюда не
            попадает — считаются только отрезки, пройденные воспроизведением. */}
        <LessonVideoProgress watch={watch} duration={videoDuration || watch.duration} />
        {progressFooter}
      </div>

      {/* Timecodes panel.
          Высоту ряда задаёт только видео — у него честные 16:9, и подстроить
          его под список глав нельзя. Поэтому рядом с видео (от lg) панель
          вынута из потока в absolute: сорок глав больше не растягивают ряд,
          а просто прокручиваются внутри. Ниже lg панель встаёт отдельной
          строкой под видео и живёт своей высотой, ограниченной сверху. */}
      {timecodes.length > 0 && (
      <div className="relative min-w-0">
      <div
        className="flex flex-col lg:absolute lg:inset-0"
        style={{
          borderRadius: 24,
          background: 'rgba(var(--glass-rgb), 0.96)',
          border: '1px solid var(--color-border-soft)',
          boxShadow: 'var(--shadow-2)',
          padding: 16,
          gap: 6,
          minHeight: 0,
          maxHeight: PLAYER_MAX_H,
        }}
      >
        <div className="flex items-center" style={{ gap: 8, marginBottom: 6 }}>
          <ListVideo size={18} style={{ color: 'var(--color-accent)' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{t('Таймкоды')}</span>
          <span style={{ flex: 1 }} />
          {/* Позиция ролика прямо в шапке — видно, что список и плеер об
              одном и том же, даже когда глава длинная. */}
          {playing && (
            <span
              style={{
                fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                color: 'var(--color-text-3)', flexShrink: 0,
              }}
            >
              {formatClock(videoTime)} / {formatClock(videoDuration)}
            </span>
          )}
        </div>
        <div ref={chapterListRef} className="flex flex-col flex-1" style={{ gap: 2, overflowY: 'auto', minHeight: 0, paddingRight: 10 }}>
          {timecodes.map((tc, i) => {
            const active = i === activeChapter
            // Глава кончается там, где начинается следующая; последняя — на
            // конце ролика, длину которого знает плеер.
            const end = timecodes[i + 1]?.seconds ?? videoDuration
            const span = end - tc.seconds
            const played = active && playing && span > 0
              ? Math.min(1, Math.max(0, (videoTime - tc.seconds) / span))
              : 0
            return (
              <button
                key={`${tc.time}-${i}`}
                ref={el => { chapterRowRefs.current[i] = el }}
                onClick={() => { onTime(tc.seconds, videoDuration); playerRef.current?.playFrom(tc.seconds) }}
                className="relative flex items-center cursor-pointer text-left"
                style={{
                  gap: 10, padding: '10px 10px', borderRadius: 12, border: 'none',
                  background: active ? 'var(--color-purple-soft)' : 'transparent',
                  transition: 'background 0.15s ease', overflow: 'hidden',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-3)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <span
                  style={{
                    fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                    color: active ? 'var(--color-accent)' : 'var(--color-text-3)', minWidth: 42, flexShrink: 0,
                  }}
                >
                  {tc.time}
                </span>
                <span style={{ fontSize: 14, fontWeight: active ? 600 : 500, color: active ? 'var(--color-text)' : 'var(--color-text-2)' }}>
                  {tc.label}
                </span>
                {/* Сколько этой главы уже проиграно — та же полоса, что
                    ползёт по шкале плеера, только в масштабе строки. */}
                {played > 0 && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute', left: 0, bottom: 0, height: 2,
                      width: `${played * 100}%`, background: 'var(--grad-purple)',
                      borderRadius: 999, transition: 'width 0.38s linear',
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
      </div>
      )}
    </div>
  )
}

/** Local-only viewing session: never writes student progress or teacher edits. */
export function LessonRecordingPreview(props: Pick<RecordingProps, 'recordingKey' | 'source' | 'title' | 'timecodes' | 'montage' | 'badge'>) {
  const playerRef = useRef<LessonVideoHandle>(null)
  const [watch, setWatch] = useState(emptyWatch)
  const [videoTime, setVideoTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  return <LessonRecordingView {...props} playerRef={playerRef} watch={watch} onPersist={setWatch}
    videoTime={videoTime} videoDuration={videoDuration}
    onTime={(time, duration) => { setVideoTime(time); setVideoDuration(duration) }} />
}
