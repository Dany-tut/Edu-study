import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { User } from '@supabase/supabase-js'
import { sections, guides, attempts, pupilViews, type GuideId } from '../../../../design/contextual-onboarding/guides.mjs'
import { supabase } from '../../../lib/supabase'
import ScrollFade from '../../ScrollFade'
import { X } from '../../icons/appIcons'
import './teacherGuides.css'
import { openDialog } from '../../../lib/polyfills'

const assets = import.meta.glob<string>('../../../../design/contextual-onboarding/media/{access-mode,unlock-lesson,pupil-open,pupil-locked,teacher-feedback,learner-feedback,revised-answer,compare-answers,publish-grade,misha-result,move-queue,desk-switch,roster-invite,roster-register,roster-joined,schedule-move,journal-first,journal-second,finance-payment,learner-card,learner-score,misha-first,misha-second}.{gif,webp,png}', { eager: true, query: '?url', import: 'default' })
const media = (file: string) => assets['../../../../design/contextual-onboarding/media/' + file]
const ids = Object.keys(sections) as GuideId[]
const flag = (id: GuideId) => 'iskra_guide_seen_' + id
const cacheKey = (owner: string, id: GuideId) => owner + ':' + flag(id)

const GuideContext = createContext<{ enter: (id: GuideId) => void; catalog: () => void } | null>(null)
export const useTeacherGuides = () => useContext(GuideContext)

export function TeacherGuides({ children, user, enabled, section }: {
  children: ReactNode; user?: User; enabled: boolean; section?: GuideId
}) {
  const [open, setOpen] = useState<GuideId | 'catalog' | null>(null)
  const [fromCatalog, setFromCatalog] = useState(false)
  const sessionSeen = useRef(new Set<string>())
  const unsaved = useRef(new Set<GuideId>())
  const syncing = useRef(false)
  const owner = user?.id
  const metadata = user?.user_metadata
  const sync = useCallback(async () => {
    if (!owner || !enabled || syncing.current) return
    syncing.current = true
    try {
      try {
        for (const id of ids) {
          if (localStorage.getItem(cacheKey(owner, id)) === 'pending') unsaved.current.add(id)
        }
      } catch { /* Account persistence also works without browser storage. */ }
      while (unsaved.current.size) {
        const pending = [...unsaved.current]
        if ((await supabase.auth.getSession()).data.session?.user.id !== owner) return
        // Independent metadata fields preserve concurrent visits to different sections.
        const { error } = await supabase.auth.updateUser({ data: Object.fromEntries(pending.map(id => [flag(id), true])) })
        if (error) return
        for (const id of pending) {
          unsaved.current.delete(id)
          try { localStorage.setItem(cacheKey(owner, id), 'seen') } catch { /* Already synced. */ }
        }
      }
    } catch { /* Keep pending flags for the next online visit. */ }
    finally { syncing.current = false }
  }, [owner, enabled])
  useEffect(() => {
    void sync()
    window.addEventListener('online', sync)
    return () => window.removeEventListener('online', sync)
  }, [sync])
  const remember = useCallback((id: GuideId) => {
    if (!enabled || !owner || metadata?.[flag(id)]) return false
    const key = cacheKey(owner, id)
    if (sessionSeen.current.has(key)) return false
    try {
      if (localStorage.getItem(key)) return false
      localStorage.setItem(key, 'pending')
    } catch { /* Keep the in-memory marker and sync it with the account. */ }
    sessionSeen.current.add(key)
    unsaved.current.add(id)
    void sync()
    return true
  }, [enabled, owner, metadata, sync])
  const enter = useCallback((id: GuideId) => {
    if (!remember(id)) return
    setFromCatalog(false)
    setOpen(id)
  }, [remember])
  useEffect(() => { if (section) enter(section) }, [section, enter])
  useEffect(() => { if (!enabled) setOpen(null) }, [enabled])
  const catalog = () => { setFromCatalog(true); setOpen('catalog') }
  const close = () => setOpen(fromCatalog && open !== 'catalog' ? 'catalog' : null)
  return <GuideContext.Provider value={enabled && owner ? { enter, catalog } : null}>
    {children}
    {enabled && open && <GuideDialog current={open} onChoose={id => { remember(id); setOpen(id) }} onClose={close}/>}
  </GuideContext.Provider>
}

