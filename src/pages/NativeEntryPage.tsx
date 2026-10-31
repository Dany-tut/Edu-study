import { useState } from 'react'
import IskraMark from '../components/landing/IskraMark'
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCheck,
  GraduationCap,
  Users,
} from '../components/icons/appIcons'
import { useT } from '../lib/i18n'

const INTRO_KEY = 'iskra:ios:intro:v1'

const intro = [
  {
    kind: 'shared',
    title: 'Одна Искра — два пути',
    body: 'Учёба и преподавание собраны в одном приложении. Выберите свою роль, чтобы начать.',
  },
  {
    kind: 'teacher',
    title: 'Ведите занятия в одном ритме',
    body: 'Расписание, группы, ученики и проверка домашних работ всегда под рукой.',
  },
  {
    kind: 'student',
    title: 'Видно, что уже получается',
    body: 'Продолжайте уроки, отправляйте задания и следите за своим прогрессом.',
  },
] as const

const iconTile: React.CSSProperties = {
  width: 38,
  height: 38,
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  borderRadius: 13,
  color: 'var(--color-purple-text)',
  background: 'var(--color-purple-soft)',
}

function PreviewRow({
  icon: Icon,
  title,
  detail,
  tint = 'purple',
}: {
  icon: typeof Users
  title: string
  detail: string
  tint?: 'purple' | 'green' | 'blue'
}) {
  const t = useT()
  const color = tint === 'green'
    ? 'var(--color-green-text)'
    : tint === 'blue'
      ? 'var(--color-blue-pill-text)'
      : 'var(--color-purple-text)'
  const background = tint === 'green'
    ? 'var(--color-green-soft)'
    : tint === 'blue'
      ? 'var(--color-blue-pill-bg)'
      : 'var(--color-purple-soft)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, minHeight: 68,
      padding: '12px 14px', borderRadius: 20,
      border: '1px solid var(--color-border-glass)', background: 'var(--color-surface)',
      boxSizing: 'border-box',
    }}>
      <span style={{ ...iconTile, color, background }}><Icon size={20} strokeWidth={2} /></span>
      <span style={{ display: 'grid', gap: 4, minWidth: 0, textAlign: 'left' }}>
        <span style={{ color: 'var(--color-text)', fontSize: 14, lineHeight: 1.25, fontWeight: 700 }}>{t(title)}</span>
        <span style={{ color: 'var(--color-muted)', fontSize: 12, lineHeight: 1.3 }}>{t(detail)}</span>
      </span>
    </div>
  )
}

