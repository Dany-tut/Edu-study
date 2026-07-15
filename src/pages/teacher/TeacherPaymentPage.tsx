import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Zap, CreditCard, Send } from 'lucide-react'
import { useTeacher } from '../../store/teacherStore'
import { useT, useLang } from '../../lib/i18n'
import { PLAN_TIERS, fetchMyPlan, planPrice, type MyPlan, type PlanTier } from '../../lib/plan'
import { submitFeedback } from '../../lib/feedbackRequests'

function PlanCard({ tier, current, onRequest, requesting, requested }: {
  tier: PlanTier
  current: boolean
  onRequest: () => void
  requesting: boolean
  requested: boolean
}) {
  const t = useT()
  const { lang } = useLang()
  const accent = tier.code === 'pro'
  return (
    <div style={{
      flex: 1, minWidth: 210,
      background: accent ? 'var(--grad-purple)' : 'var(--color-bg-2)',
      border: accent ? 'none' : '1px solid var(--color-border-medium)',
      borderRadius: 20, padding: '22px 20px', position: 'relative', overflow: 'hidden',
      boxShadow: accent ? '0 8px 32px rgba(106,90,230,0.4)' : 'none',
    }}>
      {current && (
        <div style={{ position: 'absolute', top: 14, right: 14, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8 }}>
          {t('Текущий')}
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 700, color: accent ? 'rgba(255,255,255,0.78)' : 'var(--color-text-3)', marginBottom: 8 }}>{t(tier.name)}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 3 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: accent ? '#fff' : 'var(--color-text)', letterSpacing: '-1px' }}>{tier.priceRub === 0 ? t('Бесплатно') : planPrice(tier, lang)}</span>
        {tier.priceRub > 0 && <span style={{ fontSize: 12, color: accent ? 'rgba(255,255,255,0.6)' : 'var(--color-text-3)' }}>/{t('мес')}</span>}
      </div>
      <div style={{ fontSize: 12.5, color: accent ? 'rgba(255,255,255,0.7)' : 'var(--color-text-3)' }}>
        {tier.maxStudents == null ? t('Без лимита учеников') : `${t('До')} ${tier.maxStudents} ${t('учеников')}`}
      </div>

      <div style={{ height: 1, background: accent ? 'rgba(255,255,255,0.15)' : 'var(--color-border)', margin: '16px 0' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {tier.features.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: 6, flexShrink: 0, background: accent ? 'rgba(255,255,255,0.2)' : 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={11} strokeWidth={3} style={{ color: accent ? '#fff' : 'var(--color-accent)' }} />
            </div>
            <span style={{ fontSize: 12.5, color: accent ? 'rgba(255,255,255,0.88)' : 'var(--color-text-2)' }}>{t(f)}</span>
          </div>
        ))}
      </div>

      <button
        disabled={current || requesting || requested}
        onClick={onRequest}
        style={{
          width: '100%', padding: '11px', borderRadius: 12, border: accent ? 'none' : '1px solid var(--color-border-medium)',
          background: current ? (accent ? 'rgba(255,255,255,0.18)' : 'var(--color-bg-3)') : accent ? 'rgba(255,255,255,0.22)' : 'var(--color-purple)',
          color: current ? (accent ? 'rgba(255,255,255,0.7)' : 'var(--color-text-3)') : '#fff',
          fontSize: 13, fontWeight: 700, cursor: current || requesting || requested ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        } as React.CSSProperties}
      >
        {current ? t('Активен')
          : requested ? <><Check size={15} /> {t('Заявка отправлена')}</>
          : requesting ? t('Отправляем…')
          : <><Send size={14} /> {t('Оставить заявку')}</>}
      </button>
    </div>
  )
}

export default function TeacherPaymentPage() {
  const setActivePage = useTeacher(s => s.setActivePage)
  const t = useT()
  const { lang } = useLang()
  const [plan, setPlan] = useState<MyPlan | null>(null)
  const [requesting, setRequesting] = useState<string | null>(null)
  const [requested, setRequested] = useState<string | null>(null)

  useEffect(() => { fetchMyPlan().then(setPlan) }, [])

  // Текущий тариф: код из my_plan, иначе бесплатный (бета-аккаунт без подписки).
  const currentCode = plan?.plan_code ?? 'free'

  async function request(tier: PlanTier) {
    setRequesting(tier.code)
    const message = `${t('Хочу перейти на тариф')} «${t(tier.name)}» (${tier.priceRub === 0 ? t('бесплатно') : `${planPrice(tier, lang)}/${t('мес')}`}).`
    await submitFeedback({ role: 'teacher', section: 'Тариф', message, attachments: [] })
    setRequesting(null)
    setRequested(tier.code)
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <motion.button whileTap={{ scale: 0.94 }} onClick={() => setActivePage('home')}
            style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--color-bg-3)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-3)', flexShrink: 0 }}>
            <ArrowLeft size={16} strokeWidth={2} />
          </motion.button>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>{t('Тарифы')}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1 }}>{t('Подписка и счета')}</div>
          </div>
        </div>

        {/* Current plan banner */}
        <div style={{ background: 'var(--color-purple-soft)', border: '1px solid var(--color-border-medium)', borderRadius: 18, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: 'var(--grad-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={20} strokeWidth={2} style={{ color: '#fff' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
              {t('Текущий тариф')}: {t(PLAN_TIERS.find(p => p.code === currentCode)?.name ?? 'Бесплатный')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
              {plan
                ? `${t('Учеников')}: ${plan.students_used}${plan.max_students != null ? ` / ${plan.max_students}` : ` · ${t('без лимита')}`}`
                : t('Оплата подключается вручную — оставьте заявку на нужный тариф')}
            </div>
          </div>
        </div>

        {/* Plans */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 }}>{t('Планы')}</div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {PLAN_TIERS.map(tier => (
              <PlanCard
                key={tier.code}
                tier={tier}
                current={tier.code === currentCode}
                requesting={requesting === tier.code}
                requested={requested === tier.code}
                onRequest={() => request(tier)}
              />
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 12, lineHeight: 1.5 }}>
            {t('Оплата подключается вручную: заявка уходит администратору, он активирует тариф.')}
          </div>
        </div>

        {/* Billing history placeholder */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 }}>{t('История платежей')}</div>
          <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 16, padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
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
