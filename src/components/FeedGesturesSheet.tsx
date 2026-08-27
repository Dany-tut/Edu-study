import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import MobileSheet from './MobileSheet'
import Switch from './Switch'
import { ActionGlyph, actionTone } from './trainer/FeedSwipe'
import {
  useFeedGestures, DEFAULT_MAP,
  type FeedAction, type FeedGesture,
} from '../store/feedGesturesStore'
import { tactile } from '../lib/feedback'
import { useT } from '../lib/i18n'

// ─────────────────────────────────────────────────────────────────────────────
// «Лента и жесты» — экран, где раскладку собирают руками
//
// ГЛАВНОЕ ЗДЕСЬ — НЕ СПИСОК, А МАКЕТ. Словами «свайп влево» и «свайп вправо»
// не описать то, что человек почувствует пальцем: какой край поедет, откуда
// выйдет значок, когда действие засчитается. Поэтому сверху стоит живой
// скелет поста, и он ПРОИГРЫВАЕТ выбранный жест целиком — с ходом карточки,
// со скруглением углов и с тем самым значком, что появится под пальцем.
// Меняешь действие — макет тут же показывает новое, не закрывая настроек.
//
// Скелет, а не настоящий пост: в макете важно движение, и любой реальный текст
// в нём читался бы вместо того, чтобы смотреть на жест.
// ─────────────────────────────────────────────────────────────────────────────

const EASE = [0.32, 0.72, 0, 1] as const

/** Ход карточки в макете. Меньше настоящего порога — макет узкий. */
const DEMO_X = 78

export const ACTIONS: FeedAction[] = ['like', 'comment', 'translate', 'listen', 'none']

export const ACTION_LABEL: Record<FeedAction, string> = {
  like: 'Нравится',
  comment: 'Комментарий',
  translate: 'Перевод',
  listen: 'Озвучка',
  none: 'Ничего',
}