function Preview({ kind }: { kind: typeof intro[number]['kind'] }) {
  const t = useT()
  const frame: React.CSSProperties = {
    position: 'relative', width: '100%', height: 236, overflow: 'hidden',
    boxSizing: 'border-box', padding: 18, borderRadius: 28,
    background: 'var(--color-purple-soft)',
  }

  if (kind === 'shared') {
    return (
      <div aria-hidden="true" style={frame}>
        <div style={{ position: 'absolute', top: 22, left: 16, width: '48%' }}>
          <PreviewRow icon={Users} title="Учителю" detail="Занятия и группы" />
        </div>
        <span style={{
          position: 'absolute', zIndex: 1, top: 91, left: 'calc(50% - 27px)',
          width: 54, height: 54, display: 'grid', placeItems: 'center',
          borderRadius: 18, background: 'var(--color-bg)', boxShadow: 'var(--shadow-2)',
        }}><IskraMark size={40} /></span>
        <div style={{ position: 'absolute', right: 16, bottom: 22, width: '48%' }}>
          <PreviewRow icon={BookOpenCheck} title="Ученику" detail="Курсы и задания" tint="blue" />
        </div>
      </div>
    )
  }

  if (kind === 'teacher') {
    return (
      <div aria-hidden="true" style={{ ...frame, display: 'grid', alignContent: 'center', gap: 12 }}>
        <PreviewRow icon={CalendarDays} title="Мой день" detail="17:00 · Электролиз" tint="blue" />
        <PreviewRow icon={CheckCheck} title="3 работы ждут проверки" detail="Домашние задания" tint="green" />
        <span style={{ position: 'absolute', top: 31, left: 18, width: 4, height: 22, borderRadius: 4, background: 'var(--color-purple)' }} />
      </div>
    )
  }

  return (
    <div aria-hidden="true" style={{ ...frame, display: 'grid', alignContent: 'center', gap: 12 }}>
      <div style={{
        padding: 16, borderRadius: 22, border: '1px solid var(--color-border-glass)',
        background: 'var(--color-surface)', boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={iconTile}><BookOpenCheck size={20} strokeWidth={2} /></span>
          <span style={{ display: 'grid', gap: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{t('Химия · курс')}</span>
            <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{t('Электрохимия')}</span>
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, fontSize: 12, color: 'var(--color-text-2)' }}>
          <span>{t('Прогресс курса')}</span><strong>46%</strong>
        </div>
        <div style={{ height: 8, marginTop: 8, overflow: 'hidden', borderRadius: 8, background: 'var(--color-bg-5)' }}>
          <div style={{ width: '46%', height: '100%', borderRadius: 'inherit', background: 'var(--grad-purple)' }} />
        </div>
      </div>
      <PreviewRow icon={CheckCheck} title="Задание проверено" detail="Можно продолжать" tint="green" />
    </div>
  )
}

export default function NativeEntryPage() {
  const t = useT()
  const [page, setPage] = useState(() => localStorage.getItem(INTRO_KEY) ? intro.length : 0)
  const finished = page >= intro.length
  const finishIntro = () => {
    localStorage.setItem(INTRO_KEY, 'done')
    setPage(intro.length)
  }

  const primary: React.CSSProperties = {
    width: '100%', minHeight: 54, border: 0, borderRadius: 18,
    color: '#fff', background: 'var(--grad-purple)', fontSize: 15, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    cursor: 'pointer', transition: 'transform .18s ease, filter .18s ease',
  }
  const roleOption: React.CSSProperties = {
    width: '100%', minHeight: 84, padding: '14px 16px', borderRadius: 22,
    border: '1px solid var(--color-border-glass)', color: 'var(--color-text)',
    background: 'var(--color-surface)', display: 'flex', alignItems: 'center', gap: 14,
    textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box',
    boxShadow: 'var(--shadow-1)', transition: 'transform .18s ease, border-color .18s ease, box-shadow .18s ease',
  }
  const slide = !finished ? intro[page] : null

  return (
    <main style={{
      minHeight: '100dvh', display: 'grid', placeItems: 'center',
      padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 20px calc(env(safe-area-inset-bottom, 0px) + 16px)',
      background: 'var(--color-bg)', boxSizing: 'border-box',
    }}>
      <section style={{ width: '100%', maxWidth: 402, boxSizing: 'border-box' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22, padding: '0 2px' }}>
          <IskraMark size={36} />
          <span style={{ flex: 1, color: 'var(--color-text)', fontWeight: 750, fontSize: 19 }}>{t('Искра')}</span>
          {!finished && <button type="button" onClick={finishIntro} style={{
            border: 0, padding: '10px 4px', color: 'var(--color-muted)', background: 'transparent',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>{t('Пропустить')}</button>}
        </header>

        {!finished && slide ? <div key={slide.kind}>
          <Preview kind={slide.kind} />
          <h1 style={{
            margin: '22px 0 9px', color: 'var(--color-text)', fontSize: 'clamp(25px, 7vw, 30px)',
            fontWeight: 760, lineHeight: 1.12, letterSpacing: '-.035em', textAlign: 'center',
          }}>{t(slide.title)}</h1>
          <p style={{
            minHeight: 44, margin: '0 auto', maxWidth: 330, color: 'var(--color-muted)',
            fontSize: 14, lineHeight: 1.45, textAlign: 'center',
          }}>{t(slide.body)}</p>
          <div role="progressbar" aria-label={t('Знакомство с Искрой')} aria-valuemin={1} aria-valuemax={intro.length} aria-valuenow={page + 1}
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7, height: 24, margin: '24px 0 14px' }}>
            {intro.map((_, i) => <span key={i} style={{
              width: i === page ? 20 : 6, height: 6, borderRadius: 9,
              background: i === page ? 'var(--color-purple)' : 'var(--color-border-medium)',
              transition: 'width .2s ease, background .2s ease',
            }} />)}
          </div>
          <button type="button" className="iskra-entry-primary" style={primary} onClick={() => page + 1 === intro.length ? finishIntro() : setPage(page + 1)}>
            {t(page + 1 === intro.length ? 'Выбрать роль' : 'Продолжить')} <ArrowRight size={18} />
          </button>
        </div> : <div>
          <div style={{ color: 'var(--color-purple-text)', fontSize: 12, fontWeight: 750, letterSpacing: '.07em', marginBottom: 9 }}>
            {t('ОДНО ПРИЛОЖЕНИЕ · ДВЕ РОЛИ')}
          </div>
          <h1 style={{ fontSize: 30, lineHeight: 1.1, letterSpacing: '-.035em', margin: '0 0 10px', color: 'var(--color-text)', fontWeight: 760, textAlign: 'center' }}>
            {t('С чего начнём?')}
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--color-muted)', margin: '0 auto 22px', maxWidth: 330, textAlign: 'center' }}>
            {t('Выберите кабинет. Войти или создать аккаунт можно следующим шагом.')}
          </p>
          <div style={{ display: 'grid', gap: 11 }}>
            <button type="button" className="iskra-role-option" style={roleOption} onClick={() => { window.location.hash = '#/teacher' }}>
              <span style={{ ...iconTile, width: 48, height: 48, borderRadius: 16 }}><Users size={23} strokeWidth={2} /></span>
              <span style={{ display: 'grid', gap: 4, flex: 1 }}>
                <span style={{ fontSize: 16, lineHeight: 1.2, fontWeight: 720, whiteSpace: 'nowrap', letterSpacing: '-.02em' }}>{t('Я препод')}</span>
                <span style={{ fontSize: 12, lineHeight: 1.35, color: 'var(--color-muted)' }}>{t('Занятия, группы и ученики')}</span>
              </span>
              <ArrowRight size={18} style={{ flexShrink: 0, color: 'var(--color-purple)' }} />
            </button>
            <button type="button" className="iskra-role-option" style={roleOption} onClick={() => { window.location.hash = '#/login' }}>
          <span style={{ ...iconTile, width: 48, height: 48, borderRadius: 16, color: 'var(--color-blue-pill-text)', background: 'var(--color-blue-pill-bg)' }}><GraduationCap size={24} strokeWidth={2} /></span>
              <span style={{ display: 'grid', gap: 4, flex: 1 }}>
                <span style={{ fontSize: 16, lineHeight: 1.2, fontWeight: 720 }}>{t('Я ученик')}</span>
                <span style={{ fontSize: 12, lineHeight: 1.35, color: 'var(--color-muted)' }}>{t('Курсы, задания и прогресс')}</span>
              </span>
              <ArrowRight size={18} style={{ flexShrink: 0, color: 'var(--color-purple)' }} />
            </button>
          </div>
        </div>}
      </section>
      <style>{`
        .iskra-role-option:hover { transform: translateY(-2px); border-color: var(--color-purple); box-shadow: 0 8px 24px rgba(83, 61, 180, .12); }
        .iskra-role-option:active { transform: scale(.985); }
        .iskra-entry-primary:hover { filter: brightness(1.04); }
        .iskra-entry-primary:active { transform: scale(.985); }
        .iskra-role-option:focus-visible, .iskra-entry-primary:focus-visible { outline: 3px solid rgba(124, 108, 224, .42); outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) { .iskra-role-option, .iskra-entry-primary { transition: none !important; } }
      `}</style>
    </main>
  )
}
