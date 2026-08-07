// ─────────────────────────────────────────────────────────────────────────────
// Скелет тренажёра: рейл слева, строка управления сверху, содержимое справа
//
// ЗАЧЕМ. Банк заданий ЕГЭ давно устроен правильно — карточка-рейл с фильтрами,
// строка с поиском, статусами, видом и сортировкой, сетка результатов. Языковой
// тренажёр рос отдельно и накопил три разных способа показать список: ряд
// таблеток по центру для режимов, ряд чипсов под ними для фильтров чтения и
// самодельная колонка полок в наборах фраз. Одно и то же действие — «сузить
// выборку» — выглядело по-разному на трёх соседних вкладках.
//
// Здесь тот же скелет, вынесенный в переиспользуемый вид. Меняется только
// НАПОЛНЕНИЕ рейла: режим сам решает, какие карточки в него положить.
//
// КТО НА НЁМ. Языковой тренажёр целиком и ДЕСКТОПНАЯ ветка банка заданий.
// Своя раскладка у банка осталась только там, где скелет ничего не обещает:
// шапка страницы и док-таблетки с анимацией — это его собственное, и выкидывать
// их ради единообразия значило бы менять работающее на одинаковое.
//
// Мобильная ветка банка (useIsDesktop < 1024) живёт отдельно и по своим
// правилам: нижняя навигация, плавающие круглые кнопки, шторки. Это другая
// раскладка, а не узкий вариант этой, и тянуть её сюда не нужно.
//
// ШИРИНА РЕЙЛА. 300 px, как в банке. Сжимать его нельзя: карточка фильтров на
// 180 px нечитаема. Поэтому на узком экране (< 1024) рейл целиком уходит в
// нижнюю шторку — тем же приёмом, что фильтры банка на телефоне, и открывается
// одной кнопкой над строкой управления. Ставить его НАД содержимым (как было
// сначала) не годится: три карточки подряд занимают весь первый экран, и до
// результатов нужно пролистать фильтры, которыми в этот момент не пользуются.
//
// ВЫСОТА РЕЙЛА. Рейл не длиннее экрана: карточка упирается в нижний край окна и
// дальше листается ВНУТРИ себя. Раньше он был просто sticky по всей своей
// натуральной высоте — режимы + фильтры + показ не влезали в 720 px, и низ
// рейла можно было достать только прокруткой всей страницы, то есть уехав от
// сетки результатов. Теперь центр и рейл листаются независимо.
//
// ГОРИЗОНТАЛЬ. Своей максимальной ширины и авто-полей у скелета НЕТ: на широком
// мониторе они уводили тренажёр в центр, тогда как банк ЕГЭ, уроки и курсы
// прижаты к левому краю отступом .dashboard-main (32 px). Отступ по бокам даёт
// родитель; свой остаётся только на узком экране, где обёртки кабинета нет.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Search, Check, SlidersHorizontal } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { useFloatingPill } from '../../lib/useFloatingPill'
import MobileSheet from '../MobileSheet'

const RAIL_W = 300

/**
 * Прилипание рейла — ровно его же отступ в потоке.
 *
 * Смещение sticky отсчитывается от СОДЕРЖИМОГО панели прокрутки, а не от её
 * рамки: верхние 100 px кабинета (место под плавающую шапку) — это padding
 * панели, и в отсчёт они не входят. Поэтому top равен собственному верхнему
 * отступу скелета: рейл прилипает там же, где стоит, и при прокрутке не
 * сдвигается ни на пиксель. Число больше (108) уронило бы карточку на те самые
 * 100 px ниже строки управления.
 */
const RAIL_TOP = 8

/** Просвет под рейлом до низа окна. */
const RAIL_BOTTOM = 24

/** Высота рейла на первом кадре, до замера: экран минус шапка кабинета. */
const RAIL_MAX_FALLBACK = `calc(100vh - ${100 + RAIL_TOP + RAIL_BOTTOM}px)`

/**
 * Ширина, ниже которой рейл уходит в шторку.
 *
 * Ровно та же, что у общего useIsDesktop (>= 1024): своя цифра завела бы в
 * приложении третью ширину, и в полосе между ними страница оказывалась бы
 * «десктопной» по одному правилу и «узкой» по другому.
 */