const GESTURES: { id: FeedGesture; label: string; hint: string }[] = [
  { id: 'swipeLeft',  label: 'Свайп влево',    hint: 'От правого края экрана внутрь' },
  { id: 'swipeRight', label: 'Свайп вправо',   hint: 'От левого края экрана внутрь' },
  { id: 'doubleTap',  label: 'Двойной тап',    hint: 'Два быстрых касания подряд' },
  { id: 'longPress',  label: 'Долгое нажатие', hint: 'Задержать палец на посте' },
  { id: 'tap',        label: 'Тап по посту',   hint: 'Одно касание мимо слов, кнопок и ролика' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Макет
// ─────────────────────────────────────────────────────────────────────────────

function Bar({ w, h = 9 }: { w: number | string; h?: number }) {
  return <span style={{ display: 'block', width: w, height: h, borderRadius: 999, background: 'var(--color-bg-5)' }} />
}

/**
 * Скелет поста + проигрыш жеста.
 *
 * Вся анимация — один набор ключевых кадров на жест: и карточка, и знак, и
 * палец идут по одному и тому же времени, поэтому знак растёт ровно тогда,
 * когда карточка едет, а не «примерно тогда же».
 */
function GesturePreview({ gesture, action, engagement }: {
  gesture: FeedGesture
  action: FeedAction
  engagement: boolean
}) {
  const t = useT()
  const tone = actionTone(action)
  const swipe = gesture === 'swipeLeft' || gesture === 'swipeRight'
  const dir = gesture === 'swipeLeft' ? -1 : 1
  const dead = action === 'none'

  // Перезапуск при любой смене жеста или действия: `key` на моторе кадров.
  const key = `${gesture}:${action}:${engagement}`

  const loop = { repeat: Infinity, repeatDelay: 0.55, ease: EASE }

  // Карточка: свайп её везёт, тапы — вжимают.
  const card = dead
    ? { x: 0, scale: 1 }
    : swipe
      ? { x: [0, dir * DEMO_X, dir * DEMO_X, 0], borderRadius: [14, 18, 18, 14] }
      : gesture === 'doubleTap'
        ? { scale: [1, 0.972, 1, 0.972, 1] }
        : gesture === 'longPress'
          ? { scale: [1, 0.978, 0.978, 1] }
          : { scale: [1, 0.975, 1] }

  const cardT = dead ? { duration: 0 } : swipe
    ? { ...loop, duration: 2.1, times: [0, 0.42, 0.64, 1] }
    : gesture === 'doubleTap'
      ? { ...loop, duration: 1.5, times: [0, 0.14, 0.28, 0.42, 0.62] }
      : gesture === 'longPress'
        ? { ...loop, duration: 2.0, times: [0, 0.3, 0.72, 1] }
        : { ...loop, duration: 1.4, times: [0, 0.2, 0.5] }

  // Знак действия: из нуля, кривой, и выпрямляется по мере хода — ровно то,
  // что происходит под пальцем в настоящей ленте.
  const mark = dead
    ? { opacity: 0 }
    : {
      opacity: [0, 1, 1, 0],
      scale: [0.2, 1.12, 1.12, 0.45],
      rotate: [-22, 0, 0, 0],
    }
  const markT = dead ? { duration: 0 } : swipe
    ? { ...loop, duration: 2.1, times: [0, 0.42, 0.64, 0.9] }
    : gesture === 'doubleTap'
      ? { ...loop, duration: 1.5, times: [0.28, 0.44, 0.68, 0.95] }
      : gesture === 'longPress'
        ? { ...loop, duration: 2.0, times: [0.62, 0.76, 0.86, 1] }
        : { ...loop, duration: 1.4, times: [0.2, 0.36, 0.62, 0.95] }

  // Палец. Без него макет читается как «карточка сама поехала»: видно
  // следствие и не видно причины.
  const finger = dead
    ? { opacity: 0 }
    : swipe
      // Палец кладут У КРАЯ и ведут внутрь — макет показывает именно это, а не
      // «карточка сама поехала из середины».
      ? { opacity: [0, 0.9, 0.9, 0], x: [0, dir * DEMO_X, dir * DEMO_X, dir * DEMO_X], scale: [0.8, 1, 1, 1] }
      : gesture === 'doubleTap'
        ? { opacity: [0, 0.9, 0.25, 0.9, 0], scale: [0.7, 1, 0.9, 1, 0.8] }
        : gesture === 'longPress'
          ? { opacity: [0, 0.9, 0.9, 0], scale: [0.7, 1, 1.25, 0.9] }
          : { opacity: [0, 0.9, 0], scale: [0.7, 1, 0.85] }

  return (
    <div>
      <div style={{
        position: 'relative', overflow: 'hidden', padding: 10,
        borderRadius: 22, background: 'var(--color-bg-3)',
        border: '1px solid var(--color-border-soft)',
      }}>
        {/* Знак действия. У свайпа он лежит под карточкой с той стороны,
            откуда она уезжает; у тапов — всплывает по центру. */}
        <motion.span
          key={`m-${key}`}
          aria-hidden
          animate={mark}
          transition={markT}
          style={{
            position: 'absolute', zIndex: 0,
            top: '50%', marginTop: -22,
            ...(swipe
              ? (dir < 0 ? { right: 20 } : { left: 20 })
              : { left: '50%', marginLeft: -22 }),
            width: 44, height: 44, borderRadius: 999, opacity: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: tone.ink, color: 'var(--color-bg)',
          }}
        >
          <ActionGlyph action={action} size={21} />
        </motion.span>

        {/* Сам скелет поста */}
        <motion.div
          key={`c-${key}`}
          animate={card}
          transition={cardT}
          style={{
            position: 'relative', zIndex: 1,
            padding: 12, borderRadius: 14,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-soft)',
            display: 'flex', flexDirection: 'column', gap: 9,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 30, height: 30, borderRadius: 999, background: 'var(--color-bg-5)', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <Bar w={82} />
              <Bar w={52} h={7} />
            </div>
          </div>
          <Bar w="92%" />
          <Bar w="74%" />
          <span style={{ display: 'block', height: 54, borderRadius: 10, background: 'var(--color-bg-5)' }} />
          {/* Строка действий в макете живёт по настройке: выключил кнопки —
              видно, как пост становится чище, ещё до выхода из настроек. */}
          {engagement && (
            <div style={{ display: 'flex', gap: 12, paddingTop: 1 }}>
              <span style={{ width: 15, height: 15, borderRadius: 999, background: 'var(--color-bg-5)' }} />
              <span style={{ width: 15, height: 15, borderRadius: 999, background: 'var(--color-bg-5)' }} />
              <span style={{ marginLeft: 'auto', width: 15, height: 15, borderRadius: 999, background: 'var(--color-bg-5)' }} />
              <span style={{ width: 15, height: 15, borderRadius: 999, background: 'var(--color-bg-5)' }} />
            </div>
          )}
        </motion.div>

        {/* Палец */}
        <motion.span
          key={`f-${key}`}
          aria-hidden
          animate={finger}
          transition={{ ...markT, times: undefined, duration: cardT.duration }}
          style={{
            position: 'absolute', zIndex: 2, opacity: 0,
            top: '50%', marginTop: -17,
            // У свайпа палец привязан к тому краю, от которого жест
            // начинается; у тапов — к середине поста.
            ...(swipe
              ? (dir < 0 ? { right: 6 } : { left: 6 })
              : { left: '50%', marginLeft: -17 }),
            width: 34, height: 34, borderRadius: 999,
            background: 'rgba(var(--glass-rgb), 0.5)',
            boxShadow: '0 0 0 1.5px var(--color-border-medium), 0 4px 14px rgba(0,0,0,0.18)',
          }}
        />
      </div>

      {/* Подпись под макетом: что именно сейчас показывают. */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        padding: '9px 0 2px', fontSize: 12.5, fontWeight: 650, color: 'var(--color-text-3)',
      }}>
        <span>{t(GESTURES.find(g => g.id === gesture)!.label)}</span>
        <span style={{ color: 'var(--color-text-4)' }}>→</span>
        <span style={{ color: dead ? 'var(--color-text-4)' : tone.ink }}>{t(ACTION_LABEL[action])}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Ряды настроек
// ─────────────────────────────────────────────────────────────────────────────

function ActionChip({ action, on, onPick }: { action: FeedAction; on: boolean; onPick: () => void }) {
  const t = useT()
  const tone = actionTone(action)
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onPick}
      aria-pressed={on}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 12px 7px 10px', borderRadius: 999, cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
        border: `1px solid ${on ? 'transparent' : 'var(--color-border)'}`,
        background: on ? tone.soft : 'transparent',
        color: on ? tone.ink : 'var(--color-muted)',
        transition: 'background .16s ease, color .16s ease, border-color .16s ease',
      }}
    >
      {action !== 'none' && (
        <span style={{ display: 'flex' }}><ActionGlyph action={action} size={15} /></span>
      )}
      {t(ACTION_LABEL[action])}
    </motion.button>
  )
}

