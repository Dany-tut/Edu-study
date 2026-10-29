/**
 * «ИИ предложил N баллов» на экране проверки ДЗ.
 *
 * Предоценка по критериям ФИПИ (hw_ai_grades): по каждому заданию — элементы
 * ответа с вердиктом и дословной цитатой из работы ученика. Засчитан только
 * элемент с цитатой, которая правда есть в ответе (считает функция hw-grade,
 * не модель), поэтому рядом с элементом видно, засчитан он или нет.
 *
 * Комментарий ИИ — черновик ответа ученику. «Ок» — отправить балл и этот
 * ответ (та же запись проверки, что у кнопки «Засчитать»): ученик получает его
 * от учителя и не знает, что писал ИИ. «Править» — перенести балл и ответ в
 * поля ниже, поправить и отправить самому.
 *
 * Балл ИИ ставит только заданиям КИМ. Своё задание учителя — только черновик
 * ответа: «Ок» нет, балл учитель ставит сам через «Править».
 *
 * С `task` — карточка одного сложного задания: оценка 1–5 (из первичных по
 * проценту, как в контрольной Тестли) и комментарий ИИ к этому заданию.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Check, PenLine, ChevronDown, Loader2 } from 'lucide-react'
import type { AiGrade, AiGradeElement, AiGradeTask } from '../../lib/useAiGrades'
import { useT } from '../../lib/i18n'

const MARK: Record<AiGradeElement['verdict'], string> = { yes: '✓', partial: '½', no: '✗' }

function pointsWord(n: number, t: (s: string) => string): string {
  const d = n % 10, dd = n % 100
  if (d === 1 && dd !== 11) return t('балл')
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return t('балла')
  return t('баллов')
}

export default function AiGradeCard({ grade, task, done, onAccept, onEdit }: {
  grade: AiGrade
  /** Одно сложное задание вместо всей работы. */
  task?: AiGradeTask
  /** Учитель уже проверил (задание) — кнопок нет. */
  done?: boolean
  onAccept: () => void
  onEdit: () => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)

  if (grade.status === 'pending' || grade.status === 'working') {
    return (
      <div className="flex items-center" style={{
        gap: 8, padding: '12px 14px', borderRadius: 16, marginBottom: 16,
        background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)', fontSize: 13, fontWeight: 600,
      }}>
        <Loader2 size={15} className="animate-spin" />
        {t('ИИ проверяет работу по критериям ФИПИ…')}
      </div>
    )
  }
  if (grade.status === 'error') {
    return (
      <div style={{
        padding: '12px 14px', borderRadius: 16, marginBottom: 16,
        background: 'var(--color-bg-3)', color: 'var(--color-text-2)', fontSize: 13, lineHeight: 1.35,
      }}>
        {t('ИИ не смог оценить эту работу — проверьте её как обычно.')}
      </div>
    )
  }
  if (!['graded', 'dismissed', 'confirmed', 'changed'].includes(grade.status)) return null

  const decided = grade.status === 'confirmed' || grade.status === 'changed'
  const tasks = task ? [task] : grade.tasks
  const comment = task ? task.comment : grade.comment
  const note = task ? task.note : grade.teacherNote
  // Балл есть только у заданий КИМ; иначе карточка — один комментарий.
  const scored = task ? task.mark != null : grade.score != null

  return (
    <div style={{
      padding: 16, borderRadius: 18, marginBottom: 16,
      background: 'var(--color-purple-soft)',
      border: '1px solid color-mix(in srgb, var(--color-purple-text) 22%, transparent)',
    }}>
      <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
        <Sparkles size={16} style={{ color: 'var(--color-purple-text)' }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
          {!scored ? t('Комментарий ИИ')
            : task
              ? <>{t('ИИ предлагает оценку')} <span style={{ fontVariantNumeric: 'tabular-nums' }}>{task.mark}/5</span></>
              : <>{t('ИИ предложил')} <span style={{ fontVariantNumeric: 'tabular-nums' }}>{grade.score}</span> {pointsWord(grade.score!, t)}</>}
        </span>
        {!scored ? null : task ? (
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-purple-text)', fontVariantNumeric: 'tabular-nums' }}>
            {task.points} {t('из')} {task.max_points} {t('первичных по ФИПИ')}
          </span>
        ) : grade.max != null && grade.max > 0 && (
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-purple-text)', fontVariantNumeric: 'tabular-nums' }}>
            {grade.primary} {t('из')} {grade.max} {t('первичных по ФИПИ')}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)' }}>
          {decided && !task
            ? (grade.status === 'confirmed' ? t('Вы приняли оценку ИИ') : t('Вы поставили свою оценку'))
            : t('Черновик ответа ученику')}
        </span>
      </div>

      {comment && (
        <p style={{ fontSize: 13, lineHeight: 1.35, color: 'var(--color-text-2)', marginTop: 8 }}>{comment}</p>
      )}
      {note && (
        <p style={{ fontSize: 12, lineHeight: 1.35, color: 'var(--color-text-3)', marginTop: 6 }}>
          {t('Заметка ИИ')}: {note}
        </p>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center cursor-pointer"
        style={{
          gap: 4, marginTop: 10, padding: 0, border: 'none', background: 'none',
          color: 'var(--color-purple-text)', fontSize: 12, fontWeight: 700,
        }}
      >
        {open ? t('Скрыть разбор по критериям') : t('Разбор по критериям')}
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div className="flex flex-col" style={{ gap: 10, marginTop: 10 }}>
          {tasks.map(task => (
            <div key={task.n} style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(var(--glass-rgb), 0.7)' }}>
              <div className="flex items-center" style={{ gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>
                {t('Задание')} {task.n}
                {task.kim_n != null && <span style={{ color: 'var(--color-text-3)', fontWeight: 600 }}>· {t('как в КИМ')} № {task.kim_n}</span>}
                <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{task.points} / {task.max_points}</span>
              </div>
              <div className="flex flex-col" style={{ gap: 6, marginTop: 6 }}>
                {task.elements.map((e, i) => (
                  <div key={i} className="flex" style={{ gap: 8, fontSize: 12, lineHeight: 1.3 }}>
                    <span style={{
                      flexShrink: 0, width: 16, textAlign: 'center', fontWeight: 700,
                      color: e.counted ? 'var(--color-green-text)' : e.verdict === 'no' ? 'var(--color-red-text)' : 'var(--color-amber-text)',
                    }}>{e.counted ? '✓' : MARK[e.verdict]}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: 'var(--color-text)' }}>{e.text}</div>
                      {e.quote && (
                        <div style={{ color: 'var(--color-text-3)', marginTop: 2 }}>
                          {e.from === 'photo' ? `${t('с фото')}: ` : ''}«{e.quote}»{e.verdict === 'yes' && !e.counted ? ` — ${t('цитаты нет в ответе, не засчитано')}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {task.note && tasks.length > 1 && <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 6, lineHeight: 1.3 }}>{task.note}</div>}
            </div>
          ))}
        </div>
      )}

      {(scored || !!comment) && !decided && !done && (
        <div className="flex items-center flex-wrap" style={{ gap: 8, marginTop: 12 }}>
          {scored && <motion.button
            whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
            onClick={onAccept}
            className="flex items-center cursor-pointer"
            style={{
              height: 36, gap: 6, padding: '0 14px', borderRadius: 12, border: 'none',
              background: 'var(--grad-purple)', color: '#fff', fontSize: 13, fontWeight: 700,
            }}
          >
            <Check size={16} strokeWidth={2.5} />
            {t('Ок, отправить')}
          </motion.button>}
          <motion.button
            whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
            onClick={onEdit}
            className="flex items-center cursor-pointer"
            style={{
              height: 36, gap: 6, padding: '0 14px', borderRadius: 12,
              border: '1px solid var(--color-border-medium)', background: 'rgba(var(--glass-rgb), 0.9)',
              color: 'var(--color-text)', fontSize: 13, fontWeight: 600,
            }}
          >
            <PenLine size={15} />
            {t('Править')}
          </motion.button>
        </div>
      )}
    </div>
  )
}
