// ─────────────────────────────────────────────────────────────────────────────
// Нижняя полоса режима «одно задание — один экран»
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ КОМПОНЕНТ. Обычная домашка — это длинный список, и кнопка
// «Проверить» живёт внутри карточки задания: пока читаешь разбор, она рядом с
// тем, что разбираешь. В языковой домашке заданий на экране ровно одно, и
// кнопка должна быть одна на весь экран, всегда в одном месте.
//
// ГЛАВНОЕ ПРАВИЛО: КНОПКА НЕ ПЕРЕЕЗЖАЕТ. «Проверить» превращается в «Далее» на
// том же пикселе — палец остаётся там, где был. Как только кнопка начинает
// прыгать (появился вердикт → карточка выросла → кнопка уехала), темп сессии
// ломается: каждый раз надо заново прицелиться. Поэтому полоса зафиксирована
// снизу, а вердикт растёт вверх от неё, а не толкает её вниз.
//
// ЦВЕТ ЗДЕСЬ — ФИРМЕННЫЙ, А НЕ ЦВЕТ ПРЕДМЕТА. Кнопка и шкала красились
// palette.accent, и на уроке без узнанного предмета это давало лиловый запасной
// цвет химии (#9B6FE8): на одном экране оказывалось два разных фиолетовых — наш
// в карточках и чужой в кнопке. Главное действие экрана во всём кабинете одно и
// то же (--grad-purple, см. TestFlow), цветом предмета красится его обстановка,
// а не CTA.
//
// ПОЧЕМУ ЕСТЬ «ПРОПУСТИТЬ». Задание может требовать микрофона в метро или звука
// на лекции. Тупик в такой ситуации — это брошенная домашка; пропуск честнее:
// задание остаётся неотвеченным и попадёт в список пропущенных при сдаче.
// ─────────────────────────────────────────────────────────────────────────────

import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, X } from 'lucide-react'
import { useT } from '../lib/i18n'
import { useKeyboardInset } from '../lib/useKeyboardInset'
import { bindShortWords, proseWrap } from '../lib/typography'

export type FlowVerdict = 'none' | 'correct' | 'wrong' | 'review'

