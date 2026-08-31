// Экран одной карточки долга — первый блок занятия (Р17, см. lib/lessonDebt.ts).
//
// ПОЧЕМУ НЕ ReviewSession. Тот компонент — отдельный сеанс повторения: сам тянет
// карточки, сам листает, просит оценить себя по четырёхбалльной шкале Anki.
// Внутри занятия нужно ровно обратное: один экран — одно задание (шаг ленты
// принадлежит домашке), вердикт по канону Р10, а не самооценка, и никакой своей
// загрузки — карточки уже загружены занятием.

import { useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import type { ReviewTask } from '../lib/lessonDebt'
import { answerFace } from '../lib/lessonDebt'
import { okChime, missBlip, haptic } from '../lib/feedback'
import { useT } from '../lib/i18n'
import { bindShortWords, balancedWrap, proseWrap } from '../lib/typography'
import ScriptHint from './ScriptHint'
import StarBurst from './StarBurst'

export default function LessonReview({
  task,
  index,
  total,
  lang,
  palette,
  answered,
  onAnswer,
}: {
  task: ReviewTask
  /** Номер карточки в блоке, с единицы — для подписи «2 из 4». */
  index: number
  total: number
  /** Язык курса: под ним карточка получает транскрипцию и озвучку (Р14). */
  lang?: string
  palette: { accent: string; soft: string; text: string }
  /** Ответ, если на карточку уже отвечали (переживает F5 вместе с черновиком). */
  answered?: 'ok' | 'miss'
  onAnswer: (ok: boolean) => void
}) {
  const t = useT()
  const { card } = task
  // Открыт ли оборот у припоминания. У выбора оборот открывает сам ответ.
  const [shown, setShown] = useState(false)
  // Счётчик разлёта звёзд: ремоунт по ключу, как у вариантов домашки.
  const [burst, setBurst] = useState(0)
  // Какой вариант нажали: промах подсвечивается вместе с верным ответом,
  // иначе экран молча меняет тему и непонятно, что именно было не так.
  const [pickedIdx, setPickedIdx] = useState<number | null>(null)
  const sounded = useRef(false)

  // Карточка сменилась — экран начинается заново.
  useEffect(() => { setShown(false); setPickedIdx(null); sounded.current = false }, [card.id])

  const done = !!answered
  const face = answerFace(card)
  const full = (card.answer ?? '').trim()

  function report(ok: boolean) {
    if (done) return
    if (!sounded.current) {
      sounded.current = true
      if (ok) { okChime(); haptic(10); setBurst(n => n + 1) } else { missBlip(); haptic([12, 40, 12]) }
    }
    onAnswer(ok)
  }

  return (
    <section
      style={{
        display: 'flex', flexDirection: 'column', gap: 16,
        padding: 20, borderRadius: 22,
        border: '1px solid var(--color-border-glass)',
        background: 'rgba(var(--glass-rgb),0.9)',
        boxShadow: 'var(--shadow-bar)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: palette.accent, display: 'flex', alignItems: 'center', gap: 6 }}>
          <RotateCcw size={13} /> {t('Повторение')}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)' }}>
          {index} {t('из')} {total}
        </span>
      </div>

      {/* Лицо карточки. Слово, а не вопрос: спрашивается всегда одно и то же —
          что оно значит, — и печатать это отдельной строкой над каждой
          карточкой значит повторить одну фразу четыре раза за блок. */}
      <div>
        {card.image && (
          <img
            src={card.image}
            alt=""
            style={{ display: 'block', width: 84, height: 84, objectFit: 'contain', borderRadius: 12, background: '#fff', margin: '0 auto 12px' }}
          />
        )}
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)', textAlign: 'center', ...balancedWrap }}>
          {bindShortWords(card.prompt)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ScriptHint text={card.prompt} lang={lang} />
        </div>
      </div>

      {task.kind === 'choice' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {task.choices.map((choice, i) => {
            const right = i === task.correct
            const picked = done && (answered === 'ok' ? right : false)
            const reveal = done && right
            // Свой промах виден рядом с верным: без него непонятно, что нажал.
            const wrong = done && pickedIdx === i && !right
            return (
              <button
                key={`${card.id}-${i}`}
                disabled={done}
                onClick={() => { setPickedIdx(i); report(right) }}
                className="cursor-pointer text-left"
                style={{
                  padding: '14px 16px', borderRadius: 18,
                  border: `1px solid ${reveal ? '#6EE7A0' : wrong ? '#F8636B' : 'var(--color-border)'}`,
                  background: reveal ? 'var(--color-green-soft)' : wrong ? 'var(--color-red-soft)' : 'var(--color-bg-input)',
                  color: 'var(--color-text)',
                  fontSize: 14, lineHeight: 1.45, fontWeight: 600,
                  transition: 'all 0.18s ease',
                  opacity: done && !reveal && !wrong ? 0.84 : 1,
                  position: 'relative', fontFamily: 'inherit',
                  ...proseWrap,
                }}
              >
                {bindShortWords(choice)}
                {picked && burst > 0 && <StarBurst key={burst} />}
              </button>
            )
          })}
        </div>
      ) : !shown && !done ? (
        <button
          onClick={() => setShown(true)}
          className="cursor-pointer"
          style={{
            padding: '14px 16px', borderRadius: 18, border: `1px solid ${palette.accent}`,
            background: palette.soft, color: palette.text,
            fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
          }}
        >
          {t('Показать ответ')}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              padding: '14px 16px', borderRadius: 18,
              border: '1px solid var(--color-border)', background: 'var(--color-bg-input)',
              fontSize: 15, fontWeight: 700, color: 'var(--color-text)', textAlign: 'center',
              ...proseWrap,
            }}
          >
            {bindShortWords(full || face)}
          </div>
          {!done && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => report(false)}
                className="cursor-pointer"
                style={{
                  flex: 1, padding: '12px 14px', borderRadius: 16,
                  border: '1px solid var(--color-border)', background: 'var(--color-red-soft)',
                  color: 'var(--color-red-text)', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                }}
              >
                {t('Не вспомнил')}
              </button>
              <button
                onClick={() => report(true)}
                className="cursor-pointer"
                style={{
                  flex: 1, padding: '12px 14px', borderRadius: 16,
                  border: '1px solid var(--color-border)', background: 'var(--color-green-soft)',
                  color: 'var(--color-green-text)', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                }}
              >
                {t('Вспомнил')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Оборот целиком — с чтением, которое в вариантах выбора срезано
          (answerFace). Показывается только после ответа: до него это подсказка. */}
      {done && task.kind === 'choice' && full && full !== face && (
        <div style={{ fontSize: 13, color: 'var(--color-muted)', textAlign: 'center', ...proseWrap }}>
          {bindShortWords(full)}
        </div>
      )}
    </section>
  )
}
