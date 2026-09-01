// ─────────────────────────────────────────────────────────────────────────────
// Переключатель предмета в тренажёре
//
// ЧТО ЭТО. Шапка рейла («КОРЕЙСКИЙ · 3 текстов») перестала быть подписью и
// стала кнопкой: клик открывает список предметов ученика. Раньше переключатель
// был только у банка ЕГЭ и был захардкожен на пару «Биология | Химия» в трёх
// местах сразу; языковой тренажёр не переключался вовсе — предмет ему диктовал
// трек главной (см. lib/trainerSubject.ts).
//
// ОДНО МЕНЮ НА ОБА ТРЕНАЖЁРА. В списке и языки, и предметы с банком: для
// ученика это одна кнопка, хотя под ней меняется движок. Тип не прячем —
// подпись пункта говорит, что откроется («Язык · 3 текста», «Банк ЕГЭ · 1240
// заданий»).
//
// ОДИН ПРЕДМЕТ — ПРЕЖНЯЯ КАРТОЧКА. Ни шеврона, ни курсора, ни ховера: выбирать
// не из чего, и намёк на выбор был бы обманом.
//
// НИКАКОЙ ПЕРЕЗАГРУЗКИ. Есть похожий на вид SubjectSwitcher (components/), но
// он меняет СЕССИЮ ученика (другая группа, другой курс) и потому делает
// window.location.reload(). Здесь переключение мгновенное: выбор языка заодно
// открывает курс этого языка в кабинете (lib/trainerSubject.ts), но это запись
// в стор, а не перезагрузка.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { MOBILE_PILL_H } from '../../lib/mobileTokens'
import { useT } from '../../lib/i18n'
import { useTheme } from '../../store/themeStore'
import { useScrollLock } from '../../lib/useScrollLock'
import { useTrainerSubject, type TrainerSubjectOption, type TrainerSubjectState } from '../../lib/trainerSubject'

type Palette = { accent: string; text: string; ring: string; soft?: string }

/** Подпись пункта: что это за предмет и сколько там материала. */
function useMeta() {
  const t = useT()
  return (o: TrainerSubjectOption) => {
    if (o.kind === 'lang') {
      const parts = [t('Язык')]
      if (o.count) parts.push(`${o.count} ${t('текстов')}`)
      if (o.hasBook) parts.push(t('разговорник'))
      return parts.join(' · ')
    }
    return o.count ? `${t('Банк ЕГЭ')} · ${o.count} ${t('заданий')}` : t('Банк ЕГЭ')
  }
}