export default function HomeworkFlowBar({
  step,
  total,
  label,
  disabled,
  verdict,
  answer,
  isMobile,
  navCollapsed,
  onPrimary,
  onSkip,
}: {
  /** Сколько шагов пройдено — на прогресс-линию. Знакомство идёт нулевым. */
  step: number
  total: number
  /** Надпись на кнопке: «Понятно» / «Проверить» / «Далее» / «Закончить». */
  label: string
  disabled?: boolean
  verdict: FlowVerdict
  /** Верный ответ — показывается только когда ошиблись. */
  answer?: string
  isMobile: boolean
  navCollapsed: boolean
  onPrimary: () => void
  /** Пропуск задания. Не показывается, когда пропускать уже нечего. */
  onSkip?: () => void
}) {
  const t = useT()
  const keyboard = useKeyboardInset()

  const tone = verdict === 'correct'
    ? { bg: 'var(--color-green-soft)', fg: 'var(--color-green-text)' }
    : verdict === 'wrong'
      ? { bg: 'var(--color-red-soft)', fg: 'var(--color-red-text)' }
      : { bg: 'var(--color-bg-3)', fg: 'var(--color-text-2)' }

  // На телефоне полоса поднимается над нижней навигацией, на мониторе просто
  // прижата к низу. Клавиатура сдвигает всё вверх на свою высоту: под ней
  // кнопка «Проверить» недостижима, а именно её и нажимают чаще всего.
  const lift = keyboard > 0 ? keyboard : isMobile ? (navCollapsed ? 76 : 88) : 0

  return (
    <motion.div
      initial={false}
      animate={{ bottom: lift }}
      transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        zIndex: 100,
        marginBottom: keyboard > 0 ? 0 : 'env(safe-area-inset-bottom, 0px)',
        // Ничего сплошного: над заданием висят сами элементы, а не панель.
        // Плашка во всю ширину отрезала бы низ экрана даже там, где под ней
        // пусто, — а пусто под ней почти всегда. Фон ловил бы и клики, поэтому
        // контейнер прозрачен для мыши, а «живут» только сами кнопки.
        pointerEvents: 'none',
      }}
    >
      <div
        className="flex flex-col"
        style={{ gap: 12, padding: '14px 20px 16px', maxWidth: 720, margin: '0 auto' }}
      >
        {/* Прогресс — тонкая полоска над кнопкой, а не край панели: она и так на
            экране всегда, отдельная шкала наверху отняла бы у задания вертикаль. */}
        <div style={{ height: 4, borderRadius: 999, background: 'var(--color-bg-3)', overflow: 'hidden' }}>
          <motion.div
            initial={false}
            animate={{ width: `${total > 0 ? Math.min(100, (step / total) * 100) : 0}%` }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            style={{ height: '100%', background: 'var(--grad-purple-bar)', borderRadius: 999 }}
          />
        </div>

        {/* «Верно» полоса не повторяет: этот вердикт напечатан на карточке, у
            самого ответа. Здесь остаётся то, чего на карточке нет, — разбор
            неверного ответа и статус отправки на проверку.
            На телефоне вердикта у кнопок нет вообще: и «Неверно», и эталонный
            ответ уже стоят на самой карточке, у поля ответа. Лишняя плашка над
            «Пропустить/Далее» отъедала строку и подсказывала ответ там, куда
            смотрит палец, а не глаз. Остаётся только статус отправки. */}
        {(verdict === 'review' || (verdict === 'wrong' && !isMobile)) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-start"
            style={{
              gap: 10, padding: '11px 14px', borderRadius: 16,
              background: tone.bg, color: tone.fg,
              // Своя тень у каждого плавающего элемента — иначе вердикт сливается
              // с заданием, поверх которого он теперь лежит.
              boxShadow: '0 8px 22px rgba(0,0,0,0.10)',
              pointerEvents: 'auto',
            }}
          >
            <span style={{ flexShrink: 0, marginTop: 1 }}>
              {verdict === 'wrong' ? <X size={17} /> : <CheckCircle2 size={17} />}
            </span>
            <span style={{ fontSize: 14, fontWeight: 750, lineHeight: 1.4, ...proseWrap }}>
              {verdict === 'review' && t('Ответ сохранён — проверит преподаватель')}
              {verdict === 'wrong' && (
                answer
                  ? <>{t('Правильный ответ')}: <b style={{ fontWeight: 800 }}>{bindShortWords(answer)}</b></>
                  : t('Не совсем')
              )}
            </span>
          </motion.div>
        )}

        {/* items-stretch: «Пропустить» тянется по высоте главной кнопки. Своя
            вертикальная набивка делала её ниже, и пара кнопок стояла ступенькой. */}
        <div className="flex items-stretch" style={{ gap: 12 }}>
          {onSkip && (
            <button
              onClick={onSkip}
              className="cursor-pointer flex items-center justify-center"
              style={{
                // Граница — не декор: без панели кнопка ложится то на серый фон
                // страницы, то на белую карточку задания, и на белом одна тень
                // её не очерчивает.
                padding: '0 18px', borderRadius: 18, border: '1px solid var(--color-border-soft)',
                // Прозрачной кнопке нужен был фон панели; без панели она читалась
                // бы поверх текста задания, поэтому у неё своё стекло.
                background: 'rgba(var(--glass-rgb), 0.86)',
                backdropFilter: 'blur(14px)',
                boxShadow: '0 6px 18px rgba(0,0,0,0.10)',
                color: 'var(--color-muted)', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                flexShrink: 0, pointerEvents: 'auto',
              }}
            >
              {t('Пропустить')}
            </button>
          )}
          <motion.button
            whileTap={disabled ? undefined : { scale: 0.98 }}
            onClick={disabled ? undefined : onPrimary}
            disabled={disabled}
            className="flex items-center justify-center"
            style={{
              flex: 1, gap: 8, padding: '15px 22px', borderRadius: 18,
              border: disabled ? '1px solid var(--color-border-soft)' : 'none',
              background: disabled ? 'rgba(var(--glass-rgb), 0.86)' : 'var(--grad-purple)',
              backdropFilter: disabled ? 'blur(14px)' : undefined,
              color: disabled ? 'var(--color-muted)' : '#fff',
              fontFamily: 'inherit', fontSize: 15, fontWeight: 780,
              cursor: disabled ? 'default' : 'pointer',
              boxShadow: disabled ? '0 6px 18px rgba(0,0,0,0.08)' : '0 10px 24px rgba(99,84,207,0.35)',
              pointerEvents: 'auto',
              transition: 'background 0.18s ease, color 0.18s ease',
            }}
          >
            {label}
            {!disabled && <ArrowRight size={16} />}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
