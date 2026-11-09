import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { Lesson, Subject } from '../../data/mockData'
import { lessonStatusLabel } from '../../lib/lessonStatus'
import { useGlassBar, type GlassBar } from '../../lib/nativeGlass'
import {
  DEFAULT_HOMEWORK_FILTERS, HOMEWORK_SHOW_OPTIONS, HOMEWORK_SORT_OPTIONS,
  activeHomeworkFilterCount, groupHomework,
  type HomeworkFilters, type HomeworkGroupId,
} from '../../lib/homeworkGroups'
import { tactile } from '../../lib/feedback'
import { textFadeStyle } from '../../lib/textFades'
import { useKeyboardInset } from '../../lib/useKeyboardInset'
import { playTransitionDrop } from '../../lib/sound'
import { useT, useTc } from '../../lib/i18n'
import MobileSheet from '../MobileSheet'
import { useDashboard } from '../../store/dashboardStore'
import { Check, ChevronRight, Search, X } from '../icons/appIcons'

// ─────────────────────────────────────────────────────────────────────────────
// «ДЗ» ученика — ТОЛЬКО приложение на iPhone (GLASS && PLATFORM === 'iphone').
//
// Концепт «ДЗ» и «ДЗ · лист фильтров» (холст «Искра iOS — концепт ученика»):
// курс — нативная таблетка с меню сверху; модуль, поиск и фильтры — нативный
// стеклянный ряд над вкладками (useGlassBar); работы сгруппированы «Исправить /
// Текущие / Сдано / Скоро» (lib/homeworkGroups.ts — общая логика, её берут и
// iPad, и Android); фильтры и сортировка — один лист с «Готово».
// Android, iPad и Safari рисуют свою версию в CoursesPage.
// ─────────────────────────────────────────────────────────────────────────────

const ALL = 'all' as const

const GROUP_TONE: Record<HomeworkGroupId, { bg: string; text: string }> = {
  fix: { bg: 'var(--color-red-soft)', text: 'var(--color-red-text)' },
  active: { bg: 'var(--color-accent-soft)', text: 'var(--color-accent)' },
  done: { bg: 'var(--color-green-soft)', text: 'var(--color-green-text)' },
  locked: { bg: 'var(--color-bg-3)', text: 'var(--color-text-5)' },
}

