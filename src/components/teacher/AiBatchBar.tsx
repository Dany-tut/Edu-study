// «Применить все уверенные» в очереди «Нужно проверить».
//
// Применяются только работы, где ИИ уверен (решает база, см. lib/aiBatch.ts).
// Перед записью — подтверждение с числом работ и причинами спорных, затем
// 8 секунд на отмену: до конца отсчёта в базу ничего не уходит, ученики
// ничего не получают. Ушли со страницы во время отсчёта — применяем сразу.

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Alert } from '../Alert'
import Modal from '../Modal'
import { confirmDialog } from '../ConfirmHost'
import { btn } from '../../lib/pillStyles'
import { useT } from '../../lib/i18n'
import { doubtSummary, DOUBT_LABEL, supabaseAiBatchSource, useAiBatchPreview, type AiBatchSource } from '../../lib/aiBatch'
import AiAgreementPanel from './AiAgreementPanel'
import { useIsDesktop } from '../../lib/useIsDesktop'

export const UNDO_SECONDS = 8

function works(n: number) {
  const m10 = n % 10, m100 = n % 100
  return m10 === 1 && m100 !== 11 ? 'работу' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'работы' : 'работ'
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'countdown'; ids: string[]; left: number }
  | { kind: 'applying'; ids: string[] }
  | { kind: 'done'; applied: number; missed: number }
  | { kind: 'error' }

export default function AiBatchBar({ queueKey, onApplied, source = supabaseAiBatchSource }: { queueKey: string; onApplied: () => void; source?: AiBatchSource }) {
  const t = useT()
  const { preview, known, reload } = useAiBatchPreview(queueKey, source)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [showSummary, setShowSummary] = useState(false)
  // MOBILE-01: на телефоне кнопки не ниже 44 px.
  const tap = useIsDesktop() ? 36 : 44
  const pendingIds = useRef<string[] | null>(null)
  const onAppliedRef = useRef(onApplied)
  onAppliedRef.current = onApplied

  const sure = preview.sure.length
  const disputed = preview.disputed.length

  async function commit(ids: string[]) {
    pendingIds.current = null
    setPhase({ kind: 'applying', ids })
    try {
      const applied = await source.apply(ids)
      setPhase({ kind: 'done', applied: applied.length, missed: ids.length - applied.length })
    } catch {
      setPhase({ kind: 'error' })
    }
    void reload()
    onAppliedRef.current()
  }

  // Отсчёт отмены.
  useEffect(() => {
    if (phase.kind !== 'countdown') return
    if (phase.left <= 0) { void commit(phase.ids); return }
    const id = window.setTimeout(() => setPhase(p => p.kind === 'countdown' ? { ...p, left: p.left - 1 } : p), 1000)
    return () => window.clearTimeout(id)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ушли со страницы во время отсчёта — решение учителя всё равно в силе.
  useEffect(() => () => { const ids = pendingIds.current; if (ids?.length) void source.apply(ids).catch(() => {}) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    if (!sure || phase.kind === 'countdown' || phase.kind === 'applying') return
    const ids = preview.sure.map(i => i.id)
    const reasons = doubtSummary(preview.disputed).map(r => `${t(DOUBT_LABEL[r.doubt])} — ${r.count}`).join(', ')
    const ok = await confirmDialog({
      title: `${t('Применить')} ${ids.length} ${t(works(ids.length))} ${t('без открытия?')}`,
      message: [
        t('ИИ уверен в этих работах: каждый элемент критерия однозначен и подтверждён цитатой из ответа. Ученики получат балл и комментарий ИИ от вашего имени.'),
        disputed ? `${t('Спорные останутся вам')}: ${disputed}${reasons ? ` (${reasons})` : ''}.` : '',
        `${t('Отменить можно в течение')} ${UNDO_SECONDS} ${t('секунд.')}`,
      ].filter(Boolean).join('\n\n'),
      confirmLabel: t('Применить'),
    })
    if (!ok) return
    pendingIds.current = ids
    setPhase({ kind: 'countdown', ids, left: UNDO_SECONDS })
  }

  function undo() {
    pendingIds.current = null
    setPhase({ kind: 'idle' })
  }

  const busy = phase.kind === 'countdown' || phase.kind === 'applying'
  const hasAny = sure + disputed > 0
  if (!known && !hasAny && phase.kind === 'idle') return null

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '0 4px 12px' }}>
        {hasAny && (
          <button type="button" data-hover="layer" disabled={!sure || busy} onClick={() => void start()}
            title={sure ? undefined : t('Нет работ, где ИИ уверен: спорные проверьте сами')}
            style={btn('S', 'secondary', { minHeight: tap, opacity: !sure || busy ? 0.55 : 1, cursor: !sure || busy ? 'default' : 'pointer' })}>
            {t('Применить все уверенные')}
            <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: '1ch' }}>· {sure}</span>
          </button>
        )}
        {hasAny && disputed > 0 && (
          <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{t('спорных')}: {disputed}</span>
        )}
        <button type="button" data-hover="link" onClick={() => setShowSummary(true)}
          style={{ marginLeft: 'auto', minHeight: tap, padding: '0 4px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: 'var(--color-purple-text)' }}>
          {t('Где ИИ расходится с вами')}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {phase.kind !== 'idle' && (
          <motion.div key="batch-alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 0 12px' }} aria-live="polite">
              {phase.kind === 'countdown' && (
                <Alert tone="info" stacked
                  title={`${t('Применяем')} ${phase.ids.length} ${t(works(phase.ids.length))} ${t('через')} ${phase.left} ${t('с')}`}
                  text={t('Пока идёт отсчёт, ученики ничего не получили.')}
                  action={{ label: t('Отменить'), onClick: undo }} />
              )}
              {phase.kind === 'applying' && (
                <Alert tone="info" title={`${t('Применяем')} ${phase.ids.length} ${t(works(phase.ids.length))}…`} />
              )}
              {phase.kind === 'done' && (
                <Alert tone="success" stacked onClose={() => setPhase({ kind: 'idle' })}
                  title={`${t('Применено')}: ${phase.applied}`}
                  text={phase.missed ? `${t('Не применено')}: ${phase.missed}. ${t('Эти работы изменились за время отсчёта и остались в очереди.')}` : t('Оценки и комментарии ушли ученикам.')} />
              )}
              {phase.kind === 'error' && (
                <Alert tone="danger" stacked onClose={() => setPhase({ kind: 'idle' })}
                  title={t('Не удалось применить оценки')}
                  text={t('Ни одна работа не изменилась. Проверьте связь и попробуйте ещё раз.')} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSummary && (
          <Modal title={t('Где ИИ расходится с вами')} subtitle={t('Ваши поправки к предоценке ДЗ')} width={480} onClose={() => setShowSummary(false)}>
            <AiAgreementPanel load={source.agreement} />
          </Modal>
        )}
      </AnimatePresence>
    </>
  )
}
