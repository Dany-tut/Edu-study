import { useOpenStudentCabinet } from '../../../lib/useOpenStudentCabinet'
import Modal from '../../Modal'
import TeacherModules from '../TeacherModules'
import FadeText from '../../FadeText'
import CountBadge from '../../CountBadge'
import { useNotificationsStore } from '../../../store/notificationsStore'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, LayoutDashboard, LogOut, Monitor, MessageSquarePlus, Moon, Sun, Wallet, AlertTriangle, Users, ClipboardCheck, ChevronRight, Sparkles, Download, Languages, BookOpen, FileText, Image } from '../../icons/appIcons'
import MobileScreen from '../../MobileScreen'
import { GlassPill } from '../../mobileChrome'
import FeedbackModal from '../../FeedbackModal'
import TariffModal from '../TariffModal'
import { tactile } from '../../../lib/feedback'
import { supabase } from '../../../lib/supabase'
import { trackNow } from '../../../lib/analytics'
import { useTeacher } from '../../../store/teacherStore'
import { useTheme } from '../../../store/themeStore'
import { fetchMyPlan } from '../../../lib/plan'
import { useFinanceSummary } from '../../../lib/useFinances'
import { useHomeData } from '../../../lib/useHomeData'
import { DEMO_TEACHER_PROFILE, type TeacherProfileModel } from '../../../data/teacherProfileDemo'
import { useT, useLang, type Lang, useTc } from '../../../lib/i18n'
import { requestShowInstall, isStandalone } from '../../../lib/pwaInstall'
import AppVersionRow from '../../AppVersionRow'
import AppIconSheet, { AppIconTile } from '../../AppIconSheet'
import { APP_ICONS, useAppIcon } from '../../../lib/appIcon'
import { getSessionUser } from '../../../lib/owner'
import { AvatarPhotoFill } from '../../AvatarPhoto'
import { useMyTeacherAvatarPath } from '../../../lib/avatarPhoto'
import { useTeacherAccess } from '../../../lib/teacherAccess'
import { subjectNamesFromStored } from '../../../lib/subjects'
import TeacherSubjectsField from '../TeacherSubjectsField'
import { Alert } from '../../Alert'
import DesktopFriends from '../../DesktopFriends'
import { useDesktopFriends } from '../../../lib/desktopFriends'
import TeacherLoginMethods from '../TeacherLoginMethods'
import TeacherFeatureSettings from '../TeacherFeatureSettings'
import PaymentsInbox from '../payments/PaymentsInbox'
import { useFeature } from '../../../lib/teacherFeatures'
import { usePaymentInbox } from '../../../lib/paymentClaims'
import { useTeacherSession } from '../../../lib/useTeacherSession'

// MOBILE ONLY teacher profile — bento layout: identity, tariff+quota, live
// stats (доход / долги / ученики / проверить), settings, logout. Wired to real
// hooks with a DEV-only demo fallback when there's no logged-in teacher.

