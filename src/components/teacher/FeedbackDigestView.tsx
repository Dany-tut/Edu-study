import Segmented from '../Segmented'
import HScrollFade from '../HScrollFade'
import DigestMarkdown from './DigestMarkdown'
import { Alert } from '../Alert'
import { Sparkles, RefreshCw, FileText } from '../icons/appIcons'
import { useT } from '../../lib/i18n'
import { useIsDesktop } from '../../lib/useIsDesktop'
import type { FeedbackDigest } from '../../lib/feedbackTriage'

// Вкладка «Заявки → Сводка недели»: что болит чаще всего. Пишется моделью по
// понедельникам; кнопка собирает внеочередную. Без флага — только архив.

function fmt(iso: string) {
  try { return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) } catch { return iso }
}

export default function FeedbackDigestView({ digests, idx, setIdx, enabled, busy, error, onRun }: {
  digests: FeedbackDigest[]
  idx: number
  setIdx: (i: number) => void
  enabled: boolean
  busy: boolean
  error: string | null
  onRun: () => void
}) {
  const t = useT()
  const mobile = !useIsDesktop()
  const rep = digests[idx]
  const sentry = rep?.stats?.sentry

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {digests.length > 1 && (
          <HScrollFade gap={0} style={{ flex: '1 1 240px', minWidth: 0 }}>
            <Segmented variant="filter" value={String(idx)} onChange={v => setIdx(Number(v))}
              items={digests.map((d, i) => ({ id: String(i), label: fmt(d.created_at) }))} />
          </HScrollFade>
        )}
        {enabled && (
          <button type="button" data-hover="layer" onClick={onRun} disabled={busy}
            style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: mobile ? 44 : 36, padding: '8px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-2)', fontSize: 13, fontWeight: 600, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.6 : 1, flexShrink: 0 }}>
            {busy ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
            {busy ? t('Собираем…') : t('Собрать сводку')}
          </button>
        )}
      </div>

      {error && <Alert tone="danger" style={{ marginBottom: 14 }} title={t('Сводка не собралась')} text={error} />}
      {!enabled && (
        <Alert tone="info" style={{ marginBottom: 14 }} title={t('Сводка моделью выключена')}
          text={t('Новые сводки не собираются ни по расписанию, ни по кнопке. Включается в «Обзор → Расход на ИИ».')} />
      )}

      {!rep ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-3)' }}>
          <FileText size={28} strokeWidth={1.5} style={{ opacity: 0.5, display: 'block', margin: '0 auto' }} />
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>{t('Сводок пока нет')}</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>{t('Первая придёт в понедельник утром.')}</div>
        </div>
      ) : (
        <div style={{ borderRadius: 16, border: '1px solid var(--color-border)', background: 'var(--color-bg-2)', padding: 18 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span>{`${fmt(rep.created_at)} · ${rep.period_days} ${t('дн.')}`}</span>
            <span>{sentry?.configured ? (sentry.error ? t('Sentry не ответил') : t('со сверкой по Sentry')) : t('без Sentry')}</span>
          </div>
          <DigestMarkdown text={rep.body} />
        </div>
      )}
    </div>
  )
}
