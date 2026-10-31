import IskraMark from '../components/landing/IskraMark'
import {
  ArrowRight,
  BookOpenCheck,
  CheckCheck,
  GraduationCap,
  Users,
} from '../components/icons/appIcons'
import { useT } from '../lib/i18n'

const roleIconTile: React.CSSProperties = {
  width: 42,
  height: 42,
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  borderRadius: 15,
}

export default function NativeEntryPage() {
  const t = useT()

  const chooseRole = (route: string) => {
    window.location.hash = route
  }

  const roleCard: React.CSSProperties = {
    width: '100%', padding: 14, borderRadius: 24,
    border: '1px solid var(--color-border-glass)', color: 'var(--color-text)',
    background: 'var(--color-surface)', boxShadow: 'var(--shadow-1)',
    display: 'grid', gap: 12, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box',
    transition: 'transform .18s ease, border-color .18s ease, box-shadow .18s ease',
  }
  const preview: React.CSSProperties = {
    padding: '11px 12px', borderRadius: 16, background: 'var(--color-bg-2)',
    boxSizing: 'border-box',
  }

  const teacher = (
    <div style={preview}>
      <div style={{ color: 'var(--color-purple-text)', fontSize: 10, lineHeight: 1.2, fontWeight: 750, letterSpacing: '.04em' }}>
        {t('ПРИМЕР · МОЙ ДЕНЬ')}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
        <span style={{ color: 'var(--color-text)', fontSize: 15, lineHeight: 1.25, fontWeight: 720 }}>17:00</span>
        <span style={{ color: 'var(--color-text-2)', fontSize: 13, lineHeight: 1.3 }}>{t('Электролиз')}</span>
      </div>
      <div style={{ height: 1, margin: '8px 0 7px', background: 'var(--color-bg-5)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <CheckCheck size={18} color="var(--color-purple)" strokeWidth={2} />
        <span style={{ flex: 1, color: 'var(--color-text-2)', fontSize: 12, lineHeight: 1.25, fontWeight: 550 }}>{t('Работы на проверке')}</span>
        <span style={{ minWidth: 22, height: 22, display: 'grid', placeItems: 'center', borderRadius: 11, background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)', fontSize: 11, fontWeight: 700 }}>3</span>
      </div>
    </div>
  )

  const student = (
    <div style={preview}>
      <div style={{ color: 'var(--color-blue-pill-text)', fontSize: 10, lineHeight: 1.2, fontWeight: 750, letterSpacing: '.04em' }}>
        {t('ПРИМЕР · МОЙ КУРС')}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <BookOpenCheck size={18} color="var(--color-blue-pill-text)" strokeWidth={2} />
        <span style={{ color: 'var(--color-text)', fontSize: 14, lineHeight: 1.25, fontWeight: 700 }}>{t('Химия · Электрохимия')}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 9, color: 'var(--color-muted)', fontSize: 11, lineHeight: 1.25 }}>
        <span>{t('Прогресс курса')}</span><span style={{ color: 'var(--color-text-2)', fontWeight: 650 }}>46%</span>
      </div>
      <div style={{ height: 7, marginTop: 5, overflow: 'hidden', borderRadius: 7, background: 'var(--color-bg-5)' }}>
        <div style={{ width: '46%', height: '100%', borderRadius: 'inherit', background: 'var(--grad-purple)' }} />
      </div>
    </div>
  )

  const option = ({
    label,
    detail,
    route,
    icon: Icon,
    tint,
    iconColor,
    sample,
  }: {
    label: string
    detail: string
    route: string
    icon: typeof Users
    tint: string
    iconColor: string
    sample: React.ReactNode
  }) => (
    <button
      type="button"
      className="iskra-role-option"
      style={roleCard}
      aria-label={`${t(label)}. ${t(detail)}`}
      onClick={() => chooseRole(route)}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ ...roleIconTile, color: iconColor, background: tint }}>
          <Icon size={23} strokeWidth={2} />
        </span>
        <span style={{ display: 'grid', gap: 3, flex: 1, minWidth: 0 }}>
          <span style={{ color: 'var(--color-text)', fontSize: 16, lineHeight: 1.2, fontWeight: 720 }}>{t(label)}</span>
          <span style={{ color: 'var(--color-muted)', fontSize: 12, lineHeight: 1.3 }}>{t(detail)}</span>
        </span>
        <ArrowRight size={18} style={{ flexShrink: 0, color: 'var(--color-purple)' }} />
      </span>
      {sample}
    </button>
  )

  return (
    <main style={{
      minHeight: '100dvh', display: 'grid', placeItems: 'center',
      padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 20px calc(env(safe-area-inset-bottom, 0px) + 16px)',
      background: 'var(--color-bg)', boxSizing: 'border-box',
    }}>
      <section style={{ width: '100%', maxWidth: 402, boxSizing: 'border-box' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, marginBottom: 22, padding: '0 2px' }}>
          <IskraMark size={36} />
          <span style={{ color: 'var(--color-text)', fontWeight: 750, fontSize: 19 }}>{t('Искра')}</span>
        </header>

        <div style={{ color: 'var(--color-purple-text)', fontSize: 12, fontWeight: 750, letterSpacing: '.07em', marginBottom: 9, textAlign: 'center' }}>
          {t('ОДНО ПРИЛОЖЕНИЕ · ДВЕ РОЛИ')}
        </div>
        <h1 style={{
          margin: '0 0 8px', color: 'var(--color-text)', fontSize: 29,
          fontWeight: 760, lineHeight: 1.12, letterSpacing: '-.035em', textAlign: 'center',
        }}>{t('С чего начнём?')}</h1>
        <p style={{
          margin: '0 auto', maxWidth: 322, color: 'var(--color-muted)',
          fontSize: 14, lineHeight: 1.45, textAlign: 'center',
        }}>{t('Выберите роль, чтобы продолжить.')}</p>

        <div style={{ display: 'grid', gap: 16, marginTop: 28 }}>
          {option({
            label: 'Я препод',
            detail: 'Занятия, группы и ученики',
            route: '#/teacher',
            icon: Users,
            tint: 'var(--color-purple-soft)',
            iconColor: 'var(--color-purple-text)',
            sample: teacher,
          })}
          {option({
            label: 'Я ученик',
            detail: 'Курсы, задания и прогресс',
            route: '#/login',
            icon: GraduationCap,
            tint: 'var(--color-blue-pill-bg)',
            iconColor: 'var(--color-blue-pill-text)',
            sample: student,
          })}
        </div>

        <p style={{
          margin: '18px 8px 0', color: 'var(--color-muted)',
          fontSize: 12, lineHeight: 1.4, textAlign: 'center',
        }}>{t('Войти или создать аккаунт можно после выбора роли.')}</p>
      </section>
      <style>{`
        .iskra-role-option:hover { transform: translateY(-2px); border-color: var(--color-purple); box-shadow: 0 8px 24px rgba(83, 61, 180, .12); }
        .iskra-role-option:active { transform: scale(.99); }
        .iskra-role-option:focus-visible { outline: 3px solid rgba(124, 108, 224, .42); outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) { .iskra-role-option { transition: none !important; } }
      `}</style>
    </main>
  )
}
