import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Segmented from '../Segmented'
import HScrollFade from '../HScrollFade'
import GrowTextarea from '../GrowTextarea'
import FadeText from '../FadeText'
import { CheckboxMark } from '../Checkbox'
import { Alert } from '../Alert'
import { Check, Lock, Play, Quote, RefreshCw, Sparkles } from '../icons/appIcons'
import { btn } from '../../lib/pillStyles'
import { useScrollFades } from '../../lib/useScrollFades'
import { clock, type MontageLine, type MontageSpeaker } from '../../lib/lessonMontage'
import {
  NOTE_KIND_LABEL, RECAP_KINDS, RECAP_KIND_LABEL, restoreNames,
  type RecapDraft, type RecapKind, type RecapRow,
} from '../../lib/lessonRecap'

// Панель «Итоги урока» в окне монтажа (концепт B, 07.11.2026). Черновик
// проверяется рядом с источником: нажал на пункт — слева подсветились реплики,
// из которых он сделан, и плеер встал на это место. Текст правится прямо по
// месту, галочка исключает пункт. Ученик ничего не видит, пока учитель не
// нажал «Применить к уроку».

/** Что панели нужно от владельца урока: черновик, сборка, сохранение, раскладка. */
export interface RecapControl {
  row: RecapRow | null
  /** Идёт сборка: всё целиком ('all') или один раздел. */
  busy: 'all' | RecapKind | null
  /** Пока читаем прошлый черновик — кнопки сборки нет. */
  loading?: boolean
  error: string
  build: (kinds: RecapKind[]) => void
  rebuild: (kind: RecapKind) => void
  /** Правка черновика: панель зовёт на каждое изменение, сохранение — с задержкой. */
  save: (draft: RecapDraft) => void
  apply: (draft: RecapDraft) => Promise<boolean>
  dismissError: () => void
  /** «≈ 10 ₽ · около 40 секунд». */
  costNote: string
}

const SECONDS = 40

