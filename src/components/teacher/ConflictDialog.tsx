import OpticalText from '../OpticalText'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, Pencil, PlusCircle, RotateCcw, Save, Users, X } from '../icons/appIcons'
import { useT } from '../../lib/i18n'
import { btn } from '../../lib/pillStyles'

import type { CourseConflict } from '../../lib/courseConflictComparison'
export type { CourseConflict } from '../../lib/courseConflictComparison'

function FieldComparison({ field }: { field: CourseConflict['courseFields'][number] }) {
  const t = useT()
  return <section style={{ marginBlock: 10 }}>
    <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{field.label}</h4>
    <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 8, margin: 0 }}>
      {[[t('В базе'), field.database], [t('В этой вкладке'), field.tab]].map(([side, value]) => (
        <div key={side} style={{ padding: '8px 10px', borderRadius: 12, background: 'var(--color-bg-2)', minWidth: 0 }}>
          <dt style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)' }}>{side}</dt>
          <dd style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.5, fontSize: 13,
            color: value ? 'var(--color-text)' : 'var(--color-muted)' }}>{value || t('Пусто')}</dd>
        </div>
      ))}
    </dl>
    {field.keep && <p style={{ marginTop: 4, fontSize: 12, color: 'var(--color-muted)' }}>
      {field.keep === 'database'
        ? t('При «Оставить моё» здесь останется значение из базы.')
        : t('При «Оставить моё» здесь сохранится значение этой вкладки.')}
    </p>}
  </section>
}

