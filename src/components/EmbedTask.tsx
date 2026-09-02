// ─────────────────────────────────────────────────────────────────────────────
// «Внешнее упражнение» (embed) — чужое задание внутри домашки
//
// ЧЕСТНАЯ ОГОВОРКА, КОТОРУЮ ВИДИТ УЧЕНИК. Результат оттуда к нам не приходит:
// ни Wordwall, ни Quizlet без платного API его не отдают. Поэтому задание
// засчитывается ПРОХОЖДЕНИЕМ — как просмотр видео, — и об этом написано прямо
// под рамкой. Молчаливое «задание принято» здесь было бы враньём: учитель
// решил бы, что упражнение проверено.
//
// ПОЧЕМУ ДВА ВИДА. Известные площадки открываются в рамке; всё остальное —
// кнопкой в новую вкладку (см. lib/embed.ts: произвольный адрес в iframe не
// пускаем). Оба вида заканчиваются одной и той же отметкой.
// ─────────────────────────────────────────────────────────────────────────────

import { Check, ExternalLink } from 'lucide-react'
import { EMBED_DONE } from '../data/taskTypes'
import { parseEmbed } from '../lib/embed'
import { playPop, vibrate } from '../lib/sound'
import { useT } from '../lib/i18n'

export default function EmbedTask({ url, value, disabled, onChange }: {
  url: string | undefined
  value: string | undefined
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const t = useT()
  const target = parseEmbed(url)
  const done = value === EMBED_DONE

  if (!target) {
    return (
      <div style={{ fontSize: 13.5, color: 'var(--color-muted)' }}>
        {t('Ссылка на упражнение не указана — покажите её преподавателю.')}
      </div>
    )
  }

  const mark = () => {
    if (disabled || done) return
    playPop()
    vibrate(10)
    onChange(EMBED_DONE)
  }

  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      <div style={{
        borderRadius: 14, overflow: 'hidden',
        border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-input)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px',
          borderBottom: '1px solid var(--color-border-soft)',
          fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)',
        }}>
          <ExternalLink size={12} />
          {target.label}
        </div>

        {target.kind === 'frame' ? (
          <iframe
            src={target.url}
            title={target.label}
            // Песочница закрывает встроенной странице всё, кроме её собственной
            // работы: ни всплывающих окон, ни навигации нашей вкладки.
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            allowFullScreen
            style={{ display: 'block', width: '100%', height: 420, border: 'none', background: 'var(--color-bg-2)' }}
          />
        ) : (
          <div style={{ padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 13.5, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              {t('Упражнение откроется в новой вкладке — вернитесь сюда, когда закончите.')}
            </span>
            <a
              href={target.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px',
                borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none',
                background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)',
              }}
            >
              <ExternalLink size={14} /> {t('Открыть упражнение')}
            </a>
          </div>
        )}
      </div>

      <div className="flex" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={mark}
          disabled={disabled || done}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px',
            borderRadius: 12, fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
            border: 'none', cursor: disabled || done ? 'default' : 'pointer',
            background: done ? 'var(--color-green-soft)' : 'var(--btn-green-bg)',
            color: done ? 'var(--color-green-text)' : '#fff',
          }}
        >
          {done ? <Check size={14} /> : null}
          {done ? t('Отмечено выполненным') : t('Я закончил')}
        </button>
        <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.4 }}>
          {t('Результат с чужой площадки к нам не приходит — засчитывается прохождение.')}
        </span>
      </div>
    </div>
  )
}
