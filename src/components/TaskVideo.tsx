// ─────────────────────────────────────────────────────────────────────────────
// Задание «посмотреть видео» — решатель
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ КОМПОНЕНТ, А НЕ IFRAME В ДОМАШКЕ. Ролик в домашке должен
// вести себя ровно так же, как запись урока: свой корпус поверх плеера (иначе
// YouTube в конце показывает сетку «похожих видео» и уводит ученика из
// домашки), учёт РЕАЛЬНО отсмотренного отрезками, продолжение с того же места
// назавтра. Всё это уже сделано в LessonVideoPlayer + lib/videoProgress.ts,
// поэтому здесь только обвязка: прогресс живёт не в lesson_progress, а прямо
// в ответе на задание (lib/videoAnswer.ts).
//
// ПОЧЕМУ ПРОСМОТР — ЭТО ОТВЕТ. Домашка хранит по заданию одну строку ответа;
// у видео её набирает плеер. Так просмотр едет теми же путями, что и остальные
// ответы: сохраняется черновиком, переживает перезагрузку, попадает к учителю.
//
// ЧТО ЭТО НЕ ПРОВЕРЯЕТ. Понимание. Задание засчитывается за просмотр, а понял
// ли ученик — спрашивают соседние задания (вопрос по ролику, пересказ,
// выписать пять слов). Ставить сюда «докажи, что смотрел» бессмысленно:
// доказательство — это и есть следующее задание.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useRef, useState } from 'react'
import { Check, Youtube } from 'lucide-react'
import LessonVideoPlayer from './LessonVideoPlayer'
import { parseVideoSource } from '../lib/videoSource'
import { formatClock, watchedSeconds, type VideoWatch } from '../lib/videoProgress'
import {
  formatVideoAnswer, parseVideoAnswer, videoRequiredSeconds,
} from '../lib/videoAnswer'
import { useT } from '../lib/i18n'

interface Props {
  url: string
  title: string
  /** Чей ролик — канал или автор. Показывается под плеером. */
  credit?: string
  /** С какой секунды открывать (у длинного ролика нужен один кусок). */
  startSeconds?: number
  /** Сколько секунд нужно просмотреть; не задано — девять десятых ролика. */
  watchSeconds?: number
  /** Ответ в формате lib/videoAnswer.ts. */
  value?: string
  disabled?: boolean
  onChange(next: string): void
}

