import { motion } from 'framer-motion'
import { ArrowLeft, Check, Zap, Star, CreditCard, Clock } from 'lucide-react'
import { useTeacher } from '../../store/teacherStore'
import { useT } from '../../lib/i18n'

function PlanCard({
  name, price, period, features, badge, current, accent,
}: {
  name: string
  price: string
  period?: string
  features: string[]
  badge?: string
  current?: boolean
  accent?: boolean
}) {
  const t = useT()
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: accent ? 'var(--grad-purple)' : 'var(--color-bg-2)',
      border: accent ? 'none' : '1px solid var(--color-border-medium)',
      borderRadius: 20, padding: '22px 20px',
      position: 'relative', overflow: 'hidden',
      boxShadow: accent ? '0 8px 32px rgba(106,90,230,0.45)' : 'none',
    }}>
      {badge && (
        <div style={{
          position: 'absolute', top: 14, right: 14,
          background: accent ? 'rgba(255,255,255,0.2)' : 'var(--color-yellow-soft)',
          color: accent ? '#fff' : 'var(--color-yellow-text)',
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
          letterSpacing: 0.3,
        }}>
          {badge}
        </div>
      )}
      {current && (
        <div style={{
          position: 'absolute', top: 14, right: 14,
          background: 'var(--color-green-soft)',
          color: 'var(--color-green-text)',
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
        }}>
          {t('Текущий')}
        </div>
      )}

      <div style={{ fontSize: 13, fontWeight: 700, color: accent ? 'rgba(255,255,255,0.75)' : 'var(--color-text-3)', marginBottom: 8 }}>
        {name}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: accent ? '#fff' : 'var(--color-text)', letterSpacing: '-1px' }}>
          {price}
        </span>
        {period && (
          <span style={{ fontSize: 12, color: accent ? 'rgba(255,255,255,0.6)' : 'var(--color-text-3)' }}>/{period}</span>
        )}
      </div>

      <div style={{ height: 1, background: accent ? 'rgba(255,255,255,0.15)' : 'var(--color-border)', margin: '16px 0' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {features.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 18, height: 18, borderRadius: 6, flexShrink: 0,
              background: accent ? 'rgba(255,255,255,0.2)' : 'var(--color-purple-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Check size={11} strokeWidth={3} style={{ color: accent ? '#fff' : 'var(--color-accent)' }} />
            </div>
            <span style={{ fontSize: 12.5, color: accent ? 'rgba(255,255,255,0.88)' : 'var(--color-text-2)' }}>{f}</span>
          </div>
        ))}
      </div>

      <button
        disabled={current}
        style={{
          width: '100%', padding: '11px', borderRadius: 12,
          border: accent ? 'none' : `1px solid var(--color-border-medium)`,
          background: accent ? 'rgba(255,255,255,0.22)' : 'var(--color-bg-3)',
          color: accent ? '#fff' : current ? 'var(--color-text-3)' : 'var(--color-text)',
          fontSize: 13, fontWeight: 600,
          cursor: current ? 'default' : 'pointer',
        } as React.CSSProperties}
      >
        {current ? t('Активен') : t('Скоро')}
      </button>
    </div>
  )
}

export default function TeacherPaymentPage() {
  const setActivePage = useTeacher(s => s.setActivePage)
  const t = useT()

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setActivePage('home')}
            style={{
              width: 36, height: 36, borderRadius: 12,
              background: 'var(--color-bg-3)', border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--color-text-3)', flexShrink: 0,
            }}
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </motion.button>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>{t('Оплата')}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1 }}>{t('Подписка и счета')}</div>
          </div>
        </div>

        {/* Current status banner */}
        <div style={{
          background: 'var(--color-purple-soft)', border: '1px solid var(--color-border-medium)',
          borderRadius: 18, padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 13,
            background: 'var(--grad-purple)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Zap size={20} strokeWidth={2} style={{ color: '#fff' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{t('Бесплатный план')}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
              {t('Платные планы появятся в ближайшее время')}
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)',
            background: 'var(--color-bg-3)', borderRadius: 10, padding: '5px 10px',
          }}>
            <Clock size={11} />
            {t('Скоро')}
          </div>
        </div>

        {/* Plans */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 }}>{t('Планы')}</div>
          <div style={{ display: 'flex', gap: 14 }}>
            <PlanCard
              name={t('Базовый')}
              price={t('Бесплатно')}
              current
              features={[
                t('До 30 учеников'),
                t('До 5 групп'),
                t('Конструктор уроков'),
                t('Домашние задания'),
                t('Журнал посещаемости'),
              ]}
            />
            <PlanCard
              name={t('Про')}
              price="$19"
              period={t('мес')}
              accent
              badge={t('Скоро')}
              features={[
                t('Неограниченно учеников'),
                t('Неограниченно групп'),
                t('Несколько учителей'),
                t('Аналитика и отчёты'),
                t('Приоритетная поддержка'),
              ]}
            />
          </div>
        </div>

        {/* Billing history placeholder */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 }}>{t('История платежей')}</div>
          <div style={{
            background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)',
            borderRadius: 16, padding: '32px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={20} strokeWidth={1.5} style={{ color: 'var(--color-text-3)' }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)' }}>{t('Платежей пока нет')}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', opacity: 0.7 }}>{t('История появится после первой оплаты')}</div>
          </div>
        </div>

      </div>
    </div>
  )
}
