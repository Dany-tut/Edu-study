// ─────────────────────────────────────────────────────────────────────────────
// «Подтянуть из сида» — окно со списком расхождений
//
// ПОЧЕМУ СПИСКОМ С ГАЛКАМИ, А НЕ ОДНОЙ КНОПКОЙ «ОБНОВИТЬ». Курс из сида — это
// уже курс учителя: в нём проставлены даты, переписаны формулировки, добавлены
// свои задания. Кнопка «обновить всё» однажды сотрёт вечер работы, и второй раз
// её никто не нажмёт. Поэтому окно показывает, что именно изменится, и делит
// это надвое: добавления безопасны и отмечены сразу, перезаписи — нет.
//
// Ничего не пишется в БД: выбранное применяется к курсу в редакторе, а дальше
// учитель жмёт обычное «Сохранить». Отменить до сохранения можно уходом со
// страницы, и это честнее любого «вы уверены?».
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, Check, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import type { SeedChange, SeedDiff } from '../../lib/seedSync'
import { useT } from '../../lib/i18n'
import Checkbox from '../Checkbox'

const KIND_LABEL: Record<SeedChange['kind'], string> = {
  lesson: 'Новый урок',
  'lesson-gone': 'Урок убран из сида',
  task: 'Новые задания',
  'task-gone': 'Убраны из готового курса',
  'task-fields': 'Правки в заданиях',
  theory: 'Конспект',
  video: 'Видео урока',
}

