import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LogOut, Monitor, MessageSquarePlus, Moon, Sun, Wallet, AlertTriangle, Users, ClipboardCheck, ChevronRight, Sparkles, Download } from 'lucide-react'
import MobileScreen from '../../MobileScreen'
import FeedbackModal from '../../FeedbackModal'
import TariffModal from '../TariffModal'
import { tactile } from '../../../lib/feedback'
import { supabase } from '../../../lib/supabase'
import { trackNow } from '../../../lib/analytics'
import { useTheme } from '../../../store/themeStore'
import { fetchMyPlan } from '../../../lib/plan'
import { useFinanceSummary } from '../../../lib/useFinances'
import { useHomeData } from '../../../lib/useHomeData'
import { DEMO_TEACHER_PROFILE, type TeacherProfileModel } from '../../../data/teacherProfileDemo'
import { useT } from '../../../lib/i18n'
import { requestShowInstall, isStandalone } from '../../../lib/pwaInstall'

// MOBILE ONLY teacher profile — bento layout: identity, tariff+quota, live
// stats (доход / долги / ученики / проверить), settings, logout. Wired to real
// hooks with a DEV-only demo fallback when there's no logged-in teacher.

const rub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`
const short = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n))

// цветные плитки статистики (soft-пары из дизайн-системы)
function StatTile({ icon, value, label, bg, fg }: { icon: React.ReactNode; value: React.ReactNode; label: string; bg: string; fg: string }) {
  return (
    <div style={{ background: bg, borderRadius: 14, padding: '12px 13px', minHeight: 66, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ color: fg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {icon}
      </div>
      <div style={{ fontSize: 20, fontWeight: 750, color: fg, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11.5, fontWeight: 550, color: fg, opacity: 0.85, lineHeight: 1.15 }}>{label}</div>
    </div>
  )
}

export default function MobileTeacherProfile() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<{ name?: string; subject?: string } | null>(null)
  const [plan, setPlan] = useState<{ planName: string; studentsUsed: number; maxStudents: number | null } | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [tariffOpen, setTariffOpen] = useState(false)
  const { dark, toggle: toggleTheme } = useTheme()

  const finance = useFinanceSummary()
  const home = useHomeData()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
      if (!data.user) return
      supabase.from('profiles').select('name, first_name, subject').eq('id', data.user.id).maybeSingle()
        .then(({ data: p }) => {
          if (p) setProfile({ name: (p.first_name || p.name) ?? undefined, subject: p.subject ?? undefined })
        })
    })
    fetchMyPlan().then(p => {
      if (p) setPlan({ planName: p.plan_name, studentsUsed: p.students_used, maxStudents: p.max_students })
    })
  }, [])

  // В локальной разработке без залогиненного учителя всё пусто → показываем
  // демо, чтобы полировать экран. Реальные данные всегда побеждают.
  const debtorCount = home.allStudents.filter((s: any) => s.debt && s.debt > 0).length
  const realEmpty = home.totalStudents === 0 && finance.received === 0 && home.pendingCount === 0 && !plan
  const useDemo = import.meta.env.DEV && realEmpty

  const emailName = email ? email.split('@')[0] : t('Учитель')
  const m: TeacherProfileModel = useDemo ? DEMO_TEACHER_PROFILE : {
    name: profile?.name || emailName,
    subject: profile?.subject || t('Учительский кабинет'),
    planName: plan?.planName || t('Бета-доступ'),
    studentsUsed: plan?.studentsUsed ?? home.totalStudents,
    maxStudents: plan?.maxStudents ?? null,
    received: finance.received,
    debt: finance.debt,
    debtorCount,
    studentTotal: home.totalStudents,
    groupCount: home.groups.filter(g => !g.isIndividual).length,
    pending: home.pendingCount,
  }

  const initial = (m.name.charAt(0) || 'У').toUpperCase()
  const quotaPct = m.maxStudents ? Math.min(100, Math.round((m.studentsUsed / m.maxStudents) * 100)) : null

  const logout = async () => {
    tactile()
    void trackNow('logout', { role: 'teacher' })
    await supabase.auth.signOut()
    window.location.hash = '#/teacher'
    window.location.reload()
  }

  return (
    <MobileScreen scrollKey="t-profile">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

        {/* Identity — span 2 */}
        <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 13, padding: '14px 15px', borderRadius: 16, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)' }}>
          <div style={{ width: 52, height: 52, borderRadius: 999, background: 'var(--color-avatar-bg)', color: '#fff', fontSize: 23, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)', flexShrink: 0, textTransform: 'uppercase' }}>{initial}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.1, textTransform: 'capitalize' }}>{m.name}</div>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.subject}</div>
          </div>
        </div>

        {/* Tariff + quota — span 2, gradient. Opens the tariff screen (same as
            the «Повысить» row below). Payment isn't wired, so choosing a plan
            there files a prefilled feedback request; admin assigns it by hand. */}
        <button
          onClick={() => { tactile(); setTariffOpen(true) }}
          style={{ gridColumn: 'span 2', padding: '14px 15px', borderRadius: 16, background: 'linear-gradient(135deg, #9B6FE8, #6F3FBF)', color: '#fff', border: 'none', textAlign: 'left', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{t('Тариф')} · {m.planName}</span>
            {quotaPct !== null
              ? <span style={{ fontSize: 12.5, fontWeight: 600, opacity: 0.9 }}>{m.studentsUsed} / {m.maxStudents} {t('учеников')}</span>
              : <span style={{ fontSize: 11.5, fontWeight: 600, opacity: 0.85, background: 'rgba(255,255,255,0.2)', padding: '3px 9px', borderRadius: 20 }}>{t('без лимита')}</span>}
          </div>
          {quotaPct !== null && (
            <div style={{ height: 6, background: 'rgba(255,255,255,0.3)', borderRadius: 20, marginTop: 10, overflow: 'hidden' }}>
              <div style={{ width: `${quotaPct}%`, height: '100%', background: '#fff', borderRadius: 20 }} />
            </div>
          )}
        </button>

        {/* Stats — 2×2 */}
        <StatTile icon={<Wallet size={17} />} value={short(m.received)} label={t('Доход за месяц, ₽')} bg="var(--color-green-soft)" fg="var(--color-green-text)" />
        <StatTile
          icon={<AlertTriangle size={17} />}
          value={m.debt > 0 ? short(m.debt) : '0'}
          label={m.debt > 0 ? `${t('Долги')} · ${m.debtorCount} ${t('чел.')}` : t('Долгов нет')}
          bg={m.debt > 0 ? 'var(--color-red-soft)' : 'var(--color-bg-3)'}
          fg={m.debt > 0 ? 'var(--color-red-text)' : 'var(--color-muted)'}
        />
        <StatTile icon={<Users size={17} />} value={m.studentTotal} label={`${t('Ученики')} · ${m.groupCount} ${t('групп')}`} bg="var(--color-purple-soft)" fg="var(--color-purple-text)" />
        <StatTile icon={<ClipboardCheck size={17} />} value={m.pending} label={m.pending > 0 ? t('Ждут проверки') : t('Всё проверено')} bg="var(--color-yellow-soft)" fg="var(--color-yellow-text)" />

        {/* Settings — span 2, grouped icon-list (C-style) */}
        <div style={{ gridColumn: 'span 2', marginTop: 4, borderRadius: 16, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', overflow: 'hidden' }}>
          {/* Тариф — actionable row (A-style «Повысить») */}
          <button
            onClick={() => { tactile(); setTariffOpen(true) }}
            className="flex items-center justify-between cursor-pointer"
            style={{ width: '100%', padding: '13px 15px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--color-border-soft)' }}
          >
            <span className="flex items-center" style={{ gap: 10, fontSize: 14.5, fontWeight: 550, color: 'var(--color-text)' }}>
              <Sparkles size={18} style={{ color: 'var(--color-purple-text)' }} />{t('Тариф')} · {m.planName}
            </span>
            {m.maxStudents !== null
              ? <span style={{ fontSize: 12, fontWeight: 650, color: 'var(--color-purple-text)', background: 'var(--color-purple-soft)', padding: '4px 11px', borderRadius: 20 }}>{t('Повысить')}</span>
              : <ChevronRight size={17} style={{ color: 'var(--color-text-4)' }} />}
          </button>

          {/* Тема */}
          <button
            onClick={() => { tactile(); toggleTheme() }}
            className="flex items-center justify-between cursor-pointer"
            style={{ width: '100%', padding: '13px 15px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--color-border-soft)' }}
          >
            <span className="flex items-center" style={{ gap: 10, fontSize: 14.5, fontWeight: 550, color: 'var(--color-text)' }}>
              {dark ? <Moon size={18} style={{ color: 'var(--color-muted)' }} /> : <Sun size={18} style={{ color: 'var(--color-muted)' }} />}{t('Тема оформления')}
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-3)' }}>{dark ? t('Тёмная') : t('Светлая')}</span>
          </button>

          {/* Обратная связь */}
          <button
            onClick={() => { tactile(); setFeedbackOpen(true) }}
            className="flex items-center justify-between cursor-pointer"
            style={{ width: '100%', padding: '13px 15px', background: 'transparent', border: 'none', borderBottom: isStandalone() ? 'none' : '1px solid var(--color-border-soft)' }}
          >
            <span className="flex items-center" style={{ gap: 10, fontSize: 14.5, fontWeight: 550, color: 'var(--color-text)' }}>
              <MessageSquarePlus size={18} style={{ color: 'var(--color-muted)' }} />{t('Обратная связь')}
            </span>
            <ChevronRight size={17} style={{ color: 'var(--color-text-4)' }} />
          </button>

          {/* Установить приложение — скрыта, если уже запущено как PWA */}
          {!isStandalone() && (
            <button
              onClick={() => { tactile(); requestShowInstall() }}
              className="flex items-center justify-between cursor-pointer"
              style={{ width: '100%', padding: '13px 15px', background: 'transparent', border: 'none' }}
            >
              <span className="flex items-center" style={{ gap: 10, fontSize: 14.5, fontWeight: 550, color: 'var(--color-text)' }}>
                <Download size={18} style={{ color: 'var(--color-muted)' }} />{t('Установить приложение')}
              </span>
              <ChevronRight size={17} style={{ color: 'var(--color-text-4)' }} />
            </button>
          )}
        </div>

        {/* Desktop tools footer — span 2, compact */}
        <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', borderRadius: 14, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)' }}>
          <Monitor size={16} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-muted)', lineHeight: 1.35 }}>
            {t('Конструктор курсов и редактор уроков — на компьютере.')}
          </span>
        </div>

        {/* Logout — span 2 */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={logout}
          className="flex items-center justify-center cursor-pointer"
          style={{ gridColumn: 'span 2', gap: 8, padding: 13, borderRadius: 16, background: 'transparent', color: 'var(--color-red-text)', border: 'none', fontSize: 14.5, fontWeight: 600 }}
        >
          <LogOut size={17} /> {t('Выйти из аккаунта')}
        </motion.button>
      </div>
      {feedbackOpen && <FeedbackModal role="teacher" onClose={() => setFeedbackOpen(false)} />}
      {tariffOpen && <TariffModal currentName={m.planName} currentMaxStudents={m.maxStudents} onClose={() => setTariffOpen(false)} />}
    </MobileScreen>
  )
}