const BREAK = 1024

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < BREAK,
  )
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < BREAK)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return narrow
}

// ─── Каркас ──────────────────────────────────────────────────────────────────

export default function TrainerShell({ rail, toolbar, narrowLead, children }: {
  /** Карточки рейла — обычно SubjectHero + RailCard'ы. */
  rail: React.ReactNode
  /** Строка управления над содержимым. */
  toolbar?: React.ReactNode
  /**
   * Что встаёт слева от кнопки шторки на узком экране — переключатель предмета.
   *
   * Своим местом, а не внутри рейла: на телефоне рейл целиком уезжает в шторку,
   * и предмет — единственное, что оттуда обязано остаться на виду. Ученику,
   * который учит два языка, нельзя прятать смену предмета за кнопкой «Режим и
   * фильтры»: он туда не полезет, потому что менять фильтры не собирался.
   */
  narrowLead?: React.ReactNode
  children: React.ReactNode
}) {
  const t = useT()
  const narrow = useNarrow()
  const [sheet, setSheet] = useState(false)
  const railRef = useRef<HTMLElement>(null)

  // Ушли с телефона на десктоп — шторка обязана закрыться сама, иначе она
  // останется висеть поверх уже нарисованного рейла.
  useEffect(() => { if (!narrow) setSheet(false) }, [narrow])

  // Высота рейла считается по факту, а не по формуле: карточка прилипла и
  // больше не двигается, значит её верх в окне — величина постоянная, и остаток
  // до низа экрана и есть та высота, после которой начинается свой скролл.
  // Замер вместо константы — чтобы шапка кабинета могла менять высоту (или
  // вовсе отсутствовать, если скелет позовут из другого места), а рейл всё
  // равно доставал ровно до нижнего края окна.
  const [railMax, setRailMax] = useState<number | null>(null)
  useLayoutEffect(() => {
    if (narrow) { setRailMax(null); return }
    const measure = () => {
      const el = railRef.current
      if (!el) return
      setRailMax(Math.max(240, window.innerHeight - el.getBoundingClientRect().top - RAIL_BOTTOM))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [narrow])

  return (
    <div style={{
      width: '100%', padding: narrow ? '8px 16px 80px' : '8px 0 80px',
      display: 'flex', flexDirection: narrow ? 'column' : 'row',
      gap: narrow ? 16 : 22, alignItems: 'flex-start',
    }}>
      {/* На узком экране рейл уходит в шторку целиком — см. кнопку «Фильтры»
          ниже. Раньше он просто вставал НАД содержимым: три карточки подряд
          занимали весь первый экран, и до самих результатов нужно было
          пролистать фильтры, которыми в тот момент никто не пользуется. */}
      {narrow ? (
        <MobileSheet open={sheet} onClose={() => setSheet(false)} title={t('Фильтры')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{rail}</div>
        </MobileSheet>
      ) : null}

      {/* sticky отдельной обёрткой, а не на самой карточке: у карточки есть
          собственный фон и тень, и position на ней ловит их в отдельный слой,
          из-за чего тень начинает мигать при остановке скролла. */}
      <div style={{
        display: narrow ? 'none' : 'block',
        position: narrow ? 'static' : 'sticky', top: RAIL_TOP,
        flexShrink: 0, width: narrow ? '100%' : RAIL_W,
      }}>
        <aside
          ref={railRef}
          className="no-scrollbar"
          style={{
            display: 'flex', flexDirection: 'column', gap: 16,
            padding: 16, borderRadius: 24,
            background: 'rgba(var(--glass-rgb), 0.97)',
            border: '1px solid var(--color-border-glass)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            // Карточка обнимает содержимое, пока оно короче экрана, и только
            // упёршись в нижний край окна отдаёт остаток собственному скроллу.
            ...(narrow ? null : {
              maxHeight: railMax ?? RAIL_MAX_FALLBACK,
              overflowY: 'auto' as const,
              overscrollBehavior: 'contain' as const,
            }),
          }}
        >
          {rail}
        </aside>
      </div>

      <main style={{ flex: 1, minWidth: 0, width: narrow ? '100%' : undefined, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Кнопка открытия шторки идёт ПЕРЕД строкой управления, а не внутри
            неё: строку собирает вызывающий, и вставлять туда чужой элемент
            значило бы, что каждый режим обязан помнить про телефон. */}
        {narrow && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {narrowLead}
            <button
              onClick={() => setSheet(true)}
              style={{
                flex: 1, minWidth: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '11px 16px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 13.5, fontWeight: 700, color: 'var(--color-text)',
                background: 'rgba(var(--glass-rgb), 0.96)', border: '1px solid var(--color-border-medium)',
              }}
            >
              <SlidersHorizontal size={15} /> {t('Режим и фильтры')}
            </button>
          </div>
        )}
        {toolbar}
        {children}
      </main>
    </div>
  )
}

// ─── Карточки рейла ──────────────────────────────────────────────────────────

/**
 * Градиентная шапка рейла — заголовок и строчка контекста.
 *
 * ПРЕДМЕТ ЗДЕСЬ БОЛЬШЕ НЕ ЖИВЁТ: шапку предмета рисует SubjectHero
 * (trainer/SubjectSwitch.tsx) — она кликабельна и открывает список предметов.
 * Здесь остались названия материалов: открытый текст, запись аудирования.
 */
export function RailHero({ title, subtitle, palette, plain }: {
  title: string
  subtitle?: string
  palette: { accent: string; text: string; ring: string }
  /**
   * Заголовок — название материала, а не предмета.
   *
   * Капслок с разрядкой хорош для короткого «КОРЕЙСКИЙ», но название текста
   * («헬스장 안내 (объявление в спортзале)») в нём превращается в три строки
   * заглавных букв вперемешку с хангылем и не читается вовсе.
   */
  plain?: boolean
}) {
  return (
    <div style={{
      padding: 16, borderRadius: 16, color: '#fff',
      background: `linear-gradient(135deg, ${palette.accent}cc, ${palette.text}cc)`,
      boxShadow: `0 18px 44px ${palette.ring}`,
    }}>
      <div style={plain
        ? { fontSize: 15, fontWeight: 750, lineHeight: 1.3, marginBottom: 8 }
        : { fontSize: 11.5, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 10, opacity: 0.95 }}>
        {title}
      </div>
      {subtitle && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: 'rgba(255,255,255,0.88)' }}>{subtitle}</p>
      )}
    </div>
  )
}

