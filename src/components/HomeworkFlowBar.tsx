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
// ПОЧЕМУ ЕСТЬ «ПРОПУСТИТЬ». Задание может требовать микрофона в метро или звука
// на лекции. Тупик в такой ситуации — это брошенная домашка; пропуск честнее:
// задание остаётся неотвеченным и попадёт в список пропущенных при сдаче.
// ─────────────────────────────────────────────────────────────────────────────

import { motion } from 'framer-motion'
import { ArrowRight, Check, CheckCircle2, X } from 'lucide-react'
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
  accent,
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
  accent: string
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
        background: 'rgba(var(--glass-rgb), 0.97)',
        backdropFilter: 'blur(18px)',
        borderTop: '1px solid var(--color-border-soft)',
      }}
    >
      {/* Прогресс-линия по верхнему краю полосы: она и так на экране всегда,
          отдельная шкала наверху отняла бы у задания вертикаль. */}
      <div style={{ height: 4, background: 'var(--color-bg-3)' }}>
        <motion.div
          initial={false}
          animate={{ width: `${total > 0 ? Math.min(100, (step / total) * 100) : 0}%` }}
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
          style={{ height: '100%', background: accent, borderRadius: '0 4px 4px 0' }}
        />
      </div>

      <div
        className="flex flex-col"
        style={{ gap: 12, padding: '14px 20px 16px', maxWidth: 720, margin: '0 auto' }}
      >
        {verdict !== 'none' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-start"
            style={{
              gap: 10, padding: '11px 14px', borderRadius: 16,
              background: tone.bg, color: tone.fg,
            }}
          >
            <span style={{ flexShrink: 0, marginTop: 1 }}>
              {verdict === 'correct' ? <Check size={17} /> : verdict === 'wrong' ? <X size={17} /> : <CheckCircle2 size={17} />}
            </span>
            <span style={{ fontSize: 14, fontWeight: 750, lineHeight: 1.4, ...proseWrap }}>
              {verdict === 'correct' && t('Верно')}
              {verdict === 'review' && t('Ответ сохранён — проверит преподаватель')}
              {verdict === 'wrong' && (
                answer
                  ? <>{t('Правильный ответ')}: <b style={{ fontWeight: 800 }}>{bindShortWords(answer)}</b></>
                  : t('Не совсем')
              )}
            </span>
          </motion.div>
        )}

        <div className="flex items-center" style={{ gap: 12 }}>
          {onSkip && (
            <button
              onClick={onSkip}
              className="cursor-pointer"
              style={{
                padding: '12px 14px', borderRadius: 14, border: 'none', background: 'transparent',
                color: 'var(--color-muted)', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                flexShrink: 0,
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
              flex: 1, gap: 8, padding: '15px 22px', borderRadius: 18, border: 'none',
              background: disabled ? 'var(--color-bg-3)' : accent,
              color: disabled ? 'var(--color-muted)' : '#fff',
              fontFamily: 'inherit', fontSize: 15, fontWeight: 780,
              cursor: disabled ? 'default' : 'pointer',
              boxShadow: disabled ? 'none' : '0 10px 24px rgba(0,0,0,0.16)',
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
