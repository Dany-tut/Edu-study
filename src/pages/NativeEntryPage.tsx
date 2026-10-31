import { useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpenCheck, GraduationCap, Users } from 'lucide-react'
import IskraMark from '../components/landing/IskraMark'
import { useT } from '../lib/i18n'

const INTRO_KEY = 'iskra:ios:intro:v1'

const intro = [
  { icon: BookOpenCheck, title: 'Учёба и преподавание — в одном приложении', body: 'Искра объединяет кабинет учителя и ученика. Выбери свою роль, чтобы открыть нужный раздел.' },
  { icon: Users, title: 'Учителю', body: 'Расписание, группы, ученики, уроки и проверка домашних заданий — под рукой.' },
  { icon: GraduationCap, title: 'Ученику', body: 'Курсы, задания, оценки и прогресс доступны в том же приложении.' },
]

export default function NativeEntryPage() {
  const t = useT()
  const [page, setPage] = useState(() => localStorage.getItem(INTRO_KEY) ? intro.length : 0)
  const finished = page >= intro.length
  const finishIntro = () => {
    localStorage.setItem(INTRO_KEY, 'done')
    setPage(intro.length)
  }

  const card: React.CSSProperties = {
    width: '100%', maxWidth: 420, padding: 28, borderRadius: 28,
    background: 'var(--color-surface)', border: '1px solid var(--color-border-glass)',
    boxShadow: 'var(--shadow-4)', boxSizing: 'border-box',
  }
  const primary: React.CSSProperties = {
    width: '100%', minHeight: 52, border: 0, borderRadius: 16,
    color: '#fff', background: 'var(--grad-purple)', fontSize: 15, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
  }
  const secondary: React.CSSProperties = {
    width: '100%', minHeight: 52, borderRadius: 16,
    border: '1px solid var(--color-border-medium)', color: 'var(--color-text)',
    background: 'var(--color-bg-input)', fontSize: 15, fontWeight: 650,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
  }

  return (
    <main style={{
      minHeight: '100dvh', display: 'grid', placeItems: 'center',
      padding: 'calc(env(safe-area-inset-top, 0px) + 20px) 20px calc(env(safe-area-inset-bottom, 0px) + 20px)',
      background: 'var(--color-bg)', boxSizing: 'border-box',
    }}>
      <section style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <IskraMark size={42} />
          <div style={{ fontWeight: 750, fontSize: 20, color: 'var(--color-text)' }}>{t('Искра')}</div>
        </div>

        {!finished ? (() => {
          const slide = intro[page]
          const Icon = slide.icon
          return <>
            <div style={{ width: 56, height: 56, borderRadius: 18, display: 'grid', placeItems: 'center', background: 'rgba(124, 92, 255, .12)', color: 'var(--color-purple)', marginBottom: 20 }}>
              <Icon size={26} />
            </div>
            <h1 style={{ fontSize: 25, lineHeight: 1.15, letterSpacing: '-.03em', margin: '0 0 10px', color: 'var(--color-text)' }}>{t(slide.title)}</h1>
            <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--color-muted)', margin: '0 0 26px' }}>{t(slide.body)}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginBottom: 22 }}>
              {intro.map((_, i) => <span key={i} style={{ width: i === page ? 20 : 6, height: 6, borderRadius: 9, background: i === page ? 'var(--color-purple)' : 'var(--color-border-medium)', transition: 'width .2s' }} />)}
            </div>
            <button style={primary} onClick={() => page + 1 === intro.length ? finishIntro() : setPage(page + 1)}>
              {page + 1 === intro.length ? t('Выбрать роль') : t('Продолжить')} <ArrowRight size={17} />
            </button>
            <button style={{ width: '100%', minHeight: 42, border: 0, background: 'transparent', color: 'var(--color-muted)', fontSize: 13, marginTop: 8 }} onClick={finishIntro}>{t('Пропустить')}</button>
          </>
        })() : <>
          <h1 style={{ fontSize: 25, lineHeight: 1.15, letterSpacing: '-.03em', margin: '0 0 8px', color: 'var(--color-text)' }}>{t('Как вы используете Искру?')}</h1>
          <p style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--color-muted)', margin: '0 0 22px' }}>{t('Выберите кабинет для входа')}</p>
          <button style={primary} onClick={() => { window.location.hash = '#/teacher' }}>
            <Users size={19} /> {t('Я преподаватель')} <ArrowRight size={17} />
          </button>
          <button style={{ ...secondary, marginTop: 12 }} onClick={() => { window.location.hash = '#/login' }}>
            <GraduationCap size={19} /> {t('Я ученик')} <ArrowRight size={17} />
          </button>
          <button style={{ width: '100%', minHeight: 38, border: 0, background: 'transparent', color: 'var(--color-muted)', fontSize: 12, marginTop: 14 }} onClick={() => setPage(0)}>
            <ArrowLeft size={13} style={{ verticalAlign: -2, marginRight: 5 }} />{t('Посмотреть знакомство ещё раз')}
          </button>
        </>}
      </section>
    </main>
  )
}