/** Обычная карточка рейла: заголовок с иконкой и содержимое столбиком. */
export function RailCard({ icon, title, accent, children, action }: {
  icon?: React.ReactNode
  title: string
  accent: string
  children: React.ReactNode
  /** Ссылка-действие в правом углу заголовка — «сбросить», «все». */
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 16,
      background: 'rgba(var(--glass-rgb), 0.94)',
      border: '1px solid var(--color-border-soft)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {icon && <span style={{ display: 'flex', color: accent }}>{icon}</span>}
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{title}</span>
        {action && (
          <button
            onClick={action.onClick}
            style={{
              marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 11.5, fontWeight: 650, color: accent, padding: 0,
            }}
          >
            {action.label}
          </button>
        )}
      </div>
      {/* Содержимое — своей колонкой с шагом 8, а не общим шагом карточки.
          В банке ровно так: 12 отделяют заголовок от блока управления, а сами
          поля стоят через 8. Одним общим шагом 12 фильтры расползались, и ряд
          дропдаунов читался как список отдельных карточек, а не как один блок. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  )
}

/** Список режимов — вертикальный, со счётчиком справа. */
export function RailModes<T extends string>({ items, value, onChange, accent, soft }: {
  items: { id: T; label: string; count?: number; Icon?: React.ComponentType<{ size?: number }> }[]
  value: T
  onChange: (v: T) => void
  accent: string
  soft: string
}) {
  const t = useT()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {items.map(m => {
        const on = m.id === value
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, width: '100%',
              padding: '9px 11px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
              border: 'none', textAlign: 'left',
              background: on ? soft : 'transparent',
              color: on ? accent : 'var(--color-text-2)',
              fontSize: 13.5, fontWeight: on ? 700 : 550,
            }}
          >
            {m.Icon && <m.Icon size={15} />}
            <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t(m.label)}
            </span>
            {m.count !== undefined && (
              <span style={{ fontSize: 11, fontWeight: 700, color: on ? accent : 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>
                {m.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Сегмент — выбор одного из немногих. Значение '' допустимо и означает «все».
 *
 * Отдельно от RailModes: тот всегда что-то выбран и живёт как навигация, а
 * сегмент — это фильтр, который можно снять повторным нажатием.
 */
export function RailSegment({ options, value, onChange, accent, soft, clearable = true }: {
  options: { value: string; label: string; badge?: number; icon?: ReactNode }[]
  value: string
  onChange: (v: string) => void
  accent: string
  soft: string
  clearable?: boolean
}) {
  const t = useT()
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map(o => {
        const on = value === o.value
        return (
          <button
            key={o.value}
            onClick={() => onChange(on && clearable ? '' : o.value)}
            title={t(o.label)}
            aria-label={t(o.label)}
            style={{
              // Один в один кнопки «Часть 1 / Часть 2» из рейла банка: рамки у
              // них нет вовсе — состояние читается заливкой и цветом текста.
              // Своя рамка делала ряд тяжелее соседних полей-дропдаунов, у
              // которых кольцо появляется только по фокусу.
              // Боковой отступ меньше банковских 12 px: там в ряду две кнопки с
              // коротким «Часть 1», здесь — три с «до 3 мин», и на 12 px подпись
              // обрезалась в «до 3 …». Высота (9 px сверху и снизу) та же.
              // Иконочный вариант не растягивается: подпись ему не нужна, а
              // равная доля ряда только резала бы соседний текст многоточием.
              flex: o.icon ? '0 0 auto' : 1, minWidth: 0,
              padding: o.icon ? '9px 11px' : '9px 6px', borderRadius: 13, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              border: 'none',
              background: on ? soft : 'var(--color-bg-input)',
              color: on ? accent : 'var(--color-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            {o.icon
              ? <span style={{ display: 'flex', alignItems: 'center' }}>{o.icon}</span>
              : <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t(o.label)}</span>}
            {o.badge !== undefined && o.badge > 0 && (
              <span style={{
                padding: '1px 6px', borderRadius: 999, fontSize: 10.5, fontWeight: 800,
                background: on ? 'var(--color-bg-2)' : soft, color: accent, fontVariantNumeric: 'tabular-nums',
              }}>
                {o.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Список-выбор внутри карточки рейла: полки разговорника, словарик текста. */
export function RailList({ items, value, onChange, accent, soft }: {
  /** `sub` — вторая строка под названием: транскрипция слова, счётчик полки. */
  items: { id: string; label: string; sub?: string; hint?: string }[]
  value: string
  onChange: (v: string) => void
  accent: string
  soft: string
}) {
  // На широком экране скроллится сам рейл, и вложенная 300-пиксельная коробка
  // была бы вторым скроллом внутри первого: колесо над списком дёргало бы то
  // его, то карточку. На узком рейл лежит НАД содержимым во всю ширину и своего
  // скролла не имеет — там ограничение по высоте остаётся.
  const narrow = useNarrow()
  return (
    <div
      className="no-scrollbar"
      style={{
        display: 'flex', flexDirection: 'column', gap: 2,
        ...(narrow ? { maxHeight: 300, overflowY: 'auto' as const } : null),
      }}
    >
      {items.map(i => {
        const on = i.id === value
        return (
          <button
            key={i.id}
            onClick={() => onChange(i.id)}
            title={i.label}
            style={{
              display: 'flex', alignItems: 'baseline', gap: 8, width: '100%', textAlign: 'left',
              padding: '7px 9px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
              border: 'none', background: on ? soft : 'transparent',
              color: on ? accent : 'var(--color-text-2)',
              fontSize: 12.5, fontWeight: on ? 700 : 550,
            }}
          >
            <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 1 }}>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {i.label}
              </span>
              {/* Транскрипция — под словом и тише его: она нужна, чтобы слово
                  можно было проговорить, но читают всё-таки оригинал. */}
              {i.sub && (
                <span style={{
                  fontSize: 11, fontWeight: 500, letterSpacing: 0.1,
                  color: on ? accent : 'var(--color-text-3)', opacity: on ? 0.8 : 1,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {i.sub}
                </span>
              )}
            </span>
            {i.hint && (
              <span style={{ fontSize: 11, color: on ? accent : 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {i.hint}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Тумблер настройки показа. */
export function RailToggle({ label, on, onChange, accent }: {
  label: string; on: boolean; onChange: (v: boolean) => void; accent: string
}) {
  const t = useT()
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        width: '100%', padding: '5px 0', border: 'none', background: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 12.5, fontWeight: 550, color: 'var(--color-text-2)', textAlign: 'left',
      }}
      role="switch"
      aria-checked={on}
    >
      <span>{t(label)}</span>
      <span style={{
        position: 'relative', flexShrink: 0, width: 32, height: 18, borderRadius: 999,
        background: on ? accent : 'var(--color-border-medium)', transition: 'background .16s',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: on ? 16 : 2, width: 14, height: 14, borderRadius: '50%',
          background: '#fff', transition: 'left .16s',
        }} />
      </span>
    </button>
  )
}

/** Строка «подпись — значение» в рейле: счётчики сессии. */
export function RailStat({ label, value, tone }: {
  label: string; value: React.ReactNode; tone?: 'good' | 'warn'
}) {
  const t = useT()
  const color = tone === 'good' ? 'var(--color-green-text)' : tone === 'warn' ? '#E0A22A' : 'var(--color-text)'
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, fontSize: 12.5 }}>
      <span style={{ color: 'var(--color-text-2)' }}>{t(label)}</span>
      <span style={{ fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

// ─── Строка управления ───────────────────────────────────────────────────────

export function Toolbar({ children }: { children: React.ReactNode }) {
  // Шаг 10 — как в собственной строке банка: она пока своя (у неё поиск с
  // подсказкой и «Избранное» со счётчиком), и на 9 против 10 два соседних
  // экрана расходились ровно на пиксель в каждом промежутке.
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {children}
    </div>
  )
}

/** Поиск-таблетка: свёрнут до иконки, раскрывается по клику. Как в банке. */
export function SearchPill({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const wide = open || !!value
  return (
    <div
      onClick={() => { setOpen(true); ref.current?.focus() }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 999,
        background: 'rgba(var(--glass-rgb), 0.96)',
        border: `1px solid ${wide ? 'var(--color-accent, #7c3aed)' : 'var(--color-border-medium)'}`,
        width: wide ? 260 : 112, transition: 'width .22s cubic-bezier(.4,0,.2,1), border-color .15s',
        overflow: 'hidden', cursor: wide ? 'text' : 'pointer', flexShrink: 0,
      }}
    >
      <Search size={14} style={{ color: wide ? 'var(--color-text)' : 'var(--color-text-3)', flexShrink: 0 }} />
      <input
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => { if (!value) setOpen(false) }}
        placeholder={wide ? (placeholder ?? t('Поиск')) : t('Поиск')}
        style={{
          flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
          fontSize: 13, color: 'var(--color-text)', fontFamily: 'inherit',
          width: wide ? 'auto' : 0, pointerEvents: wide ? 'auto' : 'none',
        }}
      />
      {value && (
        <button
          onClick={e => { e.stopPropagation(); onChange('') }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: 15, lineHeight: 1, flexShrink: 0 }}
        >×</button>
      )}
    </div>
  )
}

/** Статусы выборки: Все / … . Общий словарь на все режимы. */
/**
 * Сегменты выборки — статус, вид, способ прогона.
 *
 * Одна реализация на скелет и на банк заданий. Раньше их было две: у банка с
 * плавающей таблеткой-подложкой, у скелета простая заливка активного сегмента.
 * Разошлись бы дальше при первой же правке, поэтому здесь оставлена лучшая —
 * банковская: подложка переезжает между сегментами анимацией, а не мигает.
 *
 * ПОЧЕМУ ШИРИНА НЕ ПРЫГАЕТ. Активный сегмент жирнее неактивного, и на смене
 * выбора строка бы дёргалась. Под текстом лежит его же невидимая копия, всегда
 * жирная: она и держит ширину, а видимая надпись просто перекрашивается.
 *
 * МОБИЛЬНОГО ВАРИАНТА ЗДЕСЬ НЕТ намеренно. На телефоне банк рисует те же
 * статусы тремя равными серыми сегментами под соседние поля фильтров — это
 * другой дизайн для другой раскладки, а не вариация этого. Он остался в
 * TaskBankPage, рядом со своей вёрсткой.
 */
export function StatusTabs({ options, value, onChange, accent }: {
  options: { value: string; label: string; Icon?: React.ComponentType<{ size?: number }> }[]
  value: string
  onChange: (v: string) => void
  /**
   * Задан — активный сегмент целиком красится предметом: и подпись, и заливка
   * таблетки. Без него таблетка берёт общий фиолетовый `--tab-pill-active`,
   * который посреди зелёного или оранжевого предмета читается как чужой.
   */
  accent?: string
}) {
  const t = useT()
  const pill = useFloatingPill(value)
  return (
    <div
      ref={pill.containerRef}
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center',
        padding: 3, borderRadius: 999,
        background: 'rgba(var(--glass-rgb), 0.88)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {pill.pillRect && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: pill.pillRect.left, top: pill.pillRect.top,
            width: pill.pillRect.width, height: pill.pillRect.height,
            borderRadius: 999,
            background: accent
              ? `linear-gradient(${accent}26, ${accent}26), rgba(var(--glass-rgb), 0.82)`
              : 'linear-gradient(var(--tab-pill-active), var(--tab-pill-active)), rgba(var(--glass-rgb), 0.82)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            boxShadow: 'var(--shadow-tab-pill)',
            border: `1px solid ${accent ? `${accent}59` : 'var(--color-border-glass)'}`,
            pointerEvents: 'none', zIndex: 0,
          }}
        />
      )}
      {options.map(o => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            ref={pill.registerItem(o.value)}
            onClick={() => onChange(o.value)}
            title={t(o.label)}
            style={{
              position: 'relative', zIndex: 1,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 999, border: 'none',
              background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
              color: on ? (accent ?? 'var(--color-text)') : 'var(--color-text-3)',
              fontSize: 12, fontWeight: on ? 700 : 500,
              whiteSpace: 'nowrap', transition: 'color 0.16s ease',
            }}
          >
            {o.Icon && <o.Icon size={14} />}
            <span style={{ display: 'grid', justifyItems: 'center' }}>
              <span aria-hidden style={{ gridArea: '1 / 1', height: 0, overflow: 'hidden', visibility: 'hidden', fontWeight: 700 }}>
                {t(o.label)}
              </span>
              <span style={{ gridArea: '1 / 1' }}>{t(o.label)}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Кнопка-таблетка строки: вид, избранное, назад. */
export function ToolButton({ children, on, onClick, accent }: {
  children: React.ReactNode; on?: boolean; onClick: () => void; accent?: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        // Как «Избранное» в банке: 10×14, кегль 12 — тогда таблетка встаёт вровень
        // с поиском и группой статусов, а не оказывается на два пикселя ниже.
        display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 999,
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: on ? 700 : 500,
        border: `1px solid ${on ? (accent ?? 'var(--color-accent, #7c3aed)') : 'var(--color-border-medium)'}`,
        background: 'rgba(var(--glass-rgb), 0.88)',
        color: on ? (accent ?? 'var(--color-accent, #7c3aed)') : 'var(--color-text-2)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

/** Сортировка — выпадающий список, портал поверх всего. */
export function SortMenu({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const current = options.find(o => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => {
      if (menu.current?.contains(e.target as Node)) return
      if (btn.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const scroll = () => setOpen(false)
    window.addEventListener('mousedown', down)
    window.addEventListener('keydown', key)
    window.addEventListener('scroll', scroll, true)
    return () => {
      window.removeEventListener('mousedown', down)
      window.removeEventListener('keydown', key)
      window.removeEventListener('scroll', scroll, true)
    }
  }, [open])

  return (
    <>
      <button
        ref={btn}
        onClick={() => {
          const r = btn.current?.getBoundingClientRect()
          if (r) setPos({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 172) })
          setOpen(o => !o)
        }}
        style={{
          // Та же таблетка, что ToolButton и «Сортировка» банка: 10×14, кегль 12.
          display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 999,
          cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
          border: '1px solid var(--color-border-medium)', background: 'rgba(var(--glass-rgb), 0.88)',
          color: 'var(--color-text-2)', whiteSpace: 'nowrap',
        }}
      >
        {t(current?.label ?? '')}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }} style={{ display: 'flex' }}>
          <ChevronDown size={13} />
        </motion.span>
      </button>
      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={menu}
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999,
                padding: 6, borderRadius: 14,
                background: 'var(--color-bg-2)', border: '1px solid var(--color-border)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
              }}
            >
              {options.map(o => {
                const on = o.value === value
                return (
                  <button
                    key={o.value}
                    onClick={() => { onChange(o.value); setOpen(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                      padding: '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 13, fontWeight: on ? 700 : 550,
                      background: 'transparent', color: on ? 'var(--color-text)' : 'var(--color-text-2)',
                    }}
                  >
                    <span style={{ flex: 1 }}>{t(o.label)}</span>
                    {on && <Check size={14} />}
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

/** Счётчик, прижатый вправо. */
export function ToolCount({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>
      {children}
    </span>
  )
}

// ─── Единица содержимого ─────────────────────────────────────────────────────

/**
 * Карточка сетки — общая геометрия для текста, стопки, записи и задания.
 *
 * `stack` дорисовывает две подложки сзади: так плашка читается как пачка
 * карточек, а не как ещё одна кнопка перехода.
 */
export function Tile({ children, onClick, accent, stack }: {
  children: React.ReactNode
  onClick?: () => void
  accent: string
  stack?: boolean
}) {
  const [hover, setHover] = useState(false)
  return (
    <div style={{ position: 'relative', paddingTop: stack ? 8 : 0, paddingRight: stack ? 8 : 0 }}>
      {stack && [2, 1].map(k => (
        <div
          key={k}
          aria-hidden
          style={{
            position: 'absolute', inset: 0, left: k * 4, top: 8 - k * 4, right: 8 - k * 4, bottom: k * 4,
            borderRadius: 16, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
            opacity: k === 1 ? 0.85 : 0.5, pointerEvents: 'none',
            transform: hover ? `translate(${k * 2}px, ${-k * 2}px)` : 'none', transition: 'transform .16s',
          }}
        />
      ))}
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'relative', width: '100%', height: '100%', textAlign: 'left',
          display: 'flex', flexDirection: 'column', gap: 7,
          padding: '13px 15px', borderRadius: 16, cursor: onClick ? 'pointer' : 'default',
          fontFamily: 'inherit', background: 'var(--color-bg-2)',
          border: `1px solid ${hover && onClick ? accent : 'var(--color-border)'}`,
          transition: 'border-color .16s',
        }}
      >
        {children}
      </button>
    </div>
  )
}

/** Сетка карточек. */
export function TileGrid({ min = 210, children }: { min?: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, gap: 14 }}>
      {children}
    </div>
  )
}

/** Полоска прогресса внутри карточки. */
export function TileMeter({ value }: { value: number }) {
  return (
    <span style={{ display: 'block', height: 3, borderRadius: 999, background: 'var(--color-bg-3)', overflow: 'hidden' }}>
      <span style={{
        display: 'block', height: '100%', width: `${Math.max(0, Math.min(100, value))}%`,
        borderRadius: 999, background: 'var(--color-green-accent)',
      }} />
    </span>
  )
}

/** Плашка-подпись в углу карточки: уровень, тип, длительность. */
export function TileChip({ children, tone, accent, soft }: {
  children: React.ReactNode
  tone?: 'accent' | 'mute'
  accent?: string
  soft?: string
}) {
  const isAccent = tone === 'accent'
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap',
      background: isAccent ? (soft ?? 'var(--color-bg-3)') : 'var(--color-bg-3)',
      color: isAccent ? (accent ?? 'var(--color-text-2)') : 'var(--color-muted)',
    }}>
      {children}
    </span>
  )
}

/** Пустая выборка. */
export function Empty({ text }: { text: string }) {
  const t = useT()
  return (
    <div style={{
      padding: '34px 22px', borderRadius: 18, textAlign: 'center',
      border: '1px dashed var(--color-border-medium)', background: 'var(--color-bg-2)',
      fontSize: 14, lineHeight: 1.6, color: 'var(--color-muted)',
    }}>
      {t(text)}
    </div>
  )
}