export default function SeedSyncDialog({ diff, onClose, onApply }: {
  diff: SeedDiff
  onClose: () => void
  onApply: (keys: Set<string>) => void
}) {
  const t = useT()
  // Добавления отмечены сразу, перезаписи — нет. Это и есть всё правило.
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(diff.changes.filter(c => !c.overwrites).map(c => c.key)),
  )
  const [openKey, setOpenKey] = useState<string | null>(null)

  const additions = useMemo(() => diff.changes.filter(c => !c.overwrites), [diff])
  // Удаление стоит отдельной группой, а не внутри перезаписей: «перезапишется»
  // и «исчезнет вместе с ответами учеников» — разный риск, и мерить их одной
  // жёлтой полосой значит прятать второе за первым.
  const GONE = new Set(['task-gone', 'lesson-gone'])
  const removals = useMemo(() => diff.changes.filter(c => GONE.has(c.kind)), [diff])
  const overwrites = useMemo(
    () => diff.changes.filter(c => c.overwrites && !GONE.has(c.kind)), [diff],
  )

  const toggle = (key: string) => setPicked(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })
  const toggleAll = (group: SeedChange[], on: boolean) => setPicked(prev => {
    const next = new Set(prev)
    group.forEach(c => on ? next.add(c.key) : next.delete(c.key))
    return next
  })

  const row = (c: SeedChange) => (
    <div key={c.key} style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
      <div className="flex items-start" style={{ gap: 10, padding: '10px 4px' }}>
        <span style={{ paddingTop: 2 }}>
          <Checkbox checked={picked.has(c.key)} onChange={() => toggle(c.key)} />
        </span>
        <button
          onClick={() => c.details?.length && setOpenKey(openKey === c.key ? null : c.key)}
          className="flex-1 min-w-0 cursor-pointer"
          style={{ border: 'none', background: 'none', padding: 0, textAlign: 'left', fontFamily: 'inherit' }}
        >
          <span style={{ display: 'block', fontSize: 14, fontWeight: 650, color: 'var(--color-text)' }}>
            {c.lessonTitle}
          </span>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--color-muted)', marginTop: 1 }}>
            {KIND_LABEL[c.kind]} · {c.summary}
            {!!c.details?.length && ` · ${openKey === c.key ? t('скрыть') : t('подробнее')}`}
          </span>
        </button>
      </div>
      {openKey === c.key && !!c.details?.length && (
        <ul style={{ margin: '0 0 10px 34px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {c.details.map((d, i) => (
            <li key={i} style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.45 }}>· {d}</li>
          ))}
        </ul>
      )}
    </div>
  )

  // Группы описаны данными, а не тремя вызовами подряд: по этому же списку
  // рисуется полоса под шапкой, и разъехаться с телом окна она не может.
  const groups = [
    {
      id: 'add',
      title: t('Добавится'),
      note: t('Ничего не затирает: этих уроков и заданий в курсе просто нет.'),
      Icon: Plus,
      list: additions,
      tone: 'var(--color-green-text)',
    },
    {
      id: 'over',
      title: t('Перезапишется'),
      note: t('Может стереть ваши правки — отметьте только то, что готовы отдать сиду.'),
      Icon: AlertTriangle,
      list: overwrites,
      tone: 'var(--color-yellow-text)',
    },
    {
      id: 'gone',
      title: t('Удалится'),
      note: t('Эти уроки и задания убрали из готового курса. Ответы учеников на них останутся в базе, но перестанут показываться.'),
      Icon: Trash2,
      list: removals,
      tone: 'var(--color-red-text)',
    },
  ].filter(g => g.list.length > 0)

  const bodyRef = useRef<HTMLDivElement>(null)
  // Фейд показываем только с той стороны, где реально что-то спрятано.
  const [edges, setEdges] = useState({ top: false, bottom: false })
  const updateEdges = (el: HTMLElement) => setEdges(prev => {
    const top = el.scrollTop > 2
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2
    return prev.top === top && prev.bottom === bottom ? prev : { top, bottom }
  })
  // Не scrollIntoView: у вложенного контейнера он молча не срабатывает (проверено
  // на стенде — scrollTop оставался нулём). Считаем смещение сами.
  const jumpTo = (id: string) => {
    const body = bodyRef.current
    const el = body?.querySelector(`[data-group="${id}"]`)
    if (!body || !el) return
    body.scrollTop += el.getBoundingClientRect().top - body.getBoundingClientRect().top - 8
  }

  const group = ({ id, title, note, Icon, list, tone }: (typeof groups)[number]) => (
    <section key={id} data-group={id} style={{ marginBottom: 20, scrollMarginTop: 4 }}>
      <div className="flex items-center" style={{ gap: 8, marginBottom: 6 }}>
        <Icon size={15} style={{ color: tone, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 750, color: tone }}>{title} · {list.length}</span>
        <button
          onClick={() => toggleAll(list, !list.every(c => picked.has(c.key)))}
          className="cursor-pointer"
          style={{
            marginLeft: 'auto', border: 'none', background: 'none', padding: 0,
            fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: 'var(--color-muted)',
          }}
        >
          {list.every(c => picked.has(c.key)) ? t('снять все') : t('отметить все')}
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: 4 }}>{note}</p>
      {list.map(row)}
    </section>
  )

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }}
        style={{
          position: 'relative', width: 'min(640px, 100%)', maxHeight: '82vh',
          display: 'flex', flexDirection: 'column',
          borderRadius: 24, border: '1px solid var(--color-border-glass)',
          background: 'rgba(var(--glass-rgb), 0.99)', boxShadow: 'var(--shadow-lg)',
        }}
      >
        <header className="flex items-center flex-shrink-0" style={{ gap: 10, padding: '18px 22px', borderBottom: '1px solid var(--color-border-soft)' }}>
          <RefreshCw size={17} style={{ color: 'var(--color-accent)' }} />
          <span className="flex-1 min-w-0">
            <span style={{ display: 'block', fontSize: 16, fontWeight: 750, color: 'var(--color-text)' }}>
              {t('Что изменилось в готовом курсе')}
            </span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--color-muted)' }}>
              {t('Применится к курсу в редакторе — в базу уйдёт после «Сохранить»')}
            </span>
          </span>
          <button onClick={onClose} aria-label={t('Закрыть')} className="cursor-pointer flex items-center justify-center flex-shrink-0"
            style={{ width: 32, height: 32, borderRadius: 11, border: '1px solid var(--color-border-soft)', background: 'transparent', color: 'var(--color-muted)' }}>
            <X size={16} />
          </button>
        </header>

        {/* Полоса групп. Отметить «все добавления» или снять «все перезаписи» —
            самое частое действие в этом окне, и ради него не должно приходиться
            листать список на сотню строк до нужного заголовка. Клик по названию
            прокручивает тело к самой группе. */}
        {groups.length > 0 && (
          <div className="flex flex-wrap items-center flex-shrink-0"
            style={{ gap: 8, padding: '10px 22px', borderBottom: '1px solid var(--color-border-soft)' }}>
            {groups.map(g => {
              const n = g.list.filter(c => picked.has(c.key)).length
              // Мишень — вся таблетка, а не квадратик 16×16: попасть в чекбокс
              // мышью труднее, чем в слово рядом с ним. Клик отмечает всю
              // группу и заодно прокручивает тело к ней.
              const all = n === g.list.length
                return (
                  <button key={g.id} type="button"
                    onClick={() => { toggleAll(g.list, !all); jumpTo(g.id) }}
                    className="cursor-pointer flex items-center"
                    style={{
                      gap: 7, padding: '5px 11px 5px 9px', borderRadius: 999,
                      border: '1px solid var(--color-border-soft)',
                      background: n ? 'var(--color-bg-input)' : 'transparent',
                      fontFamily: 'inherit', textAlign: 'left',
                    }}
                  >
                    {/* Чекбокс здесь только рисует состояние: клик по нему —
                        это клик по таблетке, второй обработчик отменил бы первый. */}
                    <Checkbox size={16} checked={all} onChange={() => {}} />
                    <g.Icon size={13} style={{ color: g.tone, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text)' }}>{g.title}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)' }}>{n}/{g.list.length}</span>
                  </button>
                )
            })}
          </div>
        )}

        {/* Фейды на краях: список уходит под шапку с таблетками и под футер,
            и без них строка обрывается ровной линией — непонятно, кончился
            список или его просто обрезали. */}
        <div style={{ position: 'relative', minHeight: 0, display: 'flex' }}>
        <div ref={el => { bodyRef.current = el; if (el) updateEdges(el) }} onScroll={e => updateEdges(e.currentTarget)}
          style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '16px 22px' }}>
          {diff.changes.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.55, padding: '12px 0' }}>
              {t('Расхождений нет — курс совпадает с готовым.')}
            </p>
          ) : (
            <>{groups.map(group)}</>
          )}
        </div>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 26, pointerEvents: 'none',
            background: 'linear-gradient(to bottom, rgba(var(--glass-rgb), 0.99), transparent)',
            opacity: edges.top ? 1 : 0, transition: 'opacity 0.18s ease',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 26, pointerEvents: 'none',
            background: 'linear-gradient(to top, rgba(var(--glass-rgb), 0.99), transparent)',
            opacity: edges.bottom ? 1 : 0, transition: 'opacity 0.18s ease',
          }} />
        </div>

        <footer className="flex items-center flex-shrink-0" style={{ gap: 10, padding: '14px 22px', borderTop: '1px solid var(--color-border-soft)' }}>
          <span style={{ fontSize: 12.5, color: 'var(--color-muted)' }}>
            {t('Выбрано:')} {picked.size} {t('из')} {diff.changes.length}
          </span>
          <button onClick={onClose} className="cursor-pointer"
            style={{ marginLeft: 'auto', padding: '9px 16px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'transparent', color: 'var(--color-text-2)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
            {t('Отмена')}
          </button>
          <button
            onClick={() => onApply(picked)}
            disabled={picked.size === 0}
            className="cursor-pointer flex items-center"
            style={{
              gap: 7, padding: '9px 18px', borderRadius: 999, border: 'none',
              background: picked.size ? 'var(--color-control-accent)' : 'var(--color-border)',
              color: picked.size ? '#fff' : 'var(--color-muted)',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            }}
          >
            <Check size={14} /> {t('Применить')}
          </button>
        </footer>
      </motion.div>
    </div>,
    document.body,
  )
}
