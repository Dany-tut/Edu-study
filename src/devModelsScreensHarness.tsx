// Стенд экранов 3D-модуля (dev-models-screens.html). Не макеты, а живые
// компоненты на вьюере: задания «Найди» и «Подпиши», библиотека в
// материалах, вставка в конспект, карточка проверки преподом.
// Навигация по хешу: #find, #label, #library, #editor, #review. ?dark — тема.
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import Model3DQuiz from './components/Model3DQuiz'
import Model3DFigure from './components/Model3DFigure'
import Model3DThumb from './components/Model3DThumb'
import { MODEL_PRESETS, modelRefLabel } from './lib/models3d/registry'
import { loadModelSpec } from './lib/models3d/registry'
import type { ModelSpec } from './lib/models3d/spec'
import './index.css'
import './devModelsScreens.css'

const q = new URLSearchParams(location.search)
if (q.has('dark')) document.documentElement.dataset.theme = 'dark'

const SCREENS = [
  ['find', 'Домашка · Найди'], ['label', 'Домашка · Подпиши'], ['library', 'Библиотека 3D'], ['editor', 'Вставка в конспект'], ['review', 'Препод: правки модели'], ['admin', 'Админ: согласование'],
] as const
type Screen = typeof SCREENS[number][0]

function useHash(): [Screen, (s: Screen) => void] {
  const read = () => (SCREENS.find(s => s[0] === location.hash.slice(1))?.[0] ?? 'find') as Screen
  const [s, setS] = useState<Screen>(read)
  useEffect(() => { const on = () => setS(read()); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on) }, [])
  return [s, (v) => { location.hash = v }]
}

const LIBRARY = [
  { ref: 'model:mesh:bp3d-heart', title: 'Сердце по МРТ', meta: '9 частей · BodyParts3D · CC BY', status: 'ok', subject: 'bio', topic: 'Кровообращение' },
  { ref: 'model:mesh:bp3d-eye', title: 'Глазное яблоко по МРТ', meta: '7 частей · BodyParts3D · CC BY', status: 'review', subject: 'bio', topic: 'Органы чувств' },
  { ref: 'model:cell:animal', title: 'Животная клетка', meta: '9 частей · Искра', status: 'ok', subject: 'bio', topic: 'Клетка' },
  { ref: 'model:cell:plant', title: 'Растительная клетка', meta: '9 частей · Искра', status: 'review', subject: 'bio', topic: 'Клетка' },
  { ref: 'model:stages:mitosis', title: 'Митоз по стадиям', meta: '4 части · 5 стадий · Искра', status: 'ok', subject: 'bio', topic: 'Клетка' },
  { ref: 'model:organ:neuron', title: 'Нейрон', meta: '5 частей · Искра', status: 'draft', subject: 'bio', topic: 'Нервная система' },
  { ref: 'model:molecule:h2o', title: 'Вода · H₂O', meta: '3 части · из формулы', status: 'ok', subject: 'chem', topic: 'Строение вещества' },
  { ref: 'model:lattice:nacl', title: 'Решётка NaCl', meta: '3 части · из формулы', status: 'ok', subject: 'chem', topic: 'Строение вещества' },
  { ref: 'model:atom:Na', title: 'Атом натрия', meta: '4 части · из формулы', status: 'ok', subject: 'chem', topic: 'Строение атома' },
] as const
const STATUS_LABEL = { ok: 'Утверждена', review: 'На проверке', draft: 'Черновик' } as const

function Phone({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="ms__phone">
      <div className="ms__phone-top"><span>9:41</span><span style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>{title}</span><span>●●●</span></div>
      <div className="ms__phone-body">{children}</div>
    </div>
  )
}
function Window({ children, crumb }: { children: React.ReactNode; crumb: React.ReactNode }) {
  return (
    <div className="ms__window">
      <div className="ms__window-bar"><i /><i /><i />{crumb}</div>
      <div className="ms__window-body">{children}</div>
    </div>
  )
}

function FindScreen() {
  return (
    <>
      <h2 className="ms__title">Домашка «Найди на модели»</h2>
      <p className="ms__sub">Телефон ученика. Дано название, ученик нажимает на часть. Подписи скрыты, вращение и разбор остаются. Ответ по отдельной кнопке, после него открывается справка.</p>
      <Phone title="Домашка · Урок 12">
        <div className="ms__phone-bar"><span>Задание 3 из 7</span><span className="ms__chip">Сердце по МРТ</span></div>
        <Model3DQuiz src="model:mesh:bp3d-heart" mode="find" askedParts={['pulm', 'aorta', 'ra', 'valves']} />
      </Phone>
    </>
  )
}