function GuideDialog({ current, onChoose, onClose }: {
  current: GuideId | 'catalog'; onChoose: (id: GuideId) => void; onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const selected = useRef<GuideId | null>(null)
  useLayoutEffect(() => {
    const el = dialog.current!
    openDialog(el)
    return () => el.close?.()
  }, [])
  useLayoutEffect(() => {
    if (current === 'catalog' && selected.current) dialog.current?.querySelector<HTMLButtonElement>('[data-guide="'+selected.current+'"]')?.focus()
    else dialog.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [current])
  return createPortal(<dialog ref={dialog} className="teacher-guide" aria-labelledby="guide-heading"
    onPointerDown={event => event.stopPropagation()} onClick={event => {
      event.stopPropagation()
      // Клик по затемнению вокруг окна: у <dialog> фон — это он сам, поэтому
      // сверяем точку с рамкой окна, а не только event.target.
      if (event.target !== event.currentTarget) return
      const r = event.currentTarget.getBoundingClientRect()
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose()
    }}
    onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') {event.preventDefault(); onClose()} }}
    onCancel={event => {event.preventDefault(); onClose()}}>
    {current === 'catalog' ? <div className="teacher-guide-catalog">
      <div className="teacher-guide-row"><h2 id="guide-heading">Подсказки</h2><Close onClose={onClose}/></div>
      <ScrollFade maxHeight="100%"><div className="teacher-guide-list">{ids.map(id => <button data-hover="layer" key={id} data-guide={id}
        onClick={() => {selected.current = id; onChoose(id)}}><b>{sections[id][0]}</b><span>{sections[id][1]}</span></button>)}</div></ScrollFade>
    </div> : <GuideSheet key={current} id={current} onClose={onClose}/>}
  </dialog>, document.body)
}

function Close({ onClose }: {onClose: () => void}) {
  return <button data-hover="layer" type="button" aria-label="Закрыть подсказку" onClick={onClose}><X size={18}/></button>
}

function GuideSheet({ id, onClose }: {id: GuideId; onClose: () => void}) {
  const [index, setIndex] = useState(0)
  const [choice, setChoice] = useState(0)
  const [playing, setPlaying] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches)
  const steps = guides[id]
  const [title, asset, caption, next] = steps[index]
  const history = asset === 'attempts'
  const lessons = asset === 'pupil-open'
  const options = history ? attempts : lessons ? pupilViews : []
  const file = options[choice]?.file ?? asset
  const description = history ? attempts[choice].answer + ' Анна: ' + attempts[choice].comment : lessons ? pupilViews[choice].caption : caption
  const move = (n: number) => {setChoice(0); setIndex(n)}
  return <div className="teacher-guide-sheet">
    <div className="teacher-guide-row"><span>{sections[id][0]} · {index + 1} из {steps.length}</span>
      {!history && <button data-hover="layer" onClick={() => setPlaying(p => !p)}>{playing ? 'Остановить' : 'Смотреть GIF'}</button>}
      <Close onClose={onClose}/></div>
    <h2 id="guide-heading">{title}</h2>
    <div className="teacher-guide-media"><img alt={history ? attempts[choice].status + '. ' + description : title}
      src={media(file + (history ? '.png' : playing ? '.gif' : '.webp'))}/></div>
    <ScrollFade maxHeight="100%"><div className="teacher-guide-description">
      {options.length > 0 && <div role="group" aria-label={history ? 'Попытка Миши' : 'Урок'}>{options.map((option, n) =>
        <button data-hover="layer" key={option.file} aria-pressed={n === choice} onClick={() => setChoice(n)}>{option.label}</button>)}</div>}
      <p>{description}</p></div></ScrollFade>
    <footer><button data-hover="layer" onClick={() => index ? move(index-1) : onClose()}>{index ? 'Назад' : 'Закрыть'}</button>
      <button data-hover="layer" onClick={() => index + 1 === steps.length ? onClose() : move(index+1)}>{index + 1 === steps.length ? 'Готово' : next}</button></footer>
  </div>
}