export default function TaskVideo({
  url, title, credit, startSeconds, watchSeconds, value, disabled, onChange,
}: Props) {
  const t = useT()
  const source = useMemo(() => parseVideoSource(url), [url])

  // Стартовое состояние читается из ответа ОДИН раз: дальше просмотр меняется
  // четыре раза в секунду внутри плеера, и тянуть его через пропс значило бы
  // перерисовывать всю домашку на каждый тик.
  const [watch, setWatch] = useState<VideoWatch>(() => {
    const a = parseVideoAnswer(value)
    return {
      position: a.position,
      duration: a.duration,
      ranges: a.ranges,
      completed: false,
      updatedAt: '',
    }
  })
  // Живой счётчик ТОЛЬКО для полосы под плеером. Отдельно от `watch` он нужен
  // потому, что `watch` уезжает в initialWatch, а новый объект там плеер читает
  // как «прогресс приехал из базы» и сбрасывает свой — первые секунды просмотра
  // стирались бы. Сюда же плеер шлёт onWatchTick раз в секунду, и полоса едет
  // вместе с роликом, не дожидаясь onPersist (раз в десять секунд).
  const [live, setLive] = useState(() => {
    const a = parseVideoAnswer(value)
    return { seen: watchedSeconds(a.ranges), duration: a.duration }
  })

  // Ответ пишем не чаще, чем плеер зовёт onPersist, но и не реже: последнее
  // состояние обязано уехать в черновик, иначе закрытая на середине серия
  // назавтра начнётся с нуля.
  const lastSent = useRef('')
  /** Ответ уже говорит «просмотрено» — досылать его каждую секунду незачем. */
  const sentDone = useRef(false)

  /** Отдать просмотр в ответ. Состояние плеера при этом НЕ трогаем. */
  const emit = (next: VideoWatch) => {
    if (disabled) return
    const encoded = formatVideoAnswer({
      watched: watchedSeconds(next.ranges),
      position: next.position,
      duration: next.duration,
      ranges: next.ranges,
    })
    if (encoded === lastSent.current) return
    lastSent.current = encoded
    onChange(encoded)
  }

  const persist = (next: VideoWatch) => {
    setWatch(next)
    setLive({ seen: watchedSeconds(next.ranges), duration: next.duration })
    emit(next)
  }

  /** Секундный тик плеера: двигаем полосу, состояние плеера не трогаем. */
  const onWatchTick = (w: VideoWatch) => {
    const seenNow = watchedSeconds(w.ranges)
    setLive({ seen: seenNow, duration: w.duration })
    // Как только полоса показала «Просмотрено», ответ обязан уехать сразу:
    // «Проверить» жмут ровно в эту секунду, а onPersist придёт только через
    // десять — задание считалось бы невыполненным.
    const needNow = videoRequiredSeconds(watchSeconds, w.duration)
    if (sentDone.current || needNow <= 0 || seenNow + 0.5 < needNow) return
    sentDone.current = true
    emit(w)
  }

  // Объект прогресса для плеера считается ОДИН раз на изменение самого
  // прогресса. Новый объект на каждый рендер плеер понимает как «прогресс
  // приехал из базы» и сбрасывает свой — а родитель (домашка) перерисовывается
  // на каждый ответ в соседнем задании.
  const initialWatch = useMemo(
    // Первая точка старта — это не «продолжить», а заданное учителем начало
    // куска: у часового подкаста разбор нужного места лежит на двадцатой
    // минуте, и отматывать его руками ученик не должен.
    () => (watch.position > 0 || !startSeconds ? watch : { ...watch, position: startSeconds }),
    [watch, startSeconds],
  )

  if (!source) {
    return (
      <div style={{
        padding: '14px 16px', borderRadius: 16, fontSize: 13.5, lineHeight: 1.45,
        border: '1px solid var(--color-border)', background: 'var(--color-bg-input)',
        color: 'var(--color-text-secondary)',
      }}>
        {t('Ссылка на видео не распознана — попроси преподавателя проверить её.')}
      </div>
    )
  }

  const seen = live.seen
  const need = videoRequiredSeconds(watchSeconds, live.duration || watch.duration)
  const done = need > 0 && seen + 0.5 >= need
  const ratio = need > 0 ? Math.min(1, seen / need) : 0

  return (
    // Одна колонка на всё: полоса просмотра и подпись канала обязаны кончаться
    // там же, где кончается кадр. Ширину держал только плеер — полоса убегала
    // на всю карточку, и «Просмотрено» висело в метре правее видео.
    <div className="flex flex-col" style={{ gap: 10, maxWidth: 720, width: '100%' }}>
      <div style={{ width: '100%' }}>
        <LessonVideoPlayer
          source={source}
          title={title}
          initialWatch={initialWatch}
          // onTime не подписываем НАМЕРЕННО. Он зовётся раз в секунду, и любое
          // обновление watch из него создаёт новый объект initialWatch — а плеер
          // на смену этого объекта сбрасывает свой внутренний прогресс к
          // присланному. Получалась гонка: первые секунды просмотра стирались.
          // Длительность и позиция и так приезжают в onPersist — раз в десять
          // секунд, на паузе и при уходе с экрана.
          onPersist={persist}
          // Живьём — только для полосы ниже: в `watch` это не кладём, иначе
          // сменится initialWatch и плеер сбросит свой прогресс.
          onWatchTick={onWatchTick}
        />
      </div>

      {/* Полоса просмотра: сколько уже отсмотрено из того, что просят. Считается
          по отрезкам, поэтому перемотка в конец её не двигает. */}
      <div className="flex items-center" style={{ gap: 10 }}>
        <div style={{
          flex: 1, height: 6, borderRadius: 999, overflow: 'hidden',
          background: 'var(--color-border)',
        }}>
          <div style={{
            width: `${Math.round(ratio * 100)}%`, height: '100%', borderRadius: 999,
            background: done ? 'var(--color-green-fill)' : 'var(--color-blue-fill)',
            transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{
          fontSize: 12.5, fontWeight: 650, whiteSpace: 'nowrap',
          color: done ? 'var(--color-green-text)' : 'var(--color-text-secondary)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {done && <Check size={14} />}
          {done
            ? t('Просмотрено')
            : need > 0
              ? `${formatClock(seen)} ${t('из')} ${formatClock(need)}`
              : t('Просмотр не начат')}
        </div>
      </div>

      {credit && (
        <div className="flex items-center" style={{
          gap: 6, fontSize: 12.5, color: 'var(--color-text-secondary)',
        }}>
          <Youtube size={14} />
          <span>{credit}</span>
        </div>
      )}
    </div>
  )
}