export default function HomeworkListIphone({
  subject, subjects, activeSubjectId, onSubject, moduleTab, onModule, openLesson, now, focusLessonId,
}: {
  subject: Subject
  subjects: Subject[]
  activeSubjectId: string
  onSubject: (id: string) => void
  moduleTab: number | typeof ALL
  onModule: (id: number | typeof ALL) => void
  openLesson: (id: string) => void
  now: Date
  focusLessonId: string | null
}) {
  const t = useT()
  const { tc } = useTc()
  const [filters, setFilters] = useState<HomeworkFilters>(DEFAULT_HOMEWORK_FILTERS)
  // Черновик листа: применяется по «Готово», «Сбросить» возвращает умолчания.
  const [draft, setDraft] = useState<HomeworkFilters>(DEFAULT_HOMEWORK_FILTERS)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const kbInset = useKeyboardInset()

  const lessons: Lesson[] = useMemo(() => (
    moduleTab === ALL
      ? subject.modules.flatMap(m => m.lessons)
      : (subject.modules.find(m => m.id === moduleTab)?.lessons ?? [])
  ), [subject, moduleTab])
  const groups = useMemo(() => groupHomework(lessons, filters, now), [lessons, filters, now])
  const filterCount = activeHomeworkFilterCount(filters)

  const moduleLabel = moduleTab === ALL
    ? t('Все модули')
    : tc(subject.modules.find(m => m.id === moduleTab)?.label ?? '')

  const bar: GlassBar = {
    top: {
      id: 'subject', kind: 'pill', title: tc(subject.name), menuTitle: t('Курс'),
      menu: subjects.map(s => ({ value: s.id, title: tc(s.name), checked: s.id === activeSubjectId })),
    },
    bottom: [
      { id: 'search', kind: 'circle', symbol: 'magnifyingglass', label: t('Поиск'), active: !!filters.search },
      {
        id: 'module', kind: 'pill', title: moduleLabel, menuTitle: t('Модуль'),
        menu: [
          { value: ALL, title: t('Все модули'), checked: moduleTab === ALL },
          ...subject.modules.map(m => ({ value: String(m.id), title: tc(m.label), checked: moduleTab === m.id })),
        ],
      },
      { id: 'filters', kind: 'circle', symbol: 'slider.horizontal.3', label: t('Фильтры'), active: filterCount > 0 },
    ],
  }

  // Страница ДЗ на время урока прячется, а не размонтируется (DashboardPage):
  // бар ставим, только пока на экране именно список ДЗ.
  const visible = useDashboard(s => s.activePage) === 'homeworkList'
  useGlassBar(visible ? bar : null, {
    onTap: id => {
      tactile()
      if (id === 'search') setSearchOpen(true)
      if (id === 'filters') { setDraft(filters); setSheetOpen(true) }
    },
    onMenu: (id, value) => {
      if (id === 'subject' && value !== activeSubjectId) { playTransitionDrop(); onSubject(value) }
      if (id === 'module') { playTransitionDrop(); onModule(value === ALL ? ALL : Number(value)) }
    },
  }, searchOpen)

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus({ preventScroll: true })
  }, [searchOpen])

  // Пришли на конкретный урок (трек, расписание) — докрутить до него.
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  useEffect(() => {
    if (focusLessonId) rowRefs.current[focusLessonId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusLessonId, groups])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 10,
      // Обёртка страницы (DashboardPage) уже даёт safe-area + 22 сверху и
      // safe-area + 110 снизу. Добираем до низа нативной таблетки курса
      // (safe + 66) с зазором и до верха нижнего ряда над вкладками.
      paddingTop: 58,
      paddingBottom: 24,
    }}>
      {groups.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <Search size={24} />
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>{t('Ничего не найдено')}</p>
          <p style={{ margin: 0, fontSize: 14 }}>{t('Попробуйте изменить запрос или модуль')}</p>
        </div>
      )}

      {groups.map(group => (
        <section key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 6px 0', fontSize: 13, fontWeight: 700, letterSpacing: '.04em', color: 'var(--color-muted)' }}>
            <span>{t(group.label).toUpperCase()}</span>
            <span style={{ color: group.id === 'fix' ? 'var(--color-red-text)' : undefined }}>{group.rows.length}</span>
          </div>
          <div style={{ background: 'var(--color-bg-card)', borderRadius: 24, boxShadow: 'var(--shadow-card, 0 1px 2px rgba(40,28,110,.05))', overflow: 'hidden' }}>
            {group.rows.map((row, i) => {
              const tone = GROUP_TONE[row.group]
              const locked = row.group === 'locked'
              const showScore = row.lesson.points !== undefined && (row.group === 'done' || row.group === 'fix')
              return (
                <motion.button
                  key={row.lesson.id}
                  ref={el => { rowRefs.current[row.lesson.id] = el }}
                  whileTap={locked ? undefined : { scale: 0.985 }}
                  disabled={locked}
                  onClick={() => { tactile(); openLesson(row.lesson.id) }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', minHeight: 64, border: 0, background: 'transparent',
                    borderTop: i === 0 ? 'none' : '1px solid var(--color-border-soft)',
                    textAlign: 'left', cursor: locked ? 'default' : 'pointer', color: 'var(--color-text)',
                    opacity: locked ? 0.7 : 1,
                  }}
                >
                  <span style={{ width: 40, height: 40, borderRadius: 13, flexShrink: 0, display: 'grid', placeItems: 'center', background: tone.bg, color: tone.text, fontWeight: 800, fontSize: 15 }}>
                    {showScore ? row.lesson.points : row.lesson.number + 1}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ ...textFadeStyle, whiteSpace: 'nowrap', overflow: 'hidden', fontSize: 15, fontWeight: 600, lineHeight: 1.25 }}>{tc(row.lesson.title)}</span>
                    <span style={{ ...textFadeStyle, whiteSpace: 'nowrap', overflow: 'hidden', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.3 }}>
                      {t('Занятие №')}{row.lesson.number + 1} · {t(lessonStatusLabel(row.status, row.lesson.kind))}
                    </span>
                  </span>
                  {!locked && <ChevronRight size={16} style={{ flexShrink: 0, color: 'var(--color-text-5)' }} />}
                </motion.button>
              )
            })}
          </div>
        </section>
      ))}

      {/* Поиск — веб-поле на месте нижнего стеклянного ряда (он прячется), над
          вкладками; с клавиатурой вкладки уходят, поле поднимается вместе. */}
      {searchOpen && (
        <div style={{ position: 'fixed', left: 16, right: 16, bottom: kbInset > 0 ? kbInset + 12 : 'calc(env(safe-area-inset-bottom, 0px) + 58px)', zIndex: 60, display: 'flex', alignItems: 'center', gap: 8, height: 48, padding: '0 8px 0 16px', borderRadius: 24, background: 'rgba(var(--glass-rgb), var(--glass-fill))', backdropFilter: 'var(--blur-solid)', WebkitBackdropFilter: 'var(--blur-solid)', boxShadow: 'var(--shadow-pill)', border: '1px solid var(--color-border-glass)' }}>
          <Search size={20} style={{ flexShrink: 0, color: 'var(--color-text-2)' }} />
          <input
            ref={searchRef}
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder={t('Поиск по занятиям')}
            enterKeyHint="search"
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, color: 'var(--color-text)' }}
          />
          <button
            onClick={() => { tactile(); setFilters(f => ({ ...f, search: '' })); setSearchOpen(false) }}
            aria-label={t('Закрыть поиск')}
            style={{ width: 36, height: 36, borderRadius: 18, border: 0, background: 'transparent', display: 'grid', placeItems: 'center', color: 'var(--color-text-3)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      <MobileSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t('Фильтры')}
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { tactile(); setDraft({ ...DEFAULT_HOMEWORK_FILTERS, search: draft.search }) }}
              style={{ flex: 1, height: 48, borderRadius: 24, border: 0, background: 'var(--color-purple-soft)', color: 'var(--color-accent)', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}
            >{t('Сбросить')}</button>
            <button
              onClick={() => { tactile(); setFilters(draft); setSheetOpen(false) }}
              style={{ flex: 1, height: 48, borderRadius: 24, border: 0, background: 'var(--grad-purple)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
            >{t('Готово')}</button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.04em', color: 'var(--color-muted)', padding: '0 4px' }}>{t('Показывать').toUpperCase()}</span>
            <div role="radiogroup" style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 22, background: 'var(--color-bg-input)' }}>
              {HOMEWORK_SHOW_OPTIONS.map(o => {
                const on = draft.show === o.id
                return (
                  <button key={o.id} role="radio" aria-checked={on}
                    onClick={() => { tactile(); setDraft(d => ({ ...d, show: o.id })) }}
                    style={{ flex: 1, height: 38, borderRadius: 19, border: 0, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: on ? 'var(--color-bg-card)' : 'transparent', color: on ? 'var(--color-text)' : 'var(--color-muted)', boxShadow: on ? 'var(--shadow-pill)' : 'none' }}
                  >{t(o.label)}</button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.04em', color: 'var(--color-muted)', padding: '0 4px' }}>{t('Сортировка').toUpperCase()}</span>
            <div role="radiogroup" style={{ borderRadius: 18, background: 'var(--color-bg-input)', overflow: 'hidden' }}>
              {HOMEWORK_SORT_OPTIONS.map((o, i) => {
                const on = draft.sort === o.id
                return (
                  <button key={o.id} role="radio" aria-checked={on}
                    onClick={() => { tactile(); setDraft(d => ({ ...d, sort: o.id })) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, padding: '0 16px', border: 0, borderTop: i === 0 ? 'none' : '1px solid var(--color-border-soft)', background: 'transparent', fontSize: 15, color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left' }}
                  >
                    {t(o.label)}
                    {on && <Check size={18} style={{ color: 'var(--color-accent)' }} />}
                  </button>
                )
              })}
            </div>
          </div>

          <button role="switch" aria-checked={draft.hideLocked}
            onClick={() => { tactile(); setDraft(d => ({ ...d, hideLocked: !d.hideLocked })) }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, padding: '0 16px', borderRadius: 18, border: 0, background: 'var(--color-bg-input)', fontSize: 15, color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left' }}
          >
            {t('Скрыть закрытые уроки')}
            <span aria-hidden style={{ width: 51, height: 31, borderRadius: 16, flexShrink: 0, position: 'relative', background: draft.hideLocked ? 'var(--color-accent)' : 'var(--color-border-medium)', transition: 'background .2s' }}>
              <span style={{ position: 'absolute', top: 2, left: draft.hideLocked ? 22 : 2, width: 27, height: 27, borderRadius: 14, background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,.2)', transition: 'left .2s' }} />
            </span>
          </button>
        </div>
      </MobileSheet>
    </div>
  )
}