export function RecapPanel({ control, picked, onPick, onClose }: {
  control: RecapControl
  picked?: string
  onPick: (id: string, at: number[]) => void
  onClose: () => void
}) {
  const { row, busy, error } = control
  const [draft, setDraft] = useState<RecapDraft | null>(row?.draft ?? null)
  // Новый черновик с сервера (сборка, пересборка) — заменяет локальный.
  const rowId = row?.id
  useEffect(() => { setDraft(row?.draft ?? null) }, [rowId, row?.draft])
  const [tab, setTab] = useState<RecapKind>('summary')
  const [applying, setApplying] = useState(false)
  // Что собираем сейчас — ожидание показывает только выбранные виды.
  const [building, setBuilding] = useState<RecapKind[]>(RECAP_KINDS)
  // Корень панели один во всех состояниях: хук фейдов следит за ним и сам
  // находит список, когда тот появляется вместе с черновиком.
  const rootRef = useRef<HTMLDivElement>(null)
  useScrollFades(rootRef, true, '.rp-body')
  const change = (next: RecapDraft) => { setDraft(next); control.save(next) }
  const kinds = useMemo(() => RECAP_KINDS.filter(k => k === 'hw' ? !!draft?.hw : !!draft?.[k]), [draft])
  const count = (k: RecapKind) => k === 'hw' ? draft?.hw?.tasks.filter(x => !x.off).length ?? 0 : (draft?.[k] as Array<{ off?: boolean }> | undefined)?.filter(x => !x.off).length ?? 0
  useEffect(() => { if (kinds.length && !kinds.includes(tab)) setTab(kinds[0]) }, [kinds, tab])

  const head = <header className="rp-head">
    <span className="rp-mark"><Sparkles size={18} /></span>
    <div className="rp-head-text"><strong>Итоги урока</strong>
      <small>{busy === 'all' ? `Читаем расшифровку · около ${SECONDS} секунд` : draft ? (row?.status === 'published' ? 'Применено к уроку · правки войдут после «Применить снова»' : 'Черновик · ученик не видит · правка прямо по тексту') : 'Из сохранённой расшифровки'}</small></div>
    <button type="button" className="rp-close" onClick={onClose}>К монтажу</button>
  </header>

  if (busy === 'all') return <div className="rp" ref={rootRef}>{head}<Progress kinds={building} /></div>
  if (!draft) return <div className="rp" ref={rootRef}>{head}
    {error && <Alert tone="danger" stacked title="Итоги не собрались" text={error} onClose={control.dismissError} />}
    <Intro control={control} initial={building} onBuild={kinds => { setBuilding(kinds); control.build(kinds) }} />
  </div>

  const pickProps = (id: string, at: number[]) => ({
    className: 'rp-item' + (picked === id ? ' is-picked' : ''),
    onClick: (e: React.MouseEvent) => { if (!(e.target as HTMLElement).closest('textarea, button')) onPick(id, at) },
    onFocus: () => onPick(id, at),
  })
  const edited = <T extends { id: string }>(list: T[], id: string, patch: Partial<T>) => list.map(x => x.id === id ? { ...x, ...patch, edited: true } : x)
  const toggle = (k: Exclude<RecapKind, 'hw'>, id: string) => change({ ...draft, [k]: (draft[k] as Array<{ id: string; off?: boolean }>).map(x => x.id === id ? { ...x, off: !x.off } : x) })
  const box = (off: boolean | undefined, onToggle: () => void, label: string) =>
    <button type="button" className="rp-check" role="checkbox" aria-checked={!off} aria-label={(off ? 'Вернуть: ' : 'Не публиковать: ') + label} onClick={onToggle}>
      <CheckboxMark checked={!off} size={18} />
    </button>
  const times = (at: number[]) => <span className="rp-times">{at.slice(0, 3).map(t => <span key={t} className="rp-tc"><Play size={10} />{clock(t)}</span>)}</span>
  const field = (value: string, onChange: (v: string) => void, label: string, cls = '') =>
    // Инлайн-фон transparent: общее правило фокуса (index.css) тогда не рисует
    // рамку по периметру — у правки на месте только подчёркивание.
    <GrowTextarea className={'rp-edit ' + cls} value={value} aria-label={label} rows={1} onChange={onChange} style={{ background: 'transparent' }} />

  const sectionEdited = (k: RecapKind) => k === 'hw' ? draft.hw?.tasks.some(x => x.edited) : (draft[k] as Array<{ edited?: boolean }> | undefined)?.some(x => x.edited)
  const rebuild = () => {
    if (sectionEdited(tab) && !window.confirm(`В разделе «${RECAP_KIND_LABEL[tab]}» есть ваши правки. Пересобрать его заново?`)) return
    control.rebuild(tab)
  }

  return <div className="rp" ref={rootRef}>
    {head}
    <HScrollFade fade="var(--color-bg-2)" padBottom={2}>
      <Segmented variant="mode" value={tab} onChange={setTab} items={kinds.map(k => ({ id: k, title: RECAP_KIND_LABEL[k], label: <>{RECAP_KIND_LABEL[k]} <small className="lm-count">{count(k)}</small></> }))} />
    </HScrollFade>
    {error && <Alert tone="danger" stacked title="Раздел не пересобрался" text={error} onClose={control.dismissError} />}
    <div className="rp-body no-scrollbar" aria-busy={busy === tab}>
      {busy === tab ? <Progress kinds={[tab]} one /> : <div className="rp-list">
        {tab === 'summary' && draft.summary?.map(s => <article key={s.id} {...pickProps(s.id, s.at)} data-off={s.off || undefined}>
          {box(s.off, () => toggle('summary', s.id), s.title)}
          <div className="rp-item-body">
            {field(s.title, v => change({ ...draft, summary: edited(draft.summary!, s.id, { title: v }) }), 'Заголовок абзаца', 'is-title')}
            {field(s.text, v => change({ ...draft, summary: edited(draft.summary!, s.id, { text: v }) }), 'Текст абзаца')}
            {times(s.at)}
          </div>
        </article>)}
        {tab === 'questions' && draft.questions?.map(q => <article key={q.id} {...pickProps(q.id, q.at)} data-off={q.off || undefined}>
          {box(q.off, () => toggle('questions', q.id), q.q)}
          <div className="rp-item-body">
            {field(q.q, v => change({ ...draft, questions: edited(draft.questions!, q.id, { q: v }) }), 'Вопрос', 'is-title')}
            <div className="rp-answer"><Check size={13} />{field(q.answer, v => change({ ...draft, questions: edited(draft.questions!, q.id, { answer: v }) }), 'Ответ')}</div>
            {q.options && <div className="rp-opts">{q.options.map((o, i) => <span key={i} className={'rp-opt' + (o === q.answer ? ' is-right' : '')}>{o}</span>)}</div>}
            <div className="rp-meta"><span className="rp-pill">{q.kind === 'choice' ? 'выбор' : 'короткий ответ'}</span>{times(q.at)}</div>
          </div>
        </article>)}
        {tab === 'cards' && draft.cards?.map(c => <article key={c.id} {...pickProps(c.id, c.at)} data-off={c.off || undefined}>
          {box(c.off, () => toggle('cards', c.id), c.term)}
          <div className="rp-item-body rp-card">
            {field(c.term, v => change({ ...draft, cards: edited(draft.cards!, c.id, { term: v }) }), 'Термин', 'is-title')}
            {field(c.meaning, v => change({ ...draft, cards: edited(draft.cards!, c.id, { meaning: v }) }), 'Значение')}
            {times(c.at)}
          </div>
        </article>)}
        {tab === 'hw' && draft.hw && <>
          {field(draft.hw.title, v => change({ ...draft, hw: { ...draft.hw!, title: v } }), 'Название домашки', 'is-hw-title')}
          {draft.hw.tasks.map((h, i) => <article key={h.id} {...pickProps(h.id, h.at)} data-off={h.off || undefined}>
            {box(h.off, () => change({ ...draft, hw: { ...draft.hw!, tasks: draft.hw!.tasks.map(x => x.id === h.id ? { ...x, off: !x.off } : x) } }), h.question)}
            <div className="rp-item-body">
              <small className="rp-kicker">Задание {i + 1} · {h.type === 'single' ? 'выбор ответа' : h.type === 'fill' ? 'короткий ответ' : 'развёрнутый ответ'}</small>
              {field(h.question, v => change({ ...draft, hw: { ...draft.hw!, tasks: edited(draft.hw!.tasks, h.id, { question: v }) } }), 'Условие задания', 'is-title')}
              {h.type === 'single' && h.options && <div className="rp-opts">{h.options.map((o, k) => <span key={k} className={'rp-opt' + (k === h.correct ? ' is-right' : '')}>{o}</span>)}</div>}
              {h.answer && <div className="rp-answer"><Check size={13} />{field(h.answer, v => change({ ...draft, hw: { ...draft.hw!, tasks: edited(draft.hw!.tasks, h.id, { answer: v }) } }), 'Ответ')}</div>}
              {times(h.at)}
            </div>
          </article>)}
        </>}
        {tab === 'note' && <>
          <p className="rp-lead"><Lock size={13} />Видите только вы. В урок и ученикам не попадает.</p>
          {draft.note?.map(n => <article key={n.id} {...pickProps(n.id, n.at)} data-off={n.off || undefined}>
            {box(n.off, () => toggle('note', n.id), n.text)}
            <div className="rp-item-body">
              <small className={'rp-kicker is-' + n.kind}>{NOTE_KIND_LABEL[n.kind]}{n.count ? ` · ${n.count} раза` : ''}</small>
              {field(restoreNames(n.text, draft.aliases), v => change({ ...draft, note: edited(draft.note!, n.id, { text: v }) }), 'Пункт заметки')}
              {times(n.at)}
            </div>
          </article>)}
        </>}
        {count(tab) === 0 && !(tab === 'hw' && draft.hw?.tasks.length) && !(draft[tab as Exclude<RecapKind, 'hw'>] as unknown[] | undefined)?.length &&
          <p className="rp-lead">В расшифровке не нашлось материала для этого раздела.</p>}
      </div>}
    </div>
    <div className="rp-foot">
      <button type="button" className="rp-rebuild" style={btn('S', 'secondary')} disabled={!!busy} onClick={rebuild} title="Собрать этот раздел заново" aria-label="Пересобрать раздел"><RefreshCw size={14} /><span className="rp-rebuild-label">Пересобрать</span></button>
      <span className="rp-foot-hint" />
      <button type="button" className="rp-apply" style={btn('M', 'primary')} disabled={applying || !!busy}
        onClick={async () => { setApplying(true); try { await control.apply(draft) } finally { setApplying(false) } }}>
        <Check size={15} />{applying ? 'Раскладываем…' : row?.status === 'published' ? 'Применить снова' : 'Применить к уроку'}
      </button>
    </div>
  </div>
}

