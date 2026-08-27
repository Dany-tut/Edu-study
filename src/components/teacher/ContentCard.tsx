// ─────────────────────────────────────────────────────────────────────────────
// Плитка витрины Конструктора
//
// ОДНА КАРТОЧКА НА ВСЕ ВКЛАДКИ. Курс, задание, тест, виджет и материал — разные
// сущности, но в списке это одно и то же движение: увидеть, узнать по иконке,
// открыть. Поэтому геометрия, стекло, двухстрочный заголовок и подвал заданы
// здесь один раз, а вкладка приносит только содержимое.
//
// ПОЧЕМУ ОТДЕЛЬНЫМ ФАЙЛОМ. Пока каркас лежал внутри TeacherConstructorPage, до
// него не дотягивались вкладки, собранные из своих компонентов
// (CardGroupsManager), — и они рисовали похожую плитку заново. Похожая плитка
// расходится: у «Материалов» так завелась рамка и другой радиус, которых нет
// больше нигде в Конструкторе.
//
// РАМОК У ПЛИТКИ НЕТ — есть стекло: полупрозрачный фон, размытие и нежная
// обводка var(--color-border-glass). Сплошная рамка вокруг карточки читается
// как поле ввода, а не как объект витрины.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Copy, Trash2 } from 'lucide-react'
import { useT } from '../../lib/i18n'
import Skeleton from '../Skeleton'


// Shared card shell used by all three tab types.
// accentColor may be hex (#3EC87A) or a CSS var — icon box and glow use accentBg to stay safe.
export interface CardActions {
  onEdit?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
}

// Hover-reveal action cluster (Редактировать / Дублировать / Удалить) shared by
// every constructor card. Each button stops propagation so it never triggers the
// card's own onClick (open editor).
function CardActionBar({ actions, visible, accentColor }: { actions: CardActions; visible: boolean; accentColor: string }) {
  const t = useT()
  const btn = (onClick: () => void, title: string, danger: boolean, children: React.ReactNode) => (
    <button
      title={title}
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid var(--color-border-soft)', background: 'var(--color-surface)', cursor: 'pointer',
        color: danger ? '#c0303a' : accentColor, padding: 0, transition: 'all 0.12s',
      }}
    >{children}</button>
  )
  return (
    <div style={{
      position: 'absolute', top: 10, right: 10, display: 'flex', gap: 5, zIndex: 6,
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(-3px)',
      pointerEvents: visible ? 'auto' : 'none', transition: 'opacity 0.14s, transform 0.14s',
    }}>
      {actions.onEdit && btn(actions.onEdit, t('Редактировать'), false, <Pencil size={13} strokeWidth={2} />)}
      {actions.onDuplicate && btn(actions.onDuplicate, t('Дублировать'), false, <Copy size={13} strokeWidth={2} />)}
      {actions.onDelete && btn(actions.onDelete, t('Удалить'), true, <Trash2 size={13} strokeWidth={2} />)}
    </div>
  )
}

export function ContentCard({ accentColor, accentBg, borderColor, isSelected, onClick, icon, iconBg, badge, title, subtitle, footerLeft, footerRight, extra, actions }: {
  accentColor: string
  accentBg: string
  borderColor?: string
  isSelected: boolean
  onClick: () => void
  icon: React.ReactNode
  iconBg?: string
  badge?: React.ReactNode
  title: string
  subtitle: React.ReactNode
  footerLeft: React.ReactNode
  footerRight: React.ReactNode
  extra?: React.ReactNode
  actions?: CardActions
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: isSelected ? accentBg : 'rgba(var(--glass-rgb), 0.88)',
        backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: isSelected ? `1.5px solid ${borderColor ?? accentColor}` : '1px solid var(--color-border-glass)',
        borderRadius: 20, padding: '18px 18px 12px', cursor: 'pointer',
        boxShadow: isSelected ? `0 0 0 3px ${(borderColor ?? accentColor)}22, 0 6px 24px rgba(0,0,0,0.08)` : '0 3px 16px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', gap: 10, transition: 'all 0.18s', height: '100%',
      }}
    >
      {actions && <CardActionBar actions={actions} visible={hovered} accentColor={accentColor} />}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: iconBg ?? 'var(--color-bg-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, opacity: actions && hovered ? 0 : 1, transition: 'opacity 0.14s' }}>{badge}</div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3, marginBottom: 4, minHeight: '2.6em', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>{title}</div>
        {/* Подзаголовок обрезается на трёх строках: у курса это «предмет · уровень»
            в одну строку, а у набора карточек — описание абзацем, и без обрезки
            одна плитка вытягивала бы весь ряд сетки. */}
        <div style={{ fontSize: 11, color: 'var(--color-text-3)', lineHeight: 1.45, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, overflow: 'hidden' }}>{subtitle}</div>
        {extra}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--color-border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-muted)', fontSize: 12, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{footerLeft}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-3)', fontSize: 11, flexShrink: 0, whiteSpace: 'nowrap' }}>{footerRight}</div>
      </div>
    </motion.div>
  )
}

/** Плитка-заглушка витрины: та же геометрия, что у ContentCard, чтобы сетка не
 *  прыгала, когда карточки приедут из БД. */
export function CardSkeleton() {
  return (
    <div style={{
      background: 'rgba(var(--glass-rgb), 0.88)',
      border: '1px solid var(--color-border-glass)',
      borderRadius: 20, padding: '18px 18px 12px',
      display: 'flex', flexDirection: 'column', gap: 10, height: '100%',
      boxShadow: '0 3px 16px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <Skeleton w={36} h={36} radius={12} />
        <Skeleton w={64} h={18} radius={7} />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <Skeleton w="85%" h={13} />
        <Skeleton w="55%" h={13} />
        <Skeleton w="70%" h={10} style={{ marginTop: 3 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--color-border-soft)' }}>
        <Skeleton w={78} h={11} />
        <Skeleton w={34} h={11} />
      </div>
    </div>
  )
}
