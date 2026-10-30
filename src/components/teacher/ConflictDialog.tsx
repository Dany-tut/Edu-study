// ─────────────────────────────────────────────────────────────────────────────
// «Курс изменили в другом месте» — окно развилки, а не тупик
//
// Сохранение пишет курс ЦЕЛИКОМ и удаляет уроки, которых нет в памяти вкладки.
// Если за время работы курс тронули со стороны (другая вкладка, телефон), слепо
// сохранить отсюда — откатить ту работу, а слепо перезагрузить — потерять свою.
// Поэтому вместо «перезагрузите» показываем, ЧТО именно разошлось, и даём выбрать
// осознанно: оставить своё (перезаписать базу) или взять версию из базы.
//
// Окно ничего не пишет само — только зовёт onOverwrite / onReload у редактора.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, Pencil, PlusCircle, RotateCcw, Save, Users, X } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { btn } from '../../lib/pillStyles'

export interface CourseConflict {
  /** Отпечаток серверной версии на момент обнаружения конфликта. */
  stamp: string
  /** Уроки, появившиеся в базе, но которых нет в этой вкладке — сохранение их удалит. */
  added: string[]
  /** Уроки, переименованные со стороны. */
  renamed: { from: string; to: string }[]
  /** Наши новые уроки, которых в базе ещё нет (при сохранении уедут, при перезагрузке пропадут). */
  localNew: string[]
  titleChange: { from: string; to: string } | null
  statusChange: { from: 'draft' | 'published'; to: 'draft' | 'published' } | null
  audienceChanged: boolean
}

export default function ConflictDialog({ info, onOverwrite, onReload, onClose }: {
  info: CourseConflict
  onOverwrite: () => void
  onReload: () => void
  onClose: () => void
}) {
  const t = useT()
  const statusWord = (s: 'draft' | 'published') => (s === 'published' ? t('опубликован') : t('черновик'))

  // Группы риска — данными, чтобы пустые не рисовались.
  const groups = [
    {
      id: 'added',
      title: t('Появились в базе'),
      note: t('Этих уроков нет в вашей вкладке — «Оставить моё» их удалит вместе с ответами учеников.'),
      Icon: AlertTriangle,
      tone: 'var(--color-red-text)',
      lines: info.added,
    },
    {
      id: 'renamed',
      title: t('Переименованы в базе'),
      note: t('«Оставить моё» вернёт прежние названия.'),
      Icon: Pencil,
      tone: 'var(--color-yellow-text)',
      lines: info.renamed.map(r => `«${r.from}» → «${r.to}»`),
    },
    {
      id: 'localNew',
      title: t('Ваши новые (ещё не в базе)'),
      note: t('Останутся при «Оставить моё», пропадут при «Взять из базы».'),
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
    fieldLines.push({ Icon: Users, text: t('Аудитория курса (группа/ученики) изменилась со стороны.') })

  const nothing = groups.length === 0 && fieldLines.length === 0

  const bodyRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ top: false, bottom: false })
  const updateEdges = (el: HTMLElement) => setEdges(prev => {
    const top = el.scrollTop > 2
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2
    return prev.top === top && prev.bottom === bottom ? prev : { top, bottom }
  })

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <motion.div
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
            <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
              {t('Курс изменили в другом месте')}
            </span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--color-muted)' }}>
              {t('Выберите, чью версию оставить — слить автоматически нельзя')}
            </span>
          </span>
          <button onClick={onClose} aria-label={t('Закрыть')} className="cursor-pointer flex items-center justify-center flex-shrink-0"
            style={{ width: 32, height: 32, borderRadius: 11, border: '1px solid var(--color-border-soft)', background: 'transparent', color: 'var(--color-muted)' }}>
            <X size={16} />
          </button>
        </header>

        <div style={{ position: 'relative', minHeight: 0, display: 'flex' }}>
          <div ref={el => { bodyRef.current = el; if (el) updateEdges(el) }} onScroll={e => updateEdges(e.currentTarget)}
            style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '16px 22px' }}>
            {nothing ? (
              <p style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.5, padding: '12px 0' }}>
                {t('Состав уроков совпадает — расхождение в содержимом урока (конспект, задания, домашка). Открыть его построчно нельзя, поэтому выберите версию целиком.')}
              </p>
            ) : (
              <>
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
                      {t('Поля курса')}
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

        <footer className="flex items-center flex-shrink-0" style={{ gap: 10, padding: '14px 22px', borderTop: '1px solid var(--color-border-soft)' }}>
          <button onClick={onReload} className="cursor-pointer flex items-center" style={{ ...btn('M', 'secondary'), gap: 8 }}>
            <RotateCcw size={14} /> {t('Взять из базы')}
          </button>
          <button
            onClick={onOverwrite}
            className="cursor-pointer flex items-center"
            style={{
              marginLeft: 'auto', gap: 8, padding: '10px 18px', borderRadius: 999, border: 'none',
              background: 'var(--grad-purple)', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            }}
          >
            <Save size={14} /> {t('Оставить моё')}
          </button>
        </footer>
      </motion.div>
    </div>,
    document.body,
  )
}