function Intro({ control, initial, onBuild }: { control: RecapControl; initial: RecapKind[]; onBuild: (kinds: RecapKind[]) => void }) {
  // После ошибки выбор не сбрасывается: повторить можно тем же набором.
  const [kinds, setKinds] = useState<RecapKind[]>(initial)
  const flip = (k: RecapKind) => setKinds(list => list.includes(k) ? list.filter(x => x !== k) : RECAP_KINDS.filter(x => x === k || list.includes(x)))
  return <div className="rp-intro">
    <p className="rp-lead">Конспект, вопросы на проверку, карточки, черновик ДЗ и заметка для вас. Ученик ничего не увидит, пока вы не примените итоги к уроку.</p>
    <div className="rp-kinds" role="group" aria-label="Что собрать">{RECAP_KINDS.map(k => <button key={k} type="button" role="checkbox" aria-checked={kinds.includes(k)}
      className={'rp-kind' + (kinds.includes(k) ? ' is-on' : '')} onClick={() => flip(k)}>
      <CheckboxMark checked={kinds.includes(k)} size={16} />{RECAP_KIND_LABEL[k]}{k === 'note' && <Lock size={12} />}
    </button>)}</div>
    <div className="rp-intro-foot">
      <small>{control.costNote}</small>
      <button type="button" style={btn('M', 'primary')} disabled={!kinds.length || control.loading} onClick={() => onBuild(kinds)}><Sparkles size={15} />Собрать итоги</button>
    </div>
  </div>
}