export default function ConflictDialog({ info, onOverwrite, onReload, onClose, report, applying = false }: {
  info: CourseConflict
  onOverwrite: () => void
  onReload: () => void
  onClose: () => void
  applying?: boolean
  report?: { label: string; onClick?: () => void }
}) {
  const t = useT()
  const statusWord = (s: 'draft' | 'published') => (s === 'published' ? t('опубликован') : t('черновик'))

  // Группы риска — данными, чтобы пустые не рисовались.
  const groups = [
    {
      id: 'added',
      title: t('Есть только в базе'),
      note: t('В этой вкладке этих уроков нет. Проверьте состав курса перед сохранением.'),
      Icon: AlertTriangle,
      tone: 'var(--color-red-text)',
      lines: info.added,
    },
    {
      id: 'renamed',
      title: t('Разные названия уроков'),
      note: t('Слева название в базе, справа — в вашей вкладке.'),
      Icon: Pencil,
      tone: 'var(--color-yellow-text)',
      lines: info.renamed.map(r => `«${r.from}» → «${r.to}»`),
    },
    {
      id: 'localNew',
      title: t('Есть только в этой вкладке'),
      note: t('При загрузке версии из базы эти уроки исчезнут из вкладки.'),
      Icon: PlusCircle,
      tone: 'var(--color-green-text)',
      lines: info.localNew,
    },
  ].filter(g => g.lines.length > 0)

  const fieldLines: { Icon: typeof Users; text: string }[] = []
  if (info.titleChange)
    fieldLines.push({ Icon: Pencil, text: `${t('Название')}: «${info.titleChange.from}» → «${info.titleChange.to}»` })
  if (info.statusChange)
    fieldLines.push({ Icon: AlertTriangle, text: `${t('Статус')}: ${statusWord(info.statusChange.from)} → ${statusWord(info.statusChange.to)}` })
  if (info.audienceChanged)
    fieldLines.push({ Icon: Users, text: t('Группы или ученики в базе и во вкладке различаются.') })

  const nothing = !groups.length && !fieldLines.length && !info.courseFields.length && !info.lessonFields.length

  const bodyRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ top: false, bottom: false })
  const updateEdges = (el: HTMLElement) => setEdges(prev => {
    const top = el.scrollTop > 2
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2
    return prev.top === top && prev.bottom === bottom ? prev : { top, bottom }
  })

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'min(4vw, 20px)' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <motion.div
        role="dialog" aria-modal="true" aria-labelledby="course-conflict-title"
        onKeyDown={event => {
          if (event.key === 'Escape') onClose()
          if (event.key !== 'Tab') return
          const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
          const first = buttons[0], last = buttons[buttons.length - 1]
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
        }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}
        style={{
          position: 'relative', width: 'min(560px, 100%)', maxHeight: '82vh',
          display: 'flex', flexDirection: 'column',
          borderRadius: 24, border: '1px solid var(--color-border-glass)',
          background: 'rgba(var(--glass-rgb), 0.99)', boxShadow: 'var(--shadow-lg)',
        }}
      >
        <header className="flex items-center flex-shrink-0" style={{ gap: 10, padding: '18px 22px', borderBottom: '1px solid var(--color-border-soft)' }}>
          <AlertTriangle size={18} style={{ color: 'var(--color-yellow-text)' }} />
          <span className="flex-1 min-w-0">
            <span id="course-conflict-title" style={{ display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
              {t('Курс изменили в другом месте')}
            </span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--color-muted)' }}>
              {t('Сравните версию в базе с черновиком этой вкладки.')}
            </span>
          </span>
          <button autoFocus data-hover="layer" onClick={onClose} aria-label={t('Закрыть')} className="cursor-pointer flex items-center justify-center flex-shrink-0"
            style={{ width: 32, height: 32, borderRadius: 11, border: '1px solid var(--color-border-soft)', background: 'transparent', color: 'var(--color-muted)' }}>
            <X size={16} />
          </button>
        </header>

        <div style={{ position: 'relative', minHeight: 0, display: 'flex' }}>
          <div ref={el => { bodyRef.current = el; if (el) updateEdges(el) }} onScroll={e => updateEdges(e.currentTarget)}
            style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowWrap: 'anywhere', padding: '16px clamp(12px, 3vw, 22px)' }}>
            <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--color-muted)', marginBottom: 12 }}>
              {info.knownIntent ? t('«Взять из базы» откроет сохранённый курс и удалит черновик вкладки. «Оставить моё» применит ваши правки поверх проверенной версии из базы. Остальные поля сохранятся такими, как в базе.') : t('«Взять из базы» откроет сохранённый курс и удалит черновик этой вкладки. «Оставить моё» попробует сохранить правки вкладки. Если сохранить их безопасно не удастся, черновик останется здесь.')}
            </p>
            {nothing ? (
              <p style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.5, padding: '12px 0' }}>
                {t('Состав курса, названия, описания, таймкоды, статус и аудитория совпадают. Версии могут различаться материалами, заданиями или другими полями.')}
              </p>
            ) : (
              <>
                {info.courseFields.map(field => <FieldComparison key={field.label} field={field} />)}
                {info.lessonFields.map(lesson => <section key={lesson.id} style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                    {t('Урок')}{lesson.number != null ? ` ${lesson.number}` : ''} · {lesson.title}
                  </h3>
                  {lesson.fields.map(field => <FieldComparison key={field.label} field={field} />)}
                </section>)}
                {groups.map(g => (
                  <section key={g.id} style={{ marginBottom: 18 }}>
                    <div className="flex items-center" style={{ gap: 8, marginBottom: 6 }}>
                      <g.Icon size={15} style={{ color: g.tone, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: g.tone }}>{g.title} · {g.lines.length}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: 6 }}>{g.note}</p>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {g.lines.map((line, i) => (
                        <li key={i} style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.45 }}>· {line}</li>
                      ))}
                    </ul>
                  </section>
                ))}
                {fieldLines.length > 0 && (
                  <section style={{ marginBottom: 4 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)', marginBottom: 6 }}>
                      {t('Поля курса · база → ваша вкладка')}
                    </span>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {fieldLines.map(({ Icon, text }, i) => (
                        <li key={i} className="flex items-start" style={{ gap: 8, fontSize: 13, color: 'var(--color-text)', lineHeight: 1.45 }}>
                          <Icon size={13} style={{ color: 'var(--color-muted)', flexShrink: 0, marginTop: 3 }} />
                          <span>{text}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
            {report && <div aria-live="polite" style={{ marginTop: 10 }}><button type="button" data-hover="layer" disabled={!report.onClick}
              onClick={report.onClick} style={btn('S', 'secondary')}>
              <OpticalText as="iskra-button-label">{report.label}</OpticalText>
            </button></div>}
          </div>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 26, pointerEvents: 'none',
            background: 'linear-gradient(to bottom, rgba(var(--glass-rgb), 0.99), transparent)',
            opacity: edges.top ? 1 : 0, transition: 'opacity 0.15s ease',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 26, pointerEvents: 'none',
            background: 'linear-gradient(to top, rgba(var(--glass-rgb), 0.99), transparent)',
            opacity: edges.bottom ? 1 : 0, transition: 'opacity 0.15s ease',
          }} />
        </div>

        <footer className="flex items-center flex-shrink-0" style={{ flexWrap: 'wrap', gap: 8, padding: '12px clamp(12px, 3vw, 22px)', borderTop: '1px solid var(--color-border-soft)' }}>
          <button data-hover="layer" onClick={onReload} className="cursor-pointer flex items-center" style={{ ...btn('M', 'secondary'), gap: 8 }}>
            <RotateCcw size={14} /> <OpticalText as="iskra-button-label">{t('Взять из базы')}</OpticalText>
          </button>
          <button data-hover="layer"
            onClick={onOverwrite} disabled={applying} aria-busy={applying}
            className="cursor-pointer flex items-center"
            style={{
              marginLeft: 'auto', gap: 8, padding: '10px 18px', borderRadius: 999, border: 'none',
              background: 'var(--grad-purple)', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            }}
          >
            <Save size={14} /> <OpticalText as="iskra-button-label">{applying ? t('Проверяю версию…') : t('Оставить моё')}</OpticalText>
          </button>
        </footer>
      </motion.div>
    </div>,
    document.body,
  )
}