/** Список предметов — общее тело выпадающего меню и мобильной шторки. */
export function SubjectList({ state, onPicked, accent }: {
  state: TrainerSubjectState
  onPicked?: () => void
  accent: string
}) {
  const t = useT()
  const meta = useMeta()
  const { dark } = useTheme()
  const { options, current, pick, due } = state

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ padding: '6px 10px 4px', fontSize: 11, fontWeight: 650, color: 'var(--color-text-3)' }}>
        {t('Мои предметы')}
      </div>

      {options.map((o, i) => {
        const active = o.def.id === current?.def.id
        // Черта на стыке типов: язык и банк ЕГЭ — это два разных тренажёра, и
        // из списка должно быть видно, что ниже начинается другой.
        const divider = i > 0 && options[i - 1].kind !== o.kind
        const n = due[o.def.id] ?? 0
        // Палитра предмета — своя у каждой строки: список цветной, и брать
        // светлые значения в тёмной теме нельзя (см. lib/subjects.ts).
        const pal = dark ? o.def.dark : o.def.light
        return (
          <div key={o.def.id}>
            {divider && <div style={{ height: 1, background: 'var(--color-border-soft)', margin: '6px 10px' }} />}
            <button
              type="button"
              onClick={() => { pick(o.def.id); onPicked?.() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '9px 10px', borderRadius: 10, cursor: 'pointer', border: 'none',
                background: active ? `${pal.accent}1f` : 'transparent',
                fontFamily: 'inherit', textAlign: 'left',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--color-bg-3)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{o.def.icon}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  display: 'block', fontSize: 13, fontWeight: active ? 700 : 600,
                  color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {t(o.def.name)}
                </span>
                {/* Подпись в одну строку: рядом стоит бейдж долга, и на узком
                    рейле «Банк ЕГЭ · 5 заданий» иначе ломается пополам. */}
                <span style={{
                  display: 'block', fontSize: 11, color: 'var(--color-text-3)', marginTop: 1,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {meta(o)}
                </span>
              </span>
              {n > 0 && !active && (
                <span style={{
                  flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  background: `${pal.accent}26`, color: pal.text,
                }}>
                  {n} {t('на повтор')}
                </span>
              )}
              {active && <Check size={15} style={{ flexShrink: 0, color: accent }} />}
            </button>
          </div>
        )
      })}

      <div style={{
        padding: '8px 10px 4px', marginTop: 4, fontSize: 11, lineHeight: 1.4,
        color: 'var(--color-text-3)', borderTop: '1px solid var(--color-border-soft)',
      }}>
        {t('Кабинет открывает курс этого предмета')}
      </div>
    </div>
  )
}

/**
 * Градиентная шапка рейла с переключателем.
 *
 * Заголовок берётся из реестра, а не от вызывающего: это и есть выбранный
 * предмет. Строка контекста своя у каждого тренажёра — «3 текстов» у чтения,
 * «1240 заданий · 84 решено» у банка.
 */
export function SubjectHero({ state, subtitle, palette }: {
  state: TrainerSubjectState
  subtitle?: string
  palette: Palette
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { options, current, loadDue } = state
  const many = options.length > 1

  // Пока список открыт, фон стоит: иначе колесо над меню крутило страницу и
  // меню уезжало вместе с шапкой рейла.
  useScrollLock(open, menuRef)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const toggle = () => {
    if (!many) return
    if (!open) loadDue()
    setOpen(o => !o)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={toggle}
        role={many ? 'button' : undefined}
        tabIndex={many ? 0 : undefined}
        onKeyDown={many ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } } : undefined}
        style={{
          padding: 16, borderRadius: 16, color: '#fff',
          background: `linear-gradient(135deg, ${palette.accent}cc, ${palette.text}cc)`,
          boxShadow: `0 18px 44px ${palette.ring}`,
          cursor: many ? 'pointer' : 'default', userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {current && <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{current.def.icon}</span>}
          <span style={{
            fontSize: 11.5, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase',
            opacity: 0.95, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {current ? t(current.def.name) : t('Тренажёр')}
          </span>
          {many && (
            <span style={{
              marginLeft: 'auto', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: 999, background: 'rgba(255,255,255,0.22)',
            }}>
              <ChevronDown size={15} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </span>
          )}
        </div>
        {subtitle && (
          // Высота строки контекста прибита к двум строкам: у режимов она то
          // короткая («142 текстов»), то длинная («4 материала из свободных
          // источников»), и на переключении весь рейл прыгал вверх-вниз.
          // Что не влезло — под срез, а не в третью строку.
          <p style={{
            margin: '8px 0 0', fontSize: 13, lineHeight: 1.45, color: 'rgba(255,255,255,0.88)',
            height: 'calc(13px * 1.45 * 2)', overflow: 'hidden',
            display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
          }}>{subtitle}</p>
        )}
      </div>

      {open && (
        <div ref={menuRef} className="no-scrollbar" style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50,
          background: 'var(--color-bg-input)', borderRadius: 14, padding: 6,
          border: '1px solid var(--color-border)', boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
          // Длинный список (у ученика бывает восемь предметов) крутится сам, а
          // не тянет за собой фон — тот на время выбора заморожен.
          maxHeight: 'min(60vh, 420px)', overflowY: 'auto', overscrollBehavior: 'contain',
        }}>
          <SubjectList state={state} accent={palette.accent} onPicked={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}

/**
 * Компактная пилюля — та же кнопка для верхней строки телефона.
 *
 * Список раскрывается прямо под ней (шторка снизу здесь была бы третьим типом
 * поверхности на одном экране: под ней уже живут док-кружки и их bottom-sheet).
 */
export function SubjectPill({ state, palette, onOpenList, compact }: {
  state: TrainerSubjectState
  palette: Palette
  /** Показать список своим способом — шторкой хозяина экрана. */
  onOpenList?: () => void
  /**
   * Только значок предмета, без названия, — круг размером с соседние кнопки.
   *
   * Для нижнего дока телефона: рядом с таблеткой предмета там стоят половины
   * режима, и подпись «Корейский» съедала ровно ту ширину, в которой они
   * помещались. Значок языка узнаётся и без слова — а название всё равно
   * написано первой строкой в списке, который эта кнопка открывает.
   */
  compact?: boolean
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { options, current, loadDue } = state
  const many = options.length > 1

  useScrollLock(open, menuRef)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  /**
   * Список раскрывается ВВЕРХ, если снизу места нет.
   *
   * На телефоне таблетка уехала в нижний док, и меню, всегда падавшее вниз,
   * оказывалось за краем экрана: видна была одна строка списка, а прокрутить
   * его было некуда.
   */
  const [up, setUp] = useState(false)

  const toggle = () => {
    if (!many) return
    loadDue()
    if (onOpenList) { onOpenList(); return }
    const r = ref.current?.getBoundingClientRect()
    if (r) setUp(window.innerHeight - r.bottom < 260 && r.top > window.innerHeight - r.bottom)
    setOpen(o => !o)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={toggle}
        aria-label={compact ? (current ? t(current.def.name) : t('Тренажёр')) : undefined}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          gap: compact ? 0 : 7,
          // Высота шапки общая на все экраны (MOBILE_PILL_H): таблетка предмета
          // стоит в той же строке, что и чипсы соседних экранов, и перетекает
          // в них на свайпе «назад».
          height: compact ? 46 : MOBILE_PILL_H, width: compact ? 46 : undefined,
          padding: compact ? 0 : '0 14px',
          borderRadius: 999, cursor: many ? 'pointer' : 'default', fontFamily: 'inherit',
          fontSize: 13, fontWeight: 700, color: 'var(--color-text)',
          background: 'rgba(var(--glass-rgb), var(--glass-fill))',
          backdropFilter: 'blur(28px) saturate(200%)', WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          // Тот же скин, что у соседних кругов дока (MobileDock.glassBase):
          // свой белый inset в тёмной теме рисовал резкий контур, а обводка
          // border-medium была заметно ярче остальных таблеток ряда.
          border: '1px solid var(--color-border-glass)',
          boxShadow: 'var(--shadow-pill)',
        }}
      >
        <span style={{ fontSize: compact ? 19 : 15, lineHeight: 1 }}>{current?.def.icon ?? '📚'}</span>
        {!compact && (
          <>
            <span style={{ whiteSpace: 'nowrap' }}>{current ? t(current.def.name) : t('Тренажёр')}</span>
            {many && <ChevronDown size={14} style={{ color: palette.accent, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />}
          </>
        )}
      </button>

      {open && (
        <div ref={menuRef} className="no-scrollbar" style={{
          position: 'absolute', left: 0, zIndex: 60, minWidth: 280,
          ...(up ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),
          background: 'var(--color-bg-input)', borderRadius: 14, padding: 6,
          border: '1px solid var(--color-border)', boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
          maxHeight: 'min(60vh, 420px)', overflowY: 'auto', overscrollBehavior: 'contain',
        }}>
          <SubjectList state={state} accent={palette.accent} onPicked={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}

export { useTrainerSubject }