/** Ожидание: счётчик секунд — setInterval, не rAF (в превью и PWA rAF приходит не всегда). */
function Progress({ kinds, one }: { kinds: RecapKind[]; one?: boolean }) {
  const [s, setS] = useState(0)
  useEffect(() => { const id = setInterval(() => setS(x => x + 1), 1000); return () => clearInterval(id) }, [])
  const list = kinds.map(k => RECAP_KIND_LABEL[k])
  return <div className="rp-progress" role="status" aria-live="polite">
    {list.map((label, i) => <div key={label} className="rp-progress-row" style={{ '--i': i } as CSSProperties}>
      <span>{label}</span><i className="rp-bar"><b /></i>
    </div>)}
    <small>{s < SECONDS ? `${s} с из ~${one ? Math.round(SECONDS / 2) : SECONDS}` : `${s} с · ещё немного`}. Можно продолжать монтаж — итоги соберутся по сохранённой расшифровке.</small>
  </div>
}

/** Реплики-источники слева: подсвечены те, из которых сделан выбранный пункт. */
export function RecapSources({ lines, speakers, at, onListen }: {
  lines: MontageLine[]; speakers: MontageSpeaker[]; at?: number[]; onListen: (t: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useScrollFades(ref, true, '.rp-src-body')
  const hit = (l: MontageLine) => !!at?.some(t => Math.abs(l.start - t) < 0.6)
  const first = at?.length ? lines.find(hit) : undefined
  // Выбрали пункт — первая реплика-источник встаёт в видимую часть списка
  // (только сам список, не окно: scrollIntoView потянул бы рамку модалки).
  useEffect(() => {
    const box = ref.current?.querySelector<HTMLElement>('.rp-src-body')
    const row = box?.querySelector<HTMLElement>('.rp-line.is-hit')
    if (!box || !row) return
    const r = row.getBoundingClientRect(), b = box.getBoundingClientRect()
    box.scrollTo({ top: box.scrollTop + r.top - b.top - 24, behavior: 'smooth' })
  }, [first?.id])
  return <section className="rp-src" ref={ref} aria-label="Расшифровка">
    <header><strong>Расшифровка</strong><small>{at?.length ? 'Подсвечено, откуда взят пункт' : 'Нажмите на пункт справа — подсветится его источник'}</small></header>
    <div className="rp-src-body no-scrollbar">{lines.map(l => {
      const sp = speakers.find(s => s.id === l.speaker)
      return <div key={l.id} className={'rp-line' + (hit(l) ? ' is-hit' : '')}>
        <button type="button" className="lm-time-btn" aria-label={'Слушать с ' + clock(l.start)} onClick={() => onListen(l.start)}><Play size={12} />{clock(l.start)}</button>
        <div><FadeText className="rp-line-who" style={{ color: sp?.role === 'teacher' ? 'var(--color-purple-text)' : 'var(--color-teal-pill-text)' }}>{sp?.label ?? 'Реплика'}</FadeText>{l.text}</div>
      </div>
    })}</div>
  </section>
}

/** Цитата источника — на телефоне вместо списка слева. */
export function RecapQuote({ lines, speakers, at }: { lines: MontageLine[]; speakers: MontageSpeaker[]; at?: number[] }) {
  const hits = at?.length ? lines.filter(l => at.some(t => Math.abs(l.start - t) < 0.6)).slice(0, 2) : []
  // Высота постоянная (три строки, хвост — фейдом): цитата меняется при выборе
  // пункта и не должна сдвигать панель под собой.
  return <div className="rp-quote"><Quote size={15} />
    <FadeText lines={3} className="rp-quote-text">{hits.length
      ? hits.map(l => <span key={l.id}><b>{clock(l.start)} · {speakers.find(s => s.id === l.speaker)?.label ?? 'Реплика'}:</b> {l.text} </span>)
      : 'Нажмите на пункт — здесь появится место в расшифровке, откуда он взят.'}</FadeText>
  </div>
}