function LabelScreen() {
  return (
    <>
      <h2 className="ms__title">Домашка «Подпиши части»</h2>
      <p className="ms__sub">Десктоп. Булавки стоят на точках подписей, ученик тапает булавку и название. В банке два лишних названия из незаданных частей той же модели.</p>
      <Window crumb={<>Домашка · Урок 12 · <b>Задание 4</b></>}>
        <Model3DQuiz src="model:mesh:bp3d-heart" mode="label" askedParts={['pulm', 'aorta', 'ra', 'lv', 'valves']} distractors={2} />
      </Window>
    </>
  )
}

function LibraryScreen() {
  const [subject, setSubject] = useState<'bio' | 'chem'>('bio')
  const [statuses, setStatuses] = useState<Record<string, boolean>>({ ok: true, review: true, draft: false })
  const [topic, setTopic] = useState<string | null>(null)
  const items = LIBRARY.filter(m => m.subject === subject && statuses[m.status] && (!topic || m.topic === topic))
  const topics = [...new Set(LIBRARY.filter(m => m.subject === subject).map(m => m.topic))]
  return (
    <>
      <h2 className="ms__title">Библиотека: Материалы → 3D</h2>
      <p className="ms__sub">Карточки с живой миниатюрой, статусом проверки и источником. Фильтры те же, что у остальных материалов. Вставить можно только утверждённые.</p>
      <Window crumb={<>Конструктор · Материалы · <b>3D-модели</b></>}>
        <div className="ms__side" style={{ margin: '-18px -20px' }}>
          <div className="ms__filters">
            <div><h4>Предмет</h4>
              {(['bio', 'chem'] as const).map(s => <button key={s} type="button" className="ms__check" aria-pressed={subject === s} onClick={() => { setSubject(s); setTopic(null) }}><i />{s === 'bio' ? 'Биология' : 'Химия'}</button>)}
            </div>
            <div><h4>Статус</h4>
              {(['ok', 'review', 'draft'] as const).map(s => <button key={s} type="button" className="ms__check" aria-pressed={statuses[s]} onClick={() => setStatuses(v => ({ ...v, [s]: !v[s] }))}><i />{STATUS_LABEL[s]}</button>)}
            </div>
            <div><h4>Источник</h4>
              <button type="button" className="ms__check" aria-pressed><i />Искра (из формулы)</button>
              <button type="button" className="ms__check" aria-pressed><i />BodyParts3D</button>
              <button type="button" className="ms__check"><i />Художник</button>
            </div>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <div className="ms__row">
              <button type="button" className="ms__chip" aria-pressed={!topic} onClick={() => setTopic(null)}>Все темы</button>
              {topics.map(t => <button key={t} type="button" className="ms__chip" aria-pressed={topic === t} onClick={() => setTopic(t)}>{t}</button>)}
            </div>
            <div className="ms__cards">
              {items.map(m => (
                <div key={m.ref} className="ms__card">
                  <Model3DThumb src={m.ref} className="m3d-thumb ms__card-thumb" />
                  <div className="ms__card-body">
                    <div className="ms__card-title">{m.title}</div>
                    <div className="ms__card-meta">{m.meta}</div>
                    <div><span className="ms__status" data-s={m.status}>● {STATUS_LABEL[m.status]}</span></div>
                    <div className="ms__row">
                      {m.status === 'ok'
                        ? <><button type="button" className="ms__btn">В конспект</button><button type="button" className="ms__btn" style={{ borderColor: 'transparent', color: '#786AD7' }}>В домашку</button></>
                        : <button type="button" className="ms__btn">Открыть для проверки</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Window>
    </>
  )
}

function EditorScreen() {
  const [ref, setRef] = useState('model:cell:animal')
  const [open, setOpen] = useState(false)
  return (
    <>
      <h2 className="ms__title">Вставка в конспект</h2>
      <p className="ms__sub">Кнопка «3D-модель» рядом с «Картинка». Блок в редакторе показывает живую миниатюру и те же стрелки, что у картинки. Внутри это маркер <code>![…](model:…)</code>, сохранение не меняется.</p>
      <Window crumb={<>Курс · Урок 5 «Компартменты» · <b>Конспект</b></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p className="ms__para">Эукариотическая клетка разделена на компартменты, и это не просто упаковка: каждый органоид держит свою среду. Белок попадает в нужный из них по адресной метке, и ошибка адреса — это болезнь.</p>
          <div className="ms__block">
            <Model3DThumb src={ref} className="m3d-thumb ms__block-thumb" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{modelRefLabel(ref)}</div>
              <div style={{ fontSize: 12.5, color: 'var(--color-muted)' }}>У ученика здесь интерактивная сцена. Подпись: «Нажмите на органеллу — откроется справка».</div>
              <div className="ms__row" style={{ marginTop: 2 }}>
                <button type="button" className="ms__chip" onClick={() => setOpen(v => !v)}>Заменить</button>
                <span className="ms__chip">↑</span><span className="ms__chip">↓</span><span className="ms__chip">Убрать</span>
              </div>
            </div>
          </div>
          {open && (
            <div className="ms__picker">
              {MODEL_PRESETS.filter(p => p.subject === 'bio').map(p => (
                <button key={p.ref} type="button" className="ms__pick" onClick={() => { setRef(p.ref); setOpen(false) }}>
                  <Model3DThumb src={p.ref} className="m3d-thumb" />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          )}
          <p className="ms__para">Путей входа три, и они принципиально различны. В ЭПР белок входит ещё во время синтеза: сигнальный пептид узнаёт SRP…</p>
          <div className="ms__row">
            <button type="button" className="ms__btn">＋ Картинка</button>
            <button type="button" className="ms__btn ms__btn--primary" onClick={() => setOpen(v => !v)}>＋ 3D-модель</button>
            <button type="button" className="ms__btn">＋ Схема</button>
          </div>
        </div>
      </Window>
    </>
  )
}

// ── Правки модели: препод предлагает, админ принимает ────────────────────────
// Один общий список предложений на оба экрана стенда. В приложении это
// таблица model_part_proposals: модель, часть, старый и новый текст,
// комментарий, автор, статус (ждёт / принято / отклонено).
interface Proposal { id: number; part: string; partName: string; before: string; after: string | null; comment: string; author: string; status: 'pending' | 'accepted' | 'rejected' }
const store = {
  proposals: [
    { id: 1, part: 'choroid', partName: 'Сосудистая оболочка', before: 'Средняя оболочка с сосудами и пигментом: питает сетчатку и гасит рассеянный свет. Спереди переходит в ресничное тело и радужку.', after: null, comment: 'В модели нет сетчатки — дописать в справку, что она лежит изнутри от сосудистой.', author: 'Вадим · биология', status: 'pending' },
    { id: 2, part: 'cornea', partName: 'Роговица', before: 'Прозрачная выпуклая часть наружной оболочки. Главная преломляющая среда глаза.', after: 'Прозрачная выпуклая часть наружной оболочки. Преломляет сильнее хрусталика (около 40 дптр), но кривизну не меняет.', comment: '', author: 'Вадим · биология', status: 'pending' },
  ] as Proposal[],
  listeners: new Set<() => void>(),
  emit() { this.listeners.forEach(l => l()) },
}
function useStore() {
  const [, tick] = useState(0)
  useEffect(() => { const l = () => tick(v => v + 1); store.listeners.add(l); return () => { store.listeners.delete(l) } }, [])
  return store
}

/** Правка-на-месте: двойной клик по тексту — поле с подчёркиванием, Enter — предложить. */
function InlineText({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  useEffect(() => { setDraft(value) }, [value])
  if (!editing) return <span onDoubleClick={() => setEditing(true)} title="Двойной клик — предложить правку" style={{ cursor: 'text' }}>{value}</span>
  return (
    <textarea
      autoFocus value={draft} onChange={e => setDraft(e.target.value)} rows={3}
      onBlur={() => { setEditing(false); if (draft.trim() && draft !== value) onCommit(draft.trim()) }}
      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur() } if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
      style={{ width: '100%', font: 'inherit', fontSize: 13, lineHeight: 1.45, color: 'var(--color-text)', background: 'transparent', border: 'none', borderBottom: '1px solid #786AD7', outline: 'none', resize: 'none', padding: '2px 0' }}
    />
  )
}

function ReviewScreen() {
  const src = 'model:mesh:bp3d-eye'
  const st = useStore()
  const [spec, setSpec] = useState<ModelSpec | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [commenting, setCommenting] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  useEffect(() => { loadModelSpec(src).then(setSpec) }, [])
  const partText = (p: { id: string; info: string }) => {
    const accepted = [...st.proposals].reverse().find(x => x.part === p.id && x.after && x.status === 'accepted')
    return accepted?.after ?? p.info
  }
  const propose = (p: { id: string; name: string; info: string }, after: string | null, comment: string) => {
    st.proposals.push({ id: Date.now(), part: p.id, partName: p.name, before: partText(p), after, comment, author: 'Вадим · биология', status: 'pending' })
    st.emit()
  }
  const pending = st.proposals.filter(p => p.status === 'pending')
  return (
    <>
      <h2 className="ms__title">Препод: правки модели</h2>
      <p className="ms__sub">Конструктор → База материалов → 3D → карточка модели. Препод не утверждает: двойной клик по справке предлагает новый текст, кнопка «Замечание» оставляет комментарий к части. Всё уходит админу в «Заявки». Клик по строке подсвечивает часть.</p>
      <Window crumb={<>Конструктор · База материалов · 3D · <b>Глазное яблоко по МРТ</b></>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 240px) minmax(0, 1fr)', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Model3DFigure src={src} compact selectedPart={selected} onSelectPart={setSelected} />
            <div className="ms__flow"><span className="ms__status" data-s="review">На согласовании</span><span className="ms__note">· {pending.length} {pending.length === 1 ? 'правка ждёт' : 'правки ждут'} админа</span></div>
            <div className="ms__note">Источник: BodyParts3D, CC BY 4.0. Геометрия не редактируется: только тексты и состав частей, и только через согласование.</div>
            <div className="ms__note">Мои предложения: {st.proposals.length}, принято {st.proposals.filter(p => p.status === 'accepted').length}, отклонено {st.proposals.filter(p => p.status === 'rejected').length}.</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="ms__table">
              <thead><tr><th>Часть</th><th>Справка для ученика · двойной клик — предложить правку</th><th>Замечание</th></tr></thead>
              <tbody>
                {spec?.parts.map(p => {
                  const mine = st.proposals.filter(x => x.part === p.id && x.status === 'pending')
                  return (
                    <tr key={p.id} data-hover="row" aria-selected={selected === p.id} onClick={() => setSelected(prev => (prev === p.id ? null : p.id))}>
                      <td className="name"><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: p.color, marginRight: 8 }} />{p.name}</td>
                      <td className="info" onClick={e => e.stopPropagation()}>
                        <InlineText value={partText(p)} onCommit={v => propose(p, v, '')} />
                        {mine.filter(x => x.after).map(x => <div key={x.id} className="ms__note" style={{ marginTop: 6, color: '#D99A2B' }}>Предложено: «{x.after}» · ждёт админа</div>)}
                      </td>
                      <td onClick={e => e.stopPropagation()} style={{ minWidth: 150 }}>
                        {mine.filter(x => !x.after).map(x => <div key={x.id} className="ms__note" style={{ color: '#D99A2B', marginBottom: 6 }}>{x.comment}</div>)}
                        {commenting === p.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <textarea autoFocus rows={3} value={commentDraft} onChange={e => setCommentDraft(e.target.value)} style={{ width: '100%', font: 'inherit', fontSize: 12.5, color: 'var(--color-text)', background: 'transparent', border: 'none', borderBottom: '1px solid #786AD7', outline: 'none', resize: 'none' }} placeholder="Что не так с частью" />
                            <div className="ms__row"><button type="button" className="ms__btn ms__btn--primary" onClick={() => { if (commentDraft.trim()) propose(p, null, commentDraft.trim()); setCommenting(null); setCommentDraft('') }}>Отправить</button><button type="button" className="ms__btn" onClick={() => setCommenting(null)}>Отмена</button></div>
                          </div>
                        ) : <button type="button" className="ms__btn" onClick={() => { setCommenting(p.id); setCommentDraft('') }}>Замечание</button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Window>
    </>
  )
}

function AdminScreen() {
  const st = useStore()
  const [tab, setTab] = useState<'pending' | 'done'>('pending')
  const [status, setStatus] = useState<'review' | 'ok'>('review')
  const list = st.proposals.filter(p => (tab === 'pending' ? p.status === 'pending' : p.status !== 'pending'))
  const decide = (id: number, status: 'accepted' | 'rejected') => { const p = st.proposals.find(x => x.id === id); if (p) { p.status = status; st.emit() } }
  const pending = st.proposals.filter(p => p.status === 'pending').length
  return (
    <>
      <h2 className="ms__title">Админ: согласование правок</h2>
      <p className="ms__sub">Админка → Заявки → «3D-модели». Очередь предложений от преподов: старый и новый текст рядом, замечания отдельно. «Принять» меняет справку у всех учеников сразу, без релиза. Статус модели админ переключает здесь же.</p>
      <Window crumb={<>Админка · Заявки · <b>3D-модели</b></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="ms__row" style={{ justifyContent: 'space-between' }}>
            <div className="ms__row">
              <button type="button" className="ms__chip" aria-pressed={tab === 'pending'} onClick={() => setTab('pending')}>Ждут решения · {pending}</button>
              <button type="button" className="ms__chip" aria-pressed={tab === 'done'} onClick={() => setTab('done')}>Решённые · {st.proposals.length - pending}</button>
            </div>
            <div className="ms__row">
              <span className="ms__note">Глазное яблоко по МРТ:</span>
              <button type="button" className="ms__chip" aria-pressed={status === 'review'} onClick={() => setStatus('review')}>На согласовании</button>
              <button type="button" className="ms__chip" aria-pressed={status === 'ok'} onClick={() => setStatus('ok')} disabled={pending > 0} style={{ opacity: pending > 0 ? 0.45 : 1 }}>Утверждена</button>
              {pending > 0 && <span className="ms__note">утвердить можно, когда очередь пуста</span>}
            </div>
          </div>
          {list.length === 0 && <div className="ms__note" style={{ padding: 20, textAlign: 'center' }}>Пусто</div>}
          {list.map(p => (
            <div key={p.id} style={{ border: '1px solid var(--color-border-soft)', borderRadius: 14, padding: '12px 14px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 14, background: 'var(--color-bg-2)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                <div className="ms__row" style={{ gap: 10 }}>
                  <b style={{ fontSize: 13.5 }}>Глазное яблоко · {p.partName}</b>
                  <span className="ms__note">{p.author}</span>
                  <span className="ms__status" data-s={p.status === 'pending' ? 'review' : p.status === 'accepted' ? 'ok' : 'draft'}>{p.status === 'pending' ? 'ждёт' : p.status === 'accepted' ? 'принято' : 'отклонено'}</span>
                </div>
                {p.after ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, lineHeight: 1.45 }}>
                    <div><div className="ms__note" style={{ marginBottom: 4 }}>Было</div><div style={{ color: 'var(--color-muted)' }}>{p.before}</div></div>
                    <div><div className="ms__note" style={{ marginBottom: 4 }}>Станет</div><div>{p.after}</div></div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, lineHeight: 1.45 }}><span className="ms__note">Замечание: </span>{p.comment}</div>
                )}
              </div>
              {p.status === 'pending' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button type="button" className="ms__btn ms__btn--primary" onClick={() => decide(p.id, 'accepted')}>{p.after ? 'Принять' : 'Учтено'}</button>
                  <button type="button" className="ms__btn" onClick={() => decide(p.id, 'rejected')}>Отклонить</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Window>
    </>
  )
}

function App() {
  const [screen, go] = useHash()
  const [dark, setDark] = useState(document.documentElement.dataset.theme === 'dark')
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : '' }, [dark])
  return (
    <div className="ms">
      <nav className="ms__nav">
        <h1>3D-модуль · экраны</h1>
        {SCREENS.map(([id, label]) => <a key={id} href={`#${id}`} aria-current={screen === id} onClick={e => { e.preventDefault(); go(id) }}>{label}</a>)}
        <button type="button" className="ms__btn ms__theme" onClick={() => setDark(v => !v)}>{dark ? 'Светлая тема' : 'Тёмная тема'}</button>
      </nav>
      <main className="ms__main">
        {screen === 'find' && <FindScreen />}
        {screen === 'label' && <LabelScreen />}
        {screen === 'library' && <LibraryScreen />}
        {screen === 'editor' && <EditorScreen />}
        {screen === 'review' && <ReviewScreen />}
        {screen === 'admin' && <AdminScreen />}
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
