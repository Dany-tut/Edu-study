// ─────────────────────────────────────────────────────────────────────────────
// Работа ученика по базовому уровню — то, что до этого преподаватель не видел.
//
// Сдача базы приходила одним баллом: «76 из 100» и ничего про то, где именно
// ученик споткнулся, что он написал в свободном ответе и что наговорил в устном
// задании. Здесь разворачивается снимок сдачи (lib/basicAnswers.ts): задание,
// ответ ученика, эталон и вердикт машины. Голосовые ответы играются плеером —
// они лежат в приватном бакете task-media и открываются по signed URL.
// ─────────────────────────────────────────────────────────────────────────────

import { CheckCircle2, CircleAlert, Eye, MicOff, Minus, Send } from 'lucide-react'
import type { BasicAnswerRow, BasicAnswersPayload, BasicAnswerVerdict } from '../../lib/basicAnswers'
import { verdictLabel } from '../../lib/basicAnswers'
import { useT } from '../../lib/i18n'
import AudioPlayer from '../AudioPlayer'

/** Цвета вердикта — те же три состояния, что и у ученика в разборе. */
function verdictStyle(v: BasicAnswerVerdict): { bg: string; fg: string; Icon: typeof CheckCircle2 } {
  switch (v) {
    case 'correct':
      return { bg: 'var(--color-green-soft)', fg: 'var(--color-green-text)', Icon: CheckCircle2 }
    case 'wrong':
      return { bg: 'var(--color-red-soft)', fg: 'var(--color-red-text)', Icon: CircleAlert }
    case 'hint':
      return { bg: 'var(--color-yellow-soft)', fg: 'var(--color-yellow-text)', Icon: Eye }
    case 'skip':
      return { bg: 'var(--color-yellow-soft)', fg: 'var(--color-yellow-text)', Icon: MicOff }
    case 'empty':
      return { bg: 'var(--color-bg-3)', fg: 'var(--color-muted)', Icon: Minus }
    case 'review':
      return { bg: 'var(--color-purple-soft)', fg: 'var(--color-accent)', Icon: Send }
  }
}

function AnswerCard({ row }: { row: BasicAnswerRow }) {
  const t = useT()
  const { bg, fg, Icon } = verdictStyle(row.verdict)
  const showReference = !!row.correct && (row.verdict === 'wrong' || row.verdict === 'hint' || row.verdict === 'empty')

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8,
      padding: '13px 15px', borderRadius: 18,
      background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
    }}>
      <div className="flex items-start" style={{ gap: 10 }}>
        <span style={{
          flexShrink: 0, minWidth: 24, height: 24, padding: '0 7px', borderRadius: 8,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--color-bg-3)', color: 'var(--color-text-3)',
          fontSize: 12, fontWeight: 800,
        }}>
          {row.n}
        </span>
        <p style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.5, color: 'var(--color-text-2)' }}>
          {row.prompt}
        </p>
        <span className="flex items-center" style={{
          flexShrink: 0, gap: 6, padding: '5px 10px', borderRadius: 999,
          background: bg, color: fg, fontSize: 11.5, fontWeight: 750,
        }}>
          <Icon size={13} />
          {t(verdictLabel(row.verdict))}
        </span>
      </div>

      {row.voice ? (
        <AudioPlayer audioUrl={row.answer} compact />
      ) : row.answer ? (
        <p style={{
          fontSize: 14.5, lineHeight: 1.5, fontWeight: 650, color: 'var(--color-text)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {row.answer}
        </p>
      ) : (
        <p style={{ fontSize: 13.5, color: 'var(--color-muted)', fontStyle: 'italic' }}>
          {row.verdict === 'skip'
            ? t('Ученик не смог записать голос — спросить на уроке.')
            : t('Ответа нет.')}
        </p>
      )}

      {showReference && (
        <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-green-text)' }}>
          {t('Эталон')}: <b>{row.correct}</b>
        </p>
      )}
    </div>
  )
}

export default function BasicAnswersList({ payload }: { payload: BasicAnswersPayload }) {
  const t = useT()
  // Устные задания и описания картинок — то, ради чего преподаватель сюда и
  // заходит: машина их не проверяет, а раньше они вообще не доезжали.
  const reviewCount = payload.rows.filter(r => r.verdict === 'review' || r.verdict === 'skip').length
  const hintCount = payload.rows.filter(r => r.verdict === 'hint').length

  if (payload.rows.length === 0) return null

  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text-2)' }}>
          {t('Автопроверка')}: {payload.correct} / {payload.gradable}
        </span>
        {reviewCount > 0 && (
          <span style={{
            padding: '4px 10px', borderRadius: 999,
            background: 'var(--color-purple-soft)', color: 'var(--color-accent)',
            fontSize: 11.5, fontWeight: 700,
          }}>
            {t('Смотрит преподаватель')}: {reviewCount}
          </span>
        )}
        {hintCount > 0 && (
          <span style={{
            padding: '4px 10px', borderRadius: 999,
            background: 'var(--color-yellow-soft)', color: 'var(--color-yellow-text)',
            fontSize: 11.5, fontWeight: 700,
          }}>
            {t('С подсказкой')}: {hintCount}
          </span>
        )}
      </div>
      {payload.rows.map(row => <AnswerCard key={row.n} row={row} />)}
    </div>
  )
}
