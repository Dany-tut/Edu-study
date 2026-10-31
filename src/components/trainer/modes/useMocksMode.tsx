// ─────────────────────────────────────────────────────────────────────────────
// Режим «Пробники» — экзамен целиком, под таймером, с баллом
//
// Отдельный режим, а не полка в «Чтении» или «Говорении»: пробник — это не
// материал одного навыка, а все четыре подряд, и измеряет он другое —
// выдержку, тайминг и балл. Живёт только у тех языков, для которых пробники
// написаны (сейчас — английский, IELTS Academic).
//
// Сам экзамен идёт на весь экран (trainer/ielts/MockRunner): витрина здесь
// выбирает, что сдавать, и отвечает на вопрос «успеваю ли я»: цель и дата
// экзамена, уровень по последним попыткам, план на сегодня, динамика.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import {
  ClipboardCheck, Headphones, BookOpen, PenLine, Mic, Play, Trash2, Shuffle, Target, CalendarDays,
  ChevronLeft, ChevronRight, Check, Flame, Minus, Plus,
} from '../../icons/appIcons'
import { useT } from '../../../lib/i18n'
import MockRunner, { newDraft } from '../ielts/MockRunner'
import SpeakOrDie from '../ielts/SpeakOrDie'
import { useAttemptGrades } from '../ielts/MockResults'
import { fmtBand } from '../../../lib/ieltsScore'
import {
  loadHistory, loadDraft, saveDraft, deleteAttempt, sectionBand, attemptOverall, onGrades,
  loadGoal, saveGoal, daysLeft, currentLevel, weakestSection, bandSeries, loadArcade,
  type MockAttempt, type MockDraft, type MockGoal,
} from '../../../lib/ieltsMocks'
import { IELTS_MOCKS, SECTION_ORDER, SECTION_LABEL, mockById, type IeltsSection } from '../../../data/ieltsMocks'
import { RailCard, RailStat, Toolbar, ToolCount, Tile, TileGrid, TileChip, plural } from '../TrainerShell'

const SECTION_ICON: Record<IeltsSection, typeof Mic> = {
  listening: Headphones, reading: BookOpen, writing: PenLine, speaking: Mic,
}

const SECTION_HINT: Record<IeltsSection, string> = {
  listening: '4 части · 40 вопросов · запись один раз',
  reading: '3 текста · 40 вопросов · 60 минут',
  writing: 'Task 1 + Task 2 · 60 минут · оценка моделью',
  speaking: '3 части · 11–14 минут · оценка моделью',
}

/** Языки, у которых пробники есть. */
export const mocksOn = (lang: string) => lang.split('-')[0] === 'en'

const isToday = (ms?: number) => !!ms && new Date(ms).toDateString() === new Date().toDateString()

/** Пробник, где эта часть ещё не сдавалась; все сданы — тот, что сдавали давнее всего. */
function freshMock(history: MockAttempt[], scope: MockAttempt['scope']): string {
  const touched = (id: string) => history.some(a => a.mockId === id && (scope === 'full' ? a.scope === 'full' : !!a.sections[scope as IeltsSection]?.finishedAt))
  const fresh = IELTS_MOCKS.find(m => !touched(m.id))
  if (fresh) return fresh.id
  const lastAt = (id: string) => Math.max(0, ...history.filter(a => a.mockId === id).map(a => a.finishedAt ?? a.startedAt))
  return [...IELTS_MOCKS].sort((a, b) => lastAt(a.id) - lastAt(b.id))[0].id
}

export interface MocksMode {
  on: boolean
  count: number
  subtitle: string
  rail: React.ReactNode
  toolbar: React.ReactNode
  content: React.ReactNode
  /** Слой экзамена или игры — рендерится поверх всего. */
  overlay: React.ReactNode
}