const rub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`
const short = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n))

// Ряды карточки настроек — одной высоты и без разделителей (как в профиле
// ученика): ровная колонка вместо лесенки из полосок.
const ROW_H = 56

// цветные плитки статистики (soft-пары из дизайн-системы)
function StatTile({ icon, value, label, bg, fg }: { icon: React.ReactNode; value: React.ReactNode; label: string; bg: string; fg: string }) {
  return (
    <div style={{ background: bg, borderRadius: 14, padding: '12px 12px', minHeight: 66, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ color: fg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {icon}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: fg, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 500, color: fg, opacity: 0.85, lineHeight: 1.2 }}>{label}</div>
    </div>
  )
}

export default function MobileTeacherProfile({ onOpenJournal, onOpenWidgets, onOpenNotifications, onOpenReports }: { onOpenJournal?: () => void; onOpenWidgets?: () => void; onOpenNotifications?: () => void; onOpenReports?: () => void }) {
  const unreadNotifs = useNotificationsStore(s => s.notifications.filter(n => !n.read).length)
  const signedIn = useTeacherSession()
  const studentCabinet = useOpenStudentCabinet()
  const friends = useDesktopFriends()
  const t = useT()
  const { tc, tn } = useTc()
  const { lang, setLang } = useLang()
  const [email, setEmail] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [integrations, setIntegrations] = useState(false)
  const [profile, setProfile] = useState<{ name?: string; subject?: string } | null>(null)
  const [plan, setPlan] = useState<{ planName: string; studentsUsed: number; maxStudents: number | null } | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  // «Оплаты» (концепт «Связь»): подтвердить «Оплатили» одним касанием.
  const payments = useFeature('payment_reminders')
  const [paymentsOpen, setPaymentsOpen] = useState(false)
  const paymentClaims = usePaymentInbox(s => s.claims.length)
  useEffect(() => { if (payments) void usePaymentInbox.getState().load() }, [payments])
  const [iconOpen, setIconOpen] = useState(false)
  const iconSupported = useAppIcon(s => s.supported)
  const iconCurrent = useAppIcon(s => s.current)
  const loadIcon = useAppIcon(s => s.load)
  useEffect(() => { void loadIcon() }, [loadIcon])
  const [tariffOpen, setTariffOpen] = useState(false)
  const { dark, toggle: toggleTheme } = useTheme()

  const openPage = useTeacher(s => s.setActivePage)
  const showFinances = useTeacherAccess(s => s.canTab('finances'))
  const showConstructor = useTeacherAccess(s => s.canTab('constructor'))
  const isTeacher = useTeacherAccess(s => s.isTeacher)
  const mySubjects = useTeacherAccess(s => s.subjects)
  const saveSubjects = useTeacherAccess(s => s.saveSubjects)
  const [subjectsError, setSubjectsError] = useState(false)
  const changeSubjects = async (next: string[]) => setSubjectsError(!(await saveSubjects(next)))

  const finance = useFinanceSummary()
  const home = useHomeData()

  useEffect(() => {
    getSessionUser().then(u => {
      setEmail(u?.email ?? '')
      setIsAdmin(u?.app_metadata?.role === 'admin')
      if (!u) return
      supabase.from('profiles').select('name, first_name, subject').eq('id', u.id).maybeSingle()
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
  const useDemo = import.meta.env.DEV && signedIn === false && realEmpty

  const emailName = email ? email.split('@')[0] : t('Учитель')
  const m: TeacherProfileModel = useDemo ? DEMO_TEACHER_PROFILE : {
    name: profile?.name || emailName,
    subject: (mySubjects.length ? subjectNamesFromStored(mySubjects).join(', ') : profile?.subject) || t('Учительский кабинет'),
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
  const photoPath = useMyTeacherAvatarPath()
  const quotaPct = m.maxStudents ? Math.min(100, Math.round((m.studentsUsed / m.maxStudents) * 100)) : null

  const logout = async () => {
    tactile()
    void trackNow('logout', { role: 'teacher' })
    await supabase.auth.signOut()
    window.location.hash = '#/teacher'
    window.location.reload()
  }

  return (
    <MobileScreen scrollKey="t-profile" topPad={64} glassHeader={{ leading: t('Ещё') }} topZone={<div style={{ display: 'flex', justifyContent: 'center', minHeight: 44, alignItems: 'center' }}><GlassPill>{t('Ещё')}</GlassPill></div>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

        {/* Identity — span 2 */}
        <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 24, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)' }}>
          <div style={{ position: 'relative', width: 52, height: 52, borderRadius: 999, background: 'var(--color-avatar-bg)', color: '#fff', fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)', flexShrink: 0, textTransform: 'uppercase' }}>
            {initial}
            <AvatarPhotoFill path={photoPath} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2, textTransform: 'capitalize' }}>{tn(m.name)}</div>
            <FadeText style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-muted)', marginTop: 2 }}>{tc(m.subject)}</FadeText>
          </div>
        </div>

        {/* Мои предметы — span 2. Сохраняются сразу; у админа поля нет. */}
        {isTeacher && (
          <div style={{ gridColumn: 'span 2' }}>
            <TeacherSubjectsField value={mySubjects} onChange={changeSubjects} look="profile" />
            {subjectsError && <Alert tone="danger" text={t('Не удалось сохранить предметы. Попробуйте ещё раз.')} style={{ marginTop: 8 }} />}
          </div>
        )}

        {/* Tariff + quota — span 2, gradient. Opens the tariff screen (same as
            the «Повысить» row below). Payment isn't wired, so choosing a plan
            there files a prefilled feedback request; admin assigns it by hand. */}
        <button data-hover="layer"
          onClick={() => { tactile(); setTariffOpen(true) }}
          style={{ gridColumn: 'span 2', padding: '14px 16px', borderRadius: 24, background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)', border: 'none', textAlign: 'left', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{t('Тариф')} · {m.planName}</span>
            {quotaPct !== null
              ? <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>{m.studentsUsed} / {m.maxStudents} {t('учеников')}</span>
              : <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.85, background: 'var(--color-bg-3)', padding: '4px 10px', borderRadius: 20 }}>{t('без лимита')}</span>}
          </div>
          {quotaPct !== null && (
            <div style={{ height: 6, background: 'var(--color-border-soft)', borderRadius: 20, marginTop: 10, overflow: 'hidden' }}>
              <div style={{ width: `${quotaPct}%`, height: '100%', background: 'var(--color-accent)', borderRadius: 20 }} />
            </div>
          )}
        </button>

        {/* Stats — 2×2 */}
        <StatTile icon={<Wallet size={18} />} value={short(m.received)} label={t('Доход за месяц, ₽')} bg="var(--color-green-soft)" fg="var(--color-green-text)" />
        <StatTile
          icon={<AlertTriangle size={18} />}
          value={m.debt > 0 ? short(m.debt) : '0'}
          label={m.debt > 0 ? `${t('Долги')} · ${m.debtorCount} ${t('чел.')}` : t('Долгов нет')}
          bg={m.debt > 0 ? 'var(--color-red-soft)' : 'var(--color-bg-3)'}
          fg={m.debt > 0 ? 'var(--color-red-text)' : 'var(--color-muted)'}
        />
        <StatTile icon={<Users size={18} />} value={m.studentTotal} label={`${t('Ученики')} · ${m.groupCount} ${t(m.groupCount % 10 === 1 && m.groupCount % 100 !== 11 ? 'группа' : m.groupCount % 10 >= 2 && m.groupCount % 10 <= 4 && (m.groupCount % 100 < 12 || m.groupCount % 100 > 14) ? 'группы' : 'групп')}`} bg="var(--color-purple-soft)" fg="var(--color-purple-text)" />
        <StatTile icon={<ClipboardCheck size={18} />} value={m.pending} label={m.pending > 0 ? t('Ждут проверки') : t('Всё проверено')} bg="var(--color-yellow-soft)" fg="var(--color-yellow-text)" />

        {onOpenJournal && <button data-hover="layer" type="button" onClick={() => { tactile(); onOpenJournal() }} style={{ gridColumn: 'span 2', width: '100%', minHeight: 52, borderRadius: 24, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-bg-3)', color: 'var(--color-text)', border: '1px solid var(--color-border-soft)' }}><ClipboardCheck size={22} /><span style={{ flex: 1, textAlign: 'left', fontWeight: 600 }}>{t('Журнал')}</span><ChevronRight size={18} /></button>}
        {onOpenReports && <button data-hover="layer" type="button" onClick={() => { tactile(); onOpenReports() }} style={{ gridColumn: 'span 2', width: '100%', minHeight: 52, borderRadius: 24, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-bg-3)', color: 'var(--color-text)', border: '1px solid var(--color-border-soft)' }}><FileText size={22} /><span style={{ flex: 1, textAlign: 'left', fontWeight: 600 }}>{t('Отчёты родителям')}</span><ChevronRight size={18} /></button>}

        <div style={{ gridColumn: 'span 2' }}><TeacherLoginMethods /></div>
        <div style={{ gridColumn: 'span 2' }}><TeacherFeatureSettings /></div>

        {/* Settings — span 2, grouped icon-list (C-style) */}
        <div style={{ gridColumn: 'span 2', marginTop: 4, borderRadius: 24, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', overflow: 'hidden' }}>
          {/* Уведомления — вход есть и в приложении iOS, где шапку рисует система */}
          {onOpenNotifications && <button data-hover="layer" type="button" onClick={() => { tactile(); onOpenNotifications() }} style={{ width:'100%', height:ROW_H, padding:'0 16px', display:'flex', alignItems:'center', gap:10, background:'transparent', border:0, color:'var(--color-text)', font:'inherit', fontSize:15, fontWeight:500, textAlign:'left' }}>
            <Bell size={18} style={{ color: 'var(--color-muted)', flexShrink: 0 }} /><span style={{ flex:1 }}>{t('Уведомления')}</span>
            <CountBadge count={unreadNotifs} tone="danger" />
            <ChevronRight size={18} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
          </button>}
          {/* Тариф — actionable row (A-style «Повысить») */}
          <button data-hover="layer"
            onClick={() => { tactile(); setTariffOpen(true) }}
            className="flex items-center justify-between cursor-pointer"
            style={{ width: '100%', height: ROW_H, padding: '0 16px', background: 'transparent', border: 'none' }}
          >
            <span className="flex items-center" style={{ gap: 10, fontSize: 15, fontWeight: 500, color: 'var(--color-text)' }}>
              <Sparkles size={18} style={{ color: 'var(--color-purple-text)' }} />{t('Тариф')} · {m.planName}
            </span>
            {m.maxStudents !== null
              ? <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-purple-text)', background: 'var(--color-purple-soft)', padding: '4px 12px', borderRadius: 20 }}>{t('Повысить')}</span>
              : <ChevronRight size={18} style={{ color: 'var(--color-text-4)' }} />}
          </button>

          {friends.account && <button data-hover="layer" type="button" onClick={() => { tactile(); friends.setTab('contacts') }} style={{ width:'100%', height:ROW_H, padding:'0 16px', display:'flex', alignItems:'center', gap:10, background:'transparent', border:0, color:'var(--color-text)', font:'inherit', fontSize:15, fontWeight:500, textAlign:'left' }}>
            <Users size={18} style={{ color: 'var(--color-muted)' }} /><span style={{ flex:1 }}>{t('Друзья')}</span><ChevronRight size={18} style={{ color: 'var(--color-text-4)' }} />
          </button>}
          <button data-hover="layer" type="button" onClick={() => { tactile(); setIntegrations(true) }} style={{ width:'100%', height:ROW_H, padding:'0 16px', display:'flex', alignItems:'center', gap:10, background:'transparent', border:0, color:'var(--color-text)', font:'inherit', fontSize:15, fontWeight:500, textAlign:'left' }}>
            <Sparkles size={18} style={{ color: 'var(--color-muted)' }} /><span style={{ flex:1 }}>{t('Интеграции')}</span><ChevronRight size={18} style={{ color: 'var(--color-text-4)' }} />
          </button>
          {/* Тема */}
          <button data-hover="layer"
            onClick={() => { tactile(); toggleTheme() }}
            className="flex items-center justify-between cursor-pointer"
            style={{ width: '100%', height: ROW_H, padding: '0 16px', background: 'transparent', border: 'none' }}
          >
            <span className="flex items-center" style={{ gap: 10, fontSize: 15, fontWeight: 500, color: 'var(--color-text)' }}>
              {dark ? <Moon size={18} style={{ color: 'var(--color-muted)' }} /> : <Sun size={18} style={{ color: 'var(--color-muted)' }} />}{t('Тема оформления')}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)' }}>{dark ? t('Тёмная') : t('Светлая')}</span>
          </button>

          {/* Иконка приложения — только в приложении на iOS */}
          {iconSupported && (
            <button
              onClick={() => { tactile(); setIconOpen(true) }}
              className="flex items-center justify-between cursor-pointer"
              style={{ width: '100%', height: ROW_H, padding: '0 16px', background: 'transparent', border: 'none' }}
            >
              <span className="flex items-center" style={{ gap: 10, fontSize: 15, fontWeight: 500, color: 'var(--color-text)' }}>
                <Image size={18} style={{ color: 'var(--color-muted)' }} />{t('Иконка приложения')}
              </span>
              <span className="flex items-center" style={{ gap: 8 }}>
                <AppIconTile src={(APP_ICONS.find(o => o.id === iconCurrent) ?? APP_ICONS[0]).preview} size={28} />
                <ChevronRight size={18} style={{ color: 'var(--color-text-4)' }} />
              </span>
            </button>
          )}

          {/* Язык — надпись показывает текущий язык, тап переключает на другой */}
          <button data-hover="layer"
            onClick={() => { tactile(); setLang((lang === 'ru' ? 'en' : 'ru') as Lang) }}
            aria-label={lang === 'ru' ? 'Switch to English' : 'Переключить на русский'}
            className="flex items-center justify-between cursor-pointer"
            style={{ width: '100%', height: ROW_H, padding: '0 16px', background: 'transparent', border: 'none' }}
          >
            <span className="flex items-center" style={{ gap: 10, fontSize: 15, fontWeight: 500, color: 'var(--color-text)' }}>
              <Languages size={18} style={{ color: 'var(--color-muted)' }} />{t('Язык')}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)' }}>{lang === 'ru' ? 'Русский' : 'English'}</span>
          </button>

          {onOpenWidgets && <button data-hover="layer" type="button"
            onClick={() => { tactile(); onOpenWidgets() }}
            className="flex items-center justify-between cursor-pointer"
            style={{ width: '100%', height: ROW_H, padding: '0 16px', background: 'transparent', border: 'none' }}
          >
            <span className="flex items-center" style={{ gap: 10, fontSize: 15, fontWeight: 500, color: 'var(--color-text)' }}>
              <LayoutDashboard size={18} style={{ color: 'var(--color-muted)' }} />{t('Настроить виджеты')}
            </span>
            <ChevronRight size={18} style={{ color: 'var(--color-text-4)' }} />
          </button>}

          {/* Обратная связь */}
          <button data-hover="layer"
            onClick={() => { tactile(); setFeedbackOpen(true) }}
            className="flex items-center justify-between cursor-pointer"
            style={{ width: '100%', height: ROW_H, padding: '0 16px', background: 'transparent', border: 'none' }}
          >
            <span className="flex items-center" style={{ gap: 10, fontSize: 15, fontWeight: 500, color: 'var(--color-text)' }}>
              <MessageSquarePlus size={18} style={{ color: 'var(--color-muted)' }} />{t('Обратная связь')}
            </span>
            <ChevronRight size={18} style={{ color: 'var(--color-text-4)' }} />
          </button>

          {/* Установить приложение — скрыта, если уже запущено как PWA */}
          {!isStandalone() && (
            <button data-hover="layer"
              onClick={() => { tactile(); requestShowInstall() }}
              className="flex items-center justify-between cursor-pointer"
              style={{ width: '100%', height: ROW_H, padding: '0 16px', background: 'transparent', border: 'none' }}
            >
              <span className="flex items-center" style={{ gap: 10, fontSize: 15, fontWeight: 500, color: 'var(--color-text)' }}>
                <Download size={18} style={{ color: 'var(--color-muted)' }} />{t('Установить приложение')}
              </span>
              <ChevronRight size={18} style={{ color: 'var(--color-text-4)' }} />
            </button>
          )}

          {/* Версия сборки — она же кнопка «проверить/забрать обновление» */}
          <AppVersionRow />
        </div>

        {([
          { page: 'finances', label: t('Финансы'), Icon: Wallet, visible: showFinances },
          { page: 'constructor', label: t('Конструктор'), Icon: Monitor, visible: showConstructor },
        ] as const).filter(tool => tool.visible).map(({ page, label, Icon }) => (
          <button data-hover="layer" key={page} type="button" onClick={() => openPage(page)}
            style={{ minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              borderRadius: 14, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', color: 'var(--color-text)' }}>
            <Icon size={16} />{label}
          </button>
        ))}

        {payments && (
          <button data-hover="layer" type="button" onClick={() => { tactile(); setPaymentsOpen(true) }}
            style={{ gridColumn: 'span 2', minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              borderRadius: 14, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', color: 'var(--color-text)' }}>
            <Wallet size={16} />{t('Оплаты: ждут вас')}
            {paymentClaims > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: '#C07020', background: 'var(--color-peach-soft)', borderRadius: 20, padding: '1px 8px' }}>{paymentClaims}</span>}
          </button>
        )}

        {isAdmin && <motion.button data-hover="layer"
          whileTap={{ scale: 0.97 }}
          onClick={() => { tactile(); studentCabinet.open() }}
          disabled={studentCabinet.busy} aria-busy={studentCabinet.busy}
          className="flex items-center justify-center cursor-pointer"
          style={{ gridColumn: 'span 2', gap: 8, padding: 12, borderRadius: 24, background: 'var(--color-bg-3)', color: 'var(--color-text)', border: 'none', fontSize: 15, fontWeight: 600 }}
        >
          <BookOpen size={18} /> {studentCabinet.failed ? t('Не удалось открыть кабинет. Повторить') : t('В ученический кабинет')}
        </motion.button>}

        {/* Logout — span 2 */}
        <motion.button data-hover="layer"
          whileTap={{ scale: 0.97 }}
          onClick={logout}
          className="flex items-center justify-center cursor-pointer"
          style={{ gridColumn: 'span 2', gap: 8, padding: 12, borderRadius: 16, background: 'transparent', color: 'var(--color-red-text)', border: 'none', fontSize: 15, fontWeight: 600 }}
        >
          <LogOut size={18} /> {t('Выйти из аккаунта')}
        </motion.button>
      </div>
      <DesktopFriends model={friends}/>
      {integrations && <Modal title={t('Интеграции')} onClose={() => setIntegrations(false)}><TeacherModules /></Modal>}
      {feedbackOpen && <FeedbackModal role="teacher" onClose={() => setFeedbackOpen(false)} />}
      {paymentsOpen && <Modal title={t('Оплаты: ждут вас')} onClose={() => setPaymentsOpen(false)}><div style={{ margin: '0 -16px' }}><PaymentsInbox /></div></Modal>}
      <AppIconSheet open={iconOpen} onClose={() => setIconOpen(false)} />
      {tariffOpen && <TariffModal currentName={m.planName} currentMaxStudents={m.maxStudents} onClose={() => setTariffOpen(false)} />}
    </MobileScreen>
  )
}
