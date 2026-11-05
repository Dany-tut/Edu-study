import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import LoginMethods from './teacher/TeacherLoginMethods'
import Modal from './Modal'
import FadeText from './FadeText'
import HScrollFade from './HScrollFade'
import ProfileChips from './ProfileChips'
import { FriendsContent } from './DesktopFriends'
import type { FriendsModel } from '../lib/desktopFriends'
import { useT } from '../lib/i18n'
import '../pages/teacher/teacherProfileHeader.css'
import './studentProfileDialog.css'

export type StudentProfileTab = 'main' | 'friends' | 'settings'
export default function StudentProfile({ section, onChange, onClose, name, avatar, avatarControls, model }: {
  section: StudentProfileTab; onChange: (tab: StudentProfileTab) => void; onClose: () => void
  name: string; avatar: ReactNode; avatarControls: ReactNode; model: FriendsModel
}) {
  const t = useT()
  const root = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState('')
  const handle = model.snapshot?.handle
  useEffect(() => {
    const previous = document.activeElement
    const dialog = root.current?.closest<HTMLElement>('[role="dialog"]')
    dialog?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus()
    function trap(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !dialog) return
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')).filter(el => el.getClientRects().length)
      const first = controls[0], last = controls[controls.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    dialog?.addEventListener('keydown', trap)
    return () => { dialog?.removeEventListener('keydown', trap); if (previous instanceof HTMLElement && previous.isConnected) previous.focus() }
  }, [])
  useEffect(() => { setCopied('') }, [handle, model.account])
  useEffect(() => { if (!copied) return; const timer = setTimeout(() => setCopied(''), 2200); return () => clearTimeout(timer) }, [copied])
  useLayoutEffect(() => { root.current?.closest('.no-scrollbar')?.scrollTo({top:0}) }, [section])
  const change = (next: StudentProfileTab) => { model.setTab(null); onChange(next) }
  return <Modal width={1080} zIndex={1100} onClose={onClose} cardStyle={{background:'var(--color-bg)',height:'min(780px, 90dvh)'}} title={
    <div className="student-profile-heading">
      <div className="student-profile-heading-identity"><h1>{t('Профиль')}</h1>
        {handle ? <button className="student-profile-copy" onClick={async () => {
          try { await navigator.clipboard.writeText('@' + handle); setCopied(t('Скопировано')) }
          catch { setCopied(t('Не удалось скопировать')) }
        }} aria-label={t('Скопировать ник') + ' ' + handle}><FadeText>@{handle}</FadeText></button> : <FadeText className="student-profile-subtitle">{name}</FadeText>}
        <span role="status" className="student-profile-copy-result">{copied}</span>
      </div>
      <HScrollFade padX={2} padTop={3} padBottom={3} fadeWidth={22}>
        <ProfileChips<StudentProfileTab> label={t('Разделы профиля')} value={section} onChange={change} items={[
          {id:'main',label:t('Главное')}, {id:'friends',label:t('Друзья') + (model.incoming.length ? ' · ' + model.incoming.length : '')}, {id:'settings',label:t('Настройки')},
        ]}/>
      </HScrollFade>
    </div>
  }>
    <div ref={root} className="teacher-profile-page student-profile-dialog">
      <div className="profile-section-heading"><h2>{t(section === 'main' ? 'Личные данные' : section === 'friends' ? 'Друзья' : 'Настройки')}</h2>
        <p>{t(section === 'main' ? 'Твой профиль в Искре.' : section === 'friends' ? 'Поиск людей, заявки и твой ник.' : 'Ник, видимость и способы входа.')}</p></div>
      {section === 'main' && <div className="profile-main-grid">
        <section className="profile-card profile-avatar-card"><h3>{t('Аватар')}</h3><div className="student-profile-avatar">{avatar}</div>{avatarControls}</section>
        <section className="profile-card profile-details-card"><h3>{t('Личные данные')}</h3>
          <div className="student-profile-detail"><span>{t('Имя')}</span><strong>{name || t('Ученик')}</strong></div>
          <div className="student-profile-detail"><span>{t('Ник в Искре')}</span><strong>{handle ? '@' + handle : t('Ник ещё не выбран')}</strong></div>
          <p className="student-profile-subtitle">{t('По нику друзья смогут найти тебя и отправить заявку.')}</p>
          <button className="profile-social-edit" onClick={() => change('friends')}>{t('Открыть друзей')}</button>
        </section>
      </div>}
      {section === 'friends' && <div className="profile-social-grid">
        <div className="profile-social-list"><FriendsContent model={{...model,tab:'contacts'}} overview polished /></div>
        <aside className="profile-card profile-social-identity" aria-label={t('Твой профиль для друзей')}>
          <div className="profile-social-monogram" aria-hidden="true">@</div><h3>{t('Твой ник в Искре')}</h3><p className="profile-social-caption">{t('Один ник, чтобы найти друг друга.')}</p>
          <div className="profile-social-handle"><FadeText>{handle ? '@' + handle : t('Ник ещё не выбран')}</FadeText></div>
          <p className="profile-social-visibility">{t(!handle ? 'Выбери ник, чтобы друзья могли тебя найти' : model.snapshot?.searchable ? 'Тебя можно найти по точному нику' : 'Поиск по нику выключен')}</p>
          <button className="profile-social-edit" onClick={() => change('settings')}>{t('Изменить ник и видимость')}</button>
          <p className="profile-social-privacy">{t('Твой email остаётся приватным.')}</p>
        </aside>
      </div>}
      {section === 'settings' && <div className="profile-social-grid profile-settings-grid">
        <div className="profile-settings-main"><LoginMethods student /></div>
        <aside className="profile-card profile-social-identity" aria-label={t('Ник и видимость')}><h3>{t('Ник и видимость')}</h3><FriendsContent model={{...model,tab:'profile'}} /></aside>
      </div>}
    </div>
  </Modal>
}