export function useMocksMode({ lang, accent, soft, active }: {
  lang: string
  accent: string
  soft: string
  active: boolean
}): MocksMode {
  const t = useT()
  const on = mocksOn(lang)
  const [history, setHistory] = useState<MockAttempt[]>(() => (on ? loadHistory() : []))
  const [draft, setDraft] = useState<MockDraft | null>(() => (on ? loadDraft() : null))
  const [goal, setGoalState] = useState<MockGoal | null>(() => (on ? loadGoal() : null))
  const [running, setRunning] = useState<MockDraft | null>(null)
  const [arcade, setArcade] = useState(false)
  const [, bump] = useState(0)

  // Оценки приезжают позже попытки — рейл и история перерисовываются сами.
  useEffect(() => onGrades(() => bump(n => n + 1)), [])

  const refresh = () => { setHistory(loadHistory()); setDraft(loadDraft()) }
  const setGoal = (g: MockGoal | null) => { saveGoal(g); setGoalState(g) }

  const start = (mockId: string, scope: MockAttempt['scope']) => {
    const mock = mockById(mockId)
    if (!mock) return
    // Новый пробник поверх недосданного: старый черновик уходит. Спрашивать
    // незачем — плитка «Продолжить» стоит первой и видна до клика.
    const d = newDraft(mock, scope)
    saveDraft(d)
    setRunning(d)
  }

  const level = useMemo(() => currentLevel(history), [history])
  const total = IELTS_MOCKS.length

  const rail = !active || !on ? null : (
    <RailCard title="Мой балл" accent={accent} icon={<ClipboardCheck size={16} />}>
      {SECTION_ORDER.map(s => (
        <RailStat key={s} label={SECTION_LABEL[s]} value={fmtBand(level.bands[s])} />
      ))}
      <RailStat label="Итог" value={fmtBand(level.overall)} tone={goal && level.overall != null && level.overall >= goal.target ? 'good' : undefined} />
      <RailStat label="Попыток" value={history.length} />
    </RailCard>
  )

  const toolbar = !active || !on ? null : (
    <Toolbar>
      <ToolCount>
        {total} {t(plural(total, ['пробник', 'пробника', 'пробников']))} · {history.length} {t(plural(history.length, ['попытка', 'попытки', 'попыток']))}
      </ToolCount>
    </Toolbar>
  )

  const draftMock = draft ? mockById(draft.attempt.mockId) : undefined
  const weakest = weakestSection(level.bands)

  const content = !active || !on ? null : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
        <GoalCard goal={goal} onGoal={setGoal} level={level.overall} accent={accent} soft={soft} />
        <PlanCard
          history={history}
          goal={goal}
          weakest={weakest}
          accent={accent}
          soft={soft}
          onPractice={s => start(freshMock(history, s), s)}
          onFull={() => start(freshMock(history, 'full'), 'full')}
          onArcade={() => setArcade(true)}
        />
      </div>

      {draft && draftMock && (
        <TileGrid min={260}>
          <Tile accent={accent} tint={{ surface: `${accent}14`, border: `${accent}4d` }} onClick={() => setRunning(draft)}>
            <TileChip tone="solid" accent={accent} soft={soft}>{t('Не досдан')}</TileChip>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
              <Play size={16} style={{ color: accent }} /> {t('Продолжить')}: {t(draftMock.title)}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.45 }}>
              {t('Сейчас')}: {SECTION_LABEL[draft.section]}
              {draft.paused ? ` · ${t('на паузе')}` : draft.deadline ? ` · ${t('таймер секции идёт')}` : ''}
            </span>
          </Tile>
        </TileGrid>
      )}

      {history.some(a => a.finishedAt) && <TrendCard history={history} accent={accent} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)', flex: 1 }}>{t('Пробники')}</div>
        {/* Случайный — сначала непройденный: повтор уже решённого пробника
            измеряет память на ответы, а не уровень. */}
        <button type="button" onClick={() => start(freshMock(history, 'full'), 'full')} style={pillBtn(accent)}>
          <Shuffle size={14} /> {t('Случайный непройденный')}
        </button>
      </div>

      {IELTS_MOCKS.map(m => {
        const fullDone = history.find(a => a.mockId === m.id && a.scope === 'full' && a.finishedAt)
        return (
          <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>
                {t(m.title)}
                {fullDone && <TileChip>{t('пройден')}</TileChip>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-3)', lineHeight: 1.45 }}>{t(m.about)}</div>
            </div>
            <TileGrid min={190}>
              <Tile accent={accent} stack onClick={() => start(m.id, 'full')}>
                <TileChip tone="accent" accent={accent} soft={soft}>{t('Весь экзамен')}</TileChip>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{t('Полный пробник')}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.45 }}>
                  {t('Четыре секции подряд, около 2 ч 45 мин. Итоговый балл — как на экзамене.')}
                </span>
              </Tile>
              {SECTION_ORDER.map(s => {
                const Icon = SECTION_ICON[s]
                const done = history.some(a => a.mockId === m.id && a.sections[s]?.finishedAt)
                return (
                  <Tile key={s} accent={accent} onClick={() => start(m.id, s)}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TileChip>{t('Одна секция')}</TileChip>
                      {done && <Check size={14} style={{ color: 'var(--color-green-text)' }} />}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
                      <Icon size={15} style={{ color: accent }} /> {SECTION_LABEL[s]}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.45 }}>{t(SECTION_HINT[s])}</span>
                  </Tile>
                )
              })}
            </TileGrid>
          </div>
        )
      })}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)' }}>{t('Аркада')}</div>
        <TileGrid min={260}>
          <Tile accent={accent} tint={{ surface: '#1d1b2e', border: '#2e2a4a' }} onClick={() => setArcade(true)}>
            <TileChip tone="solid" accent={accent} soft={soft}>Speaking</TileChip>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Speak or Die</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.45 }}>
              {t('Минута речи на случайную тему. Замолчал — проиграл. Тренирует беглость — четверть балла Speaking.')}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              {t('рекорд')}: {loadArcade().best} {t('слов')}
            </span>
          </Tile>
        </TileGrid>
      </div>

      {history.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)' }}>{t('История')}</div>
          {history.map(a => (
            <HistoryRow key={a.id} a={a} accent={accent}
              onOpen={() => setRunning({ attempt: a, section: 'listening', step: 0, deadline: null })}
              onDelete={() => { deleteAttempt(a.id); refresh() }} />
          ))}
        </div>
      )}

      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-3)' }}>
        {t('IELTS — торговая марка British Council, IDP и Cambridge. Пробники написаны с нуля и не являются официальными материалами.')}
      </p>
    </div>
  )

  const runningMock = running ? mockById(running.attempt.mockId) : undefined
  const overlay = running && runningMock ? (
    <MockRunner
      key={running.attempt.id}
      mock={runningMock}
      draft={running}
      accent={accent}
      soft={soft}
      onClose={() => { setRunning(null); refresh() }}
    />
  ) : arcade ? (
    <SpeakOrDie accent={accent} soft={soft} onClose={() => { setArcade(false); bump(n => n + 1) }} />
  ) : null

  return {
    on,
    count: total,
    subtitle: level.overall != null
      ? `${t('уровень')} ${fmtBand(level.overall)}${goal ? ` · ${t('цель')} ${fmtBand(goal.target)}` : ''}`
      : `${total} ${t(plural(total, ['пробник', 'пробника', 'пробников']))}`,
    rail,
    toolbar,
    content,
    overlay,
  }
}

