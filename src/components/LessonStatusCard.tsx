import { motion } from 'framer-motion'
import { CheckCircle2, Lock } from 'lucide-react'
import type { ElementType, ReactElement } from 'react'
import LiquidGlass from 'liquid-glass-react'
import { IconSentForReview, IconReturned, IconLessonRecording } from './icons'
import type { LessonStatus } from '../data/mockData'

type AnyIcon = ElementType | ((props: { color?: string; size?: number }) => ReactElement)

interface CardConfig {
  bg: string
  badgeBg: string
  badgeText: string
  badgeLabel: string
  icon: AnyIcon
  custom?: boolean
  textColor: string
}

const configs: Record<LessonStatus, CardConfig> = {
  completed: {
    bg: 'var(--color-green-soft)',
    badgeBg: 'rgba(110,231,160,0.3)',
    badgeText: 'var(--color-green-text)',
    badgeLabel: 'Выполнено',
    icon: CheckCircle2,
    textColor: 'var(--color-green-text)',
  },
  returned: {
    bg: 'var(--color-yellow-soft)',
    badgeBg: 'rgba(248,239,140,0.5)',
    badgeText: '#7A6A00',
    badgeLabel: 'Возвращено на доработку',
    icon: IconReturned,
    custom: true,
    textColor: '#4A3F00',
  },
  unviewed: {
    bg: 'var(--color-red-soft)',
    badgeBg: 'rgba(244,139,145,0.3)',
    badgeText: '#A8282D',
    badgeLabel: 'Запись урока',
    icon: IconLessonRecording,
    custom: true,
    textColor: '#6B1115',
  },
  submitted: {
    bg: 'var(--color-peach-soft)',
    badgeBg: 'rgba(248,201,145,0.4)',
    badgeText: '#8A4A00',
    badgeLabel: 'Отправлено на проверку',
    icon: IconSentForReview,
    custom: true,
    textColor: '#5A2F00',
  },
  current: {
    bg: 'var(--color-purple-soft)',
    badgeBg: 'rgba(156,140,240,0.25)',
    badgeText: 'var(--color-accent)',
    badgeLabel: 'Текущий урок',
    icon: Lock,
    textColor: '#4A1A8A',
  },
  locked: {
    bg: 'var(--color-bg-3)',
    badgeBg: 'rgba(189,189,194,0.4)',
    badgeText: 'var(--color-muted)',
    badgeLabel: 'Недоступно',
    icon: Lock,
    textColor: '#4A4A4F',
  },
}

interface Props {
  status: LessonStatus
  title?: string
  lessonNumber?: number
  points?: number
  index?: number
}

export default function LessonStatusCard({
  status,
  title = 'Строение атома',
  lessonNumber = 23,
  points,
  index = 0,
}: Props) {
  const cfg = configs[status]
  const Icon = cfg.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: index * 0.07 }}
      whileHover={{ scale: 1.01 }}
      className="w-full"
      style={{
        maxWidth: 900,
      }}
    >
      <LiquidGlass
        displacementScale={74}
        blurAmount={0.085}
        saturation={136}
        aberrationIntensity={2}
        elasticity={0.26}
        cornerRadius={40}
        padding="0"
        overLight
        style={{
          width: '100%',
          overflow: 'hidden',
          background: cfg.bg,
          boxShadow: '0 10px 28px rgba(0,0,0,0.08)',
        }}
      >
        <div
          className="grid items-end"
          style={{
            gridTemplateColumns: points != null ? 'minmax(0, 1fr) clamp(120px, 18vw, 180px)' : 'minmax(0, 1fr)',
            gap: 'clamp(18px, 3vw, 40px)',
            padding: 'clamp(26px, 3vw, 40px)',
            minHeight: 'clamp(148px, 16vw, 188px)',
          }}
        >
          <div className="flex flex-col min-w-0" style={{ gap: 18 }}>
            <div
              className="inline-flex items-center gap-1.5"
              style={{
                borderRadius: 999,
                background: cfg.badgeBg,
                width: 'fit-content',
                maxWidth: '100%',
                padding: 'clamp(8px, 1vw, 10px) clamp(16px, 2vw, 24px)',
              }}
            >
              {cfg.custom
                ? <Icon color={cfg.badgeText} size={16} />
                : <Icon size={16} style={{ color: cfg.badgeText }} strokeWidth={2.2} />
              }
              <span
                style={{
                  fontSize: 'clamp(18px, 2vw, 24px)',
                  fontWeight: 600,
                  color: cfg.badgeText,
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                }}
              >
                {cfg.badgeLabel}
              </span>
            </div>

            <h3
              style={{
                fontSize: 'clamp(24px, 3.1vw, 50px)',
                fontWeight: 500,
                color: cfg.textColor,
                lineHeight: 1.08,
                maxWidth: '100%',
                overflowWrap: 'anywhere',
              }}
            >
              Занятие #{lessonNumber} {title}
            </h3>
          </div>

          {points != null && (
            <div
              className="flex flex-col items-end justify-center flex-shrink-0"
              style={{ alignSelf: 'center' }}
            >
              <span style={{ fontSize: 'clamp(62px, 7vw, 110px)', fontWeight: 650, color: cfg.textColor, lineHeight: 0.9 }}>
                {points}
              </span>
              <span style={{ fontSize: 'clamp(24px, 2.3vw, 38px)', fontWeight: 500, color: cfg.textColor, lineHeight: 1, marginTop: 6 }}>
                баллов
              </span>
            </div>
          )}
        </div>
      </LiquidGlass>
    </motion.div>
  )
}