function FlagRow({ label, hint, value, onChange, first }: {
  label: string
  hint: string
  value: boolean
  onChange: (v: boolean) => void
  first?: boolean
}) {
  const t = useT()
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px',
      borderTop: first ? 'none' : '1px solid var(--color-border-soft)',
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 550, color: 'var(--color-text)' }}>{t(label)}</div>
        <div style={{ fontSize: 12.5, color: 'var(--color-muted)', marginTop: 2, lineHeight: 1.4 }}>{t(hint)}</div>
      </div>
      <Switch checked={value} onChange={onChange} label={t(label)} />
    </div>
  )
}

export function FeedGesturesSettings() {
  const t = useT()
  const engagement = useFeedGestures(s => s.engagement)
  const gestures = useFeedGestures(s => s.gestures)
  const sound = useFeedGestures(s => s.sound)
  const map = useFeedGestures(s => s.map)
  const setAction = useFeedGestures(s => s.setAction)
  const setFlag = useFeedGestures(s => s.setFlag)
  const reset = useFeedGestures(s => s.reset)

  // Какой жест показывает макет. Тронул ряд — показывает его; ничего не
  // трогали — показывает первый непустой, чтобы макет не стоял мёртвым.
  const [focus, setFocus] = useState<FeedGesture>(() =>
    GESTURES.find(g => map[g.id] !== 'none')?.id ?? 'swipeLeft')

  // Выключили жесты целиком — макету нечего играть, и он замирает на посте.
  useEffect(() => { if (!gestures) return }, [gestures])

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)',
    letterSpacing: '0.05em', textTransform: 'uppercase', padding: '0 2px 8px',
  }

  const pick = (g: FeedGesture, a: FeedAction) => {
    tactile()
    setFocus(g)
    setAction(g, a)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Макет липнет к верху: ряды жестов уходят под него, и выбор действия
          виден сразу, без прокрутки обратно наверх. */}
      <div style={{ position: 'sticky', top: 0, zIndex: 2 }}>
        {/* Непрозрачная, а не «почти»: под липкой шапкой уезжают ряды чипсов,
            и даже двух процентов просвета хватает, чтобы они читались тенью
            поверх макета. */}
        <div style={{ background: 'rgb(var(--glass-rgb))', paddingBottom: 4 }}>
          <GesturePreview
            gesture={focus}
            action={gestures ? map[focus] : 'none'}
            engagement={engagement}
          />
        </div>
        <div style={{ height: 14, background: 'linear-gradient(to bottom, rgb(var(--glass-rgb)), transparent)' }} />
      </div>

      <div style={{ marginTop: -12 }}>
        <div style={labelStyle}>{t('Пост')}</div>
        <div style={{ borderRadius: 18, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', overflow: 'hidden' }}>
          <FlagRow
            first
            label="Кнопки под постом"
            hint="Сердце, реплики, озвучка и перевод. Выключено — их место занимают жесты"
            value={engagement}
            onChange={v => { tactile(); setFlag('engagement', v) }}
          />
          <FlagRow
            label="Жесты по посту"
            hint="Свайпы, двойной тап и долгое нажатие"
            value={gestures}
            onChange={v => { tactile(); setFlag('gestures', v) }}
          />
          <FlagRow
            label="Звук и отдача"
            hint="Пока палец ведёт карточку и в момент, когда действие засчитано"
            value={sound}
            onChange={v => { tactile(); setFlag('sound', v) }}
          />
        </div>
      </div>

      <div>
        <div style={labelStyle}>{t('Что делает жест')}</div>
        <div style={{
          borderRadius: 18, background: 'var(--color-bg-3)',
          border: '1px solid var(--color-border-soft)', overflow: 'hidden',
          opacity: gestures ? 1 : 0.45,
          pointerEvents: gestures ? 'auto' : 'none',
          transition: 'opacity .2s ease',
        }}>
          {GESTURES.map((g, i) => (
            <div
              key={g.id}
              onPointerDown={() => setFocus(g.id)}
              style={{
                padding: '13px 15px 14px',
                borderTop: i ? '1px solid var(--color-border-soft)' : 'none',
                background: focus === g.id ? 'var(--color-bg-4, transparent)' : 'transparent',
                transition: 'background .2s ease',
              }}
            >
              {/* Название и пояснение — строками, а не в ряд: в ряду «Свайп
                  вправо» ломался пополам на 375 px, и заголовок ряда читался
                  хуже собственного пояснения. */}
              <div style={{ marginBottom: 9 }}>
                <div style={{ fontSize: 15, fontWeight: 650, color: 'var(--color-text)' }}>{t(g.label)}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-4)', lineHeight: 1.35, marginTop: 2 }}>{t(g.hint)}</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {ACTIONS.map(a => (
                  <ActionChip
                    key={a}
                    action={a}
                    on={map[g.id] === a}
                    onPick={() => pick(g.id, a)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--color-muted)', padding: '0 4px' }}>
        {t('Свайп начинается от края экрана — узкой полосой слева или справа. Смах по середине поста листает рубрики, как раньше.')}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 4px' }}>
        <span style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--color-muted)' }}>
          {t('Раскладка своя на каждом устройстве — на планшете она может быть другой.')}
        </span>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { tactile(); reset(); setFocus('swipeLeft') }}
          disabled={JSON.stringify(map) === JSON.stringify(DEFAULT_MAP)}
          style={{
            flexShrink: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13, fontWeight: 650, color: 'var(--color-accent)',
          }}
        >
          {t('Сбросить')}
        </motion.button>
      </div>
    </div>
  )
}

/** Телефон — шторка снизу. */
export default function FeedGesturesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  return (
    <MobileSheet open={open} onClose={onClose} title={t('Лента и жесты')}>
      <div style={{ padding: '0 16px 8px' }}>
        <FeedGesturesSettings />
      </div>
    </MobileSheet>
  )
}