const pillBtn = (accent: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 999,
  border: `1.5px solid ${accent}`, background: 'transparent', color: accent, fontWeight: 700,
  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
})

const cardStyle: React.CSSProperties = {
  padding: '16px 18px', borderRadius: 20, background: 'var(--color-bg-2)',
  border: '1px solid var(--color-border-soft)', display: 'flex', flexDirection: 'column', gap: 12,
}

// ─── Цель ────────────────────────────────────────────────────────────────────

/**
 * Цель, дата и честный вердикт. Вердикт опирается на один ориентир, который
 * повторяют все подготовительные школы: при регулярной подготовке балл растёт
 * примерно на 0.5 за шесть–восемь недель. Это не обещание, а порядок величины —
 * так и подписано.
 */
function GoalCard({ goal, onGoal, level, accent, soft }: {
  goal: MockGoal | null
  onGoal: (g: MockGoal | null) => void
  level: number | null
  accent: string
  soft: string
}) {
  const t = useT()
  const [cal, setCal] = useState(false)
  const target = goal?.target ?? 7
  const days = daysLeft(goal)
  const set = (p: Partial<MockGoal>) => onGoal({ target, ...goal, ...p })

  const verdict = (() => {
    if (level == null) return t('Пройдите полный пробник — от него считается уровень.')
    if (level >= target) return t('Цель уже по силам. Держите форму: пробник раз в неделю.')
    const gap = target - level
    if (days == null) return `${t('До цели')} +${gap.toFixed(1)}. ${t('Поставьте дату экзамена — посчитаем, успеваете ли.')}`
    if (days <= 0) return t('Дата экзамена прошла — поставьте новую.')
    const reachable = (days / 49) * 0.5
    if (reachable >= gap) return `${t('Успеваете')}: +${gap.toFixed(1)} ${t('за')} ${days} ${t(plural(days, ['день', 'дня', 'дней']))} ${t('при регулярной подготовке.')}`
    if (reachable >= gap - 0.5) return `${t('Впритык')}: +${gap.toFixed(1)} ${t('за')} ${days} ${t(plural(days, ['день', 'дня', 'дней']))}. ${t('Нужна ежедневная работа над слабой секцией.')}`
    return `${t('Времени мало')}: +${gap.toFixed(1)} ${t('за')} ${days} ${t(plural(days, ['день', 'дня', 'дней']))} — ${t('это быстрее обычного темпа. Подумайте о более поздней дате.')}`
  })()

  const pct = level == null ? 0 : Math.min(1, level / 9)

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: 'var(--color-text-2)' }}>
        <Target size={16} style={{ color: accent }} /> {t('Цель')}
        {days != null && days > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 800, color: accent }}>
            {t('до экзамена')} {days} {t(plural(days, ['день', 'дня', 'дней']))}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 700 }}>{t('сейчас')}</div>
          <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, color: 'var(--color-text)' }}>{fmtBand(level)}</div>
        </div>
        {/* Шкала 0–9: где я и где цель — одним взглядом. */}
        <div style={{ flex: 1, paddingBottom: 8, position: 'relative' }}>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--color-bg-3)', overflow: 'hidden' }}>
            <div style={{ width: `${pct * 100}%`, height: '100%', background: accent }} />
          </div>
          <div style={{
            position: 'absolute', left: `${(target / 9) * 100}%`, bottom: 4, width: 3, height: 16, borderRadius: 2,
            background: 'var(--color-text)', transform: 'translateX(-50%)',
          }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 700 }}>{t('цель')}</div>
          {/* Степпер — одна капсула: 34 = 3 + круг 28 + 3, число постоянной ширины. */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, height: 34, padding: 4, borderRadius: 999, background: 'var(--color-bg-3)' }}>
            <button type="button" onClick={() => set({ target: Math.max(4, target - 0.5) })} style={stepBtn} aria-label={t('Ниже')}><Minus size={14} /></button>
            <span style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, color: accent, minWidth: 48, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{fmtBand(target)}</span>
            <button type="button" onClick={() => set({ target: Math.min(9, target + 0.5) })} style={stepBtn} aria-label={t('Выше')}><Plus size={14} /></button>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text)' }}>{verdict}</div>

      <div style={{ position: 'relative' }}>
        <button type="button" onClick={() => setCal(v => !v)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 999,
          border: 'none', background: 'var(--color-bg-3)', color: 'var(--color-text)', fontWeight: 700, fontSize: 13,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <CalendarDays size={14} />
          {goal?.date
            ? new Date(`${goal.date}T00:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
            : t('Дата экзамена')}
        </button>
        {cal && (
          <MiniCalendar
            value={goal?.date}
            accent={accent}
            soft={soft}
            onPick={v => { set({ date: v }); setCal(false) }}
            onClear={goal?.date ? () => { set({ date: undefined }); setCal(false) } : undefined}
          />
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-text-3)', lineHeight: 1.4 }}>
        {t('Ориентир: +0.5 балла за 6–8 недель регулярной подготовки. Уровень — по последним попыткам каждой секции.')}
      </div>
    </div>
  )
}

const stepBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'var(--color-surface)', color: 'var(--color-text)',
  boxShadow: 'var(--shadow-1)', padding: 0,
  cursor: 'pointer', display: 'grid', placeItems: 'center',
}

/** Месяц сеткой. Свой, а не нативный input[type=date]: тот рисует система. */
function MiniCalendar({ value, accent, soft, onPick, onClear }: {
  value?: string
  accent: string
  soft: string
  onPick: (v: string) => void
  onClear?: () => void
}) {
  const t = useT()
  const base = value ? new Date(`${value}T00:00:00`) : new Date()
  const [y, setY] = useState(base.getFullYear())
  const [m, setM] = useState(base.getMonth())
  const first = new Date(y, m, 1)
  const lead = (first.getDay() + 6) % 7
  const n = new Date(y, m + 1, 0).getDate()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const iso = (d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const shift = (k: number) => { const d = new Date(y, m + k, 1); setY(d.getFullYear()); setM(d.getMonth()) }

  return (
    <div style={{
      position: 'absolute', top: 38, left: 0, zIndex: 20, width: 252, padding: 12, borderRadius: 16,
      background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', boxShadow: 'var(--shadow-4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <button type="button" onClick={() => shift(-1)} style={stepBtn}><ChevronLeft size={14} /></button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>
          {first.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
        </span>
        <button type="button" onClick={() => shift(1)} style={stepBtn}><ChevronRight size={14} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
          <span key={d} style={{ fontSize: 11, textAlign: 'center', color: 'var(--color-text-3)', fontWeight: 700 }}>{t(d)}</span>
        ))}
        {Array.from({ length: lead }, (_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: n }, (_, i) => {
          const d = i + 1
          const on = value === iso(d)
          const past = new Date(y, m, d) < today
          return (
            <button key={d} type="button" disabled={past} onClick={() => onPick(iso(d))} style={{
              height: 30, borderRadius: 8, border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: on ? 800 : 600,
              cursor: past ? 'default' : 'pointer', opacity: past ? 0.35 : 1,
              background: on ? accent : 'transparent', color: on ? '#fff' : 'var(--color-text)',
            }}>{d}</button>
          )
        })}
      </div>
      {onClear && (
        <button type="button" onClick={onClear} style={{
          marginTop: 8, border: 'none', background: 'transparent', color: 'var(--color-text-2)', fontSize: 12,
          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0,
        }}>{t('Убрать дату')}</button>
      )}
    </div>
  )
}

// ─── План на сегодня ─────────────────────────────────────────────────────────

/**
 * Три пункта, а не расписание. Решение «что делать сегодня» — то, на чём
 * подготовка останавливается чаще всего; план снимает его, но не превращает
 * день в обязаловку на два часа. Первый пункт — всегда самая слабая секция:
 * балл держит худшая, а не средняя.
 */
function PlanCard({ history, goal, weakest, accent, soft, onPractice, onFull, onArcade }: {
  history: MockAttempt[]
  goal: MockGoal | null
  weakest: IeltsSection | null
  accent: string
  soft: string
  onPractice: (s: IeltsSection) => void
  onFull: () => void
  onArcade: () => void
}) {
  const t = useT()
  const focus = weakest ?? 'listening'
  const days = daysLeft(goal)
  const lastFull = Math.max(0, ...history.filter(a => a.scope === 'full' && a.finishedAt).map(a => a.finishedAt!))
  const fullDue = !lastFull || Date.now() - lastFull > 7 * 86_400_000

  const items = [
    {
      title: `${t('Практика')}: ${SECTION_LABEL[focus]}`,
      sub: weakest ? t('самая слабая секция — она держит балл') : t('начните с первой секции экзамена'),
      done: history.some(a => isToday(a.finishedAt) && a.sections[focus]?.finishedAt),
      go: () => onPractice(focus),
    },
    {
      title: 'Speak or Die · 1 ' + t('мин'),
      sub: t('беглость без пауз'),
      done: isToday(loadArcade().last),
      go: onArcade,
    },
    ...(fullDue || (days != null && days <= 14) ? [{
      title: t('Полный пробник'),
      sub: !lastFull ? t('первый замер уровня') : t('раз в неделю — проверить, растёт ли балл'),
      done: isToday(lastFull),
      go: onFull,
    }] : []),
  ]
  const doneN = items.filter(x => x.done).length

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: 'var(--color-text-2)' }}>
        <Flame size={16} style={{ color: accent }} /> {t('План на сегодня')}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: doneN === items.length ? 'var(--color-green-text)' : 'var(--color-text-3)' }}>
          {doneN}/{items.length}
        </span>
      </div>
      {items.map((x, i) => (
        <button key={i} type="button" onClick={x.go} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14, textAlign: 'left',
          border: '1px solid var(--color-border-soft)', background: x.done ? soft : 'var(--color-bg)',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <span style={{
            width: 24, height: 24, borderRadius: 8, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: x.done ? accent : 'var(--color-bg-3)', color: x.done ? '#fff' : 'var(--color-text-2)', fontSize: 12, fontWeight: 800,
          }}>
            {x.done ? <Check size={14} /> : i + 1}
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{x.title}</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{x.sub}</span>
          </span>
          <Play size={14} style={{ color: accent, flexShrink: 0 }} />
        </button>
      ))}
    </div>
  )
}

// ─── Динамика ────────────────────────────────────────────────────────────────

/** Мини-график по каждой секции: одно число — «где я», ряд — «двигаюсь ли». */
function TrendCard({ history, accent }: { history: MockAttempt[]; accent: string }) {
  const t = useT()
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-2)' }}>{t('Динамика по секциям')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        {SECTION_ORDER.map(s => {
          const series = bandSeries(history, s)
          const last = series[series.length - 1]
          const delta = series.length > 1 ? last - series[0] : null
          return (
            <div key={s}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)', flex: 1 }}>{SECTION_LABEL[s]}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)' }}>{fmtBand(last)}</span>
                {delta != null && delta !== 0 && (
                  <span style={{ fontSize: 12, fontWeight: 800, color: delta > 0 ? 'var(--color-green-text)' : 'var(--color-red-text)' }}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                  </span>
                )}
              </div>
              <Spark values={series} accent={accent} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Spark({ values, accent }: { values: number[]; accent: string }) {
  const w = 160, h = 36, pad = 4
  if (values.length === 0) {
    return <div style={{ height: h, display: 'flex', alignItems: 'center', fontSize: 12, color: 'var(--color-text-3)' }}>—</div>
  }
  const lo = Math.min(...values, 4), hi = Math.max(...values, 9)
  const x = (i: number) => values.length === 1 ? w / 2 : pad + (i * (w - pad * 2)) / (values.length - 1)
  const y = (v: number) => h - pad - ((v - lo) / (hi - lo || 1)) * (h - pad * 2)
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: 'block' }} aria-hidden>
      <path d={d} fill="none" stroke={accent} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill={accent} />)}
    </svg>
  )
}

// ─── История ─────────────────────────────────────────────────────────────────

function HistoryRow({ a, accent, onOpen, onDelete }: {
  a: MockAttempt
  accent: string
  onOpen: () => void
  onDelete: () => void
}) {
  const t = useT()
  const g = useAttemptGrades(a.id)
  const mock = mockById(a.mockId)
  const overall = attemptOverall(a, g)
  const sections = SECTION_ORDER.filter(s => a.sections[s]?.finishedAt)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 14, flexWrap: 'wrap',
      background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
    }}>
      <button type="button" onClick={onOpen} style={{
        flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', minWidth: 120 }}>
          {mock ? t(mock.title) : a.mockId} · {a.scope === 'full' ? t('полный') : SECTION_LABEL[a.scope]}
        </span>
        <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
          {new Date(a.finishedAt ?? a.startedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </span>
        <span style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--color-text-2)', flex: 1 }}>
          {sections.map(s => (
            <span key={s}>{SECTION_LABEL[s][0]} <b style={{ color: 'var(--color-text)' }}>{fmtBand(sectionBand(a, s, g))}</b></span>
          ))}
        </span>
        {overall != null && <span style={{ fontSize: 16, fontWeight: 800, color: accent }}>{fmtBand(overall)}</span>}
      </button>
      <button type="button" onClick={onDelete} title={t('Удалить попытку')} style={{
        border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-3)', padding: 4, display: 'inline-flex',
      }}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}
