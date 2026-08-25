// ─────────────────────────────────────────────────────────────────────────────
// Работа ученика по базовому уровню — то, что до этого преподаватель не видел.
//
// Сдача базы приходила одним баллом: «76 из 100» и ничего про то, где именно
// ученик споткнулся, что он написал в свободном ответе и что наговорил в устном
// задании. Здесь разворачивается снимок сдачи (lib/basicAnswers.ts): задание,
// ответ ученика, эталон и вердикт машины. Голосовые ответы играются плеером —
// они лежат в приватном бакете task-media и открываются по signed URL.
//
// ЗАЧТЁННОЕ УСТНОЕ СВЁРНУТО. «Прочитайте вслух» с эталоном машина проверяет сама
// (см. VoiceAnswer в HomeworkFlow): она сверяет расшифровку записи с эталоном и
// знает ровно одно — прозвучали ли нужные слова. Там, где прозвучали, слушать
// нечего: дюжина таких записей в ленте — это дюжина минут, отнятых у разбора
// того, что НЕ сошлось. Строки не выброшены, а сложены под строку-раскрыв:
// счёт виден всегда, записи — по требованию.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronRight, CircleAlert, Eye, MicOff, Minus, Send } from 'lucide-react'
import type { BasicAnswerRow, BasicAnswersPayload, BasicAnswerVerdict } from '../../lib/basicAnswers'
import { verdictLabel } from '../../lib/basicAnswers'
import { useT } from '../../lib/i18n'
import { bindShortWords, proseWrap } from '../../lib/typography'
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
  // Эталон нужен и там, где показана расшифровка: преподаватель читает две
  // строки рядом — что просили сказать и что услышала машина, — и по ним
  // решает, ученик сказал не то или распознавалка не расслышала.
  const showReference = !!row.correct
    && (row.verdict === 'wrong' || row.verdict === 'hint' || row.verdict === 'empty'
      || (row.verdict === 'review' && !!row.heard))

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
        <p style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.5, color: 'var(--color-text-2)', ...proseWrap }}>
          {bindShortWords(row.prompt)}
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
          whiteSpace: 'pre-wrap', ...proseWrap,
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

      {/* Что услышала распознавалка. Показывается только у незачтённых — там это
          и решает: ученик сказал не то или машина не расслышала сказанное. */}
      {row.heard && row.verdict !== 'correct' && (
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--color-text-3)', ...proseWrap }}>
          {t('Машина услышала')}: «{row.heard}»
          {row.attempts && row.attempts > 1 ? ` · ${t('попыток')}: ${row.attempts}` : ''}
        </p>
      )}

      {showReference && (
        <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-green-text)' }}>
          {t('Правильный ответ')}: <b>{row.correct}</b>
        </p>
      )}
    </div>
  )
}

/** Устное, которое машина зачла: слушать нечего — нужные слова прозвучали. */
const isPassedVoice = (r: BasicAnswerRow) => !!r.voice && r.verdict === 'correct'

export default function BasicAnswersList({ payload }: { payload: BasicAnswersPayload }) {
  const t = useT()
  const [showPassed, setShowPassed] = useState(false)
  // Устные задания и описания картинок — то, ради чего преподаватель сюда и
  // заходит: машина их не проверяет, а раньше они вообще не доезжали.
  const reviewCount = payload.rows.filter(r => r.verdict === 'review' || r.verdict === 'skip').length
  const hintCount = payload.rows.filter(r => r.verdict === 'hint').length
  const passed = payload.rows.filter(isPassedVoice)
  // Порядок заданий сохраняется: свёрнутые не выдёргиваются наверх, а просто
  // не рисуются, пока их не попросят.
  const rows = showPassed ? payload.rows : payload.rows.filter(r => !isPassedVoice(r))

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
      {passed.length > 0 && (
        <button
          onClick={() => setShowPassed(v => !v)}
          className="flex items-center cursor-pointer"
          style={{
            alignSelf: 'flex-start', gap: 7, padding: '7px 12px', borderRadius: 12,
            border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-2)',
            color: 'var(--color-text-2)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
          }}
        >
          {showPassed ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {t('Устные, зачтённые машиной')}: {passed.length}
          <span style={{ fontWeight: 500, color: 'var(--color-muted)' }}>
            · {showPassed ? t('свернуть') : t('послушать')}
          </span>
        </button>
      )}
      {rows.map(row => <AnswerCard key={row.n} row={row} />)}
    </div>
  )
}
