import { useState } from 'react'
import { usePersistentState, clearDraft } from '../lib/useDraft'
import { motion } from 'framer-motion'
import { ChevronLeft, ClipboardCheck, CheckCircle2, ArrowUp, ArrowDown } from 'lucide-react'
import { type Lesson, type TestTask } from '../data/mockData'
import { normalizeTaskType } from '../data/taskTypeVisuals'
import { charUnits, crosswordClues, gradeTask, isAutoGradable, sentenceTokens, type TaskAnswer } from '../data/taskTypes'
import WordBankSolver from './WordBankSolver'
import CharTilesSolver from './CharTilesSolver'
import BlockOrderSolver from './BlockOrderSolver'
import JamoTypeSolver from './JamoTypeSolver'
import WordDropSolver from './WordDropSolver'
import CrosswordSolver from './CrosswordSolver'
import DialogGapSolver from './DialogGapSolver'
import { keysOf } from '../data/hangul'
import ChamoTrace from './ChamoTrace'
import SyllableBuilder from './SyllableBuilder'
import MatchingSolver, { matchingFromMap, matchingToMap } from './MatchingSolver'
import AudioPlayer from './AudioPlayer'
import TaskVideo from './TaskVideo'
import { upsertLessonProgress } from '../lib/db'
import { ownerStudentIdFor } from '../store/studentDataStore'
import { getStudentSession } from '../lib/studentSession'
import { useStudentData } from '../store/studentDataStore'
import { useIsDesktop } from '../lib/useIsDesktop'
import { useSwipeBack } from '../lib/useSwipeBack'
import QuestionTable from './QuestionTable'
import GrowTextarea, { growMinHeight } from './GrowTextarea'
import HangulKeyboard, { needsHangul } from './HangulKeyboard'
import { useT } from '../lib/i18n'
import { bindShortWords, proseWrap } from '../lib/typography'
import { DEFAULT_IMAGE_SIZE } from '../data/taskTypes'

/**
 * Поля ответа в тесте живут по тем же правилам, что и в домашке: обнимают
 * текст (внутреннего скролла нет), дно — четыре строки, уголка ручного
 * ресайза нет. Разные высоты у одинаковых по смыслу полей в двух режимах
 * сбивали с толку — тест и домашка для ученика одно и то же поле ответа.
 */
const TEST_ANSWER_MIN_H = growMinHeight(4, 14, 11, 1.5)

function taskType(t: TestTask) { return normalizeTaskType(t.type) }

export default function TestFlow({ lesson, onBack }: { lesson: Lesson; onBack: () => void }) {
  const t = useT()
  const tasks = lesson.testTasks ?? []
  const isDesktop = useIsDesktop()
  // Свайп от левого края = кнопка «Назад» в шапке теста.
  useSwipeBack(onBack, !isDesktop)
  const reload = useStudentData(s => s.load)
  // Ответы переживают перезагрузку: тест из пятнадцати заданий заполняют не в
  // один присест, и F5 (или автоперезагрузка после деплоя) не должен стирать
  // работу. Черновик привязан к уроку и снимается только после отправки.
  const ANSWERS_KEY = `test.${lesson.id}.answers`
  const [answers, setAnswers] = usePersistentState<Record<string, TaskAnswer>>(ANSWERS_KEY, {})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; correct: number; gradable: number } | null>(null)

  function setAnswer(id: string, value: TaskAnswer) {
    setAnswers(a => ({ ...a, [id]: value }))
  }

  /** Табличный ответ — вложенный объект «ключ ячейки → значение» под id задания.
   *  Раньше ячейки лежали плоско под `${id}_${key}`, из-за чего проверить таблицу
   *  целиком было нечем и она не оценивалась вовсе. */
  function setCell(id: string, key: string, value: string) {
    setAnswers(a => ({ ...a, [id]: { ...(a[id] as Record<string, string> | undefined), [key]: value } }))
  }

  function toggleMulti(id: string, idx: number) {
    const prev = (answers[id] as number[] | undefined) ?? []
    const next = prev.includes(idx) ? prev.filter(x => x !== idx) : [...prev, idx]
    setAnswer(id, next)
  }

  function moveSeq(id: string, items: string[], pos: number, dir: -1 | 1) {
    const order = (answers[id] as number[] | undefined) ?? items.map((_, i) => i)
    const to = pos + dir
    if (to < 0 || to >= order.length) return
    const next = [...order];[next[pos], next[to]] = [next[to], next[pos]]
    setAnswer(id, next)
  }

  async function submit() {
    const session = getStudentSession()
    if (!session) return
    setSubmitting(true)

    const gradable = tasks.filter(isAutoGradable)
    const correct = gradable.filter(t => gradeTask(t, answers[t.id] ?? null).correct).length
    const score = gradable.length > 0 ? Math.round((correct / gradable.length) * 100) : 0

    await upsertLessonProgress(ownerStudentIdFor(lesson.subject), lesson.id, lesson.subject, {
      status: 'submitted',
      score,
    })
    await reload()
    clearDraft(ANSWERS_KEY)
    setResult({ score, correct, gradable: gradable.length })
    setSubmitting(false)
  }

  // ── Result screen ──
  if (result) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <CheckCircle2 size={38} style={{ color: 'var(--color-green-text)' }} />
        </motion.div>
        <h2 style={{ fontSize: 22, fontWeight: 750, color: 'var(--color-text)', marginBottom: 6 }}>{t('Тест отправлен!')}</h2>
        <p style={{ fontSize: 14, color: 'var(--color-muted)', marginBottom: 20 }}>
          {result.gradable > 0
            ? `${t('Верно')} ${result.correct} ${t('из')} ${result.gradable} · ${result.score}%`
            : t('Ответы отправлены преподавателю на проверку')}
        </p>
        <button onClick={onBack} style={{ padding: '11px 26px', borderRadius: 14, border: 'none', background: 'var(--grad-purple)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {t('К курсу')}
        </button>
      </div>
    )
  }

  const answeredCount = tasks.filter(t => {
    const a = answers[t.id]
    if (Array.isArray(a)) return a.length > 0
    return a !== undefined && a !== ''
  }).length

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '12px 20px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button onClick={onBack} aria-label={t('Назад')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: isDesktop ? '7px 12px' : 7, borderRadius: 999, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', fontFamily: 'inherit' }}>
          <ChevronLeft size={15} /> {isDesktop && t('Назад')}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 13px', borderRadius: 999, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 12, fontWeight: 700 }}>
          <ClipboardCheck size={14} /> {t('Финальный тест')}
        </div>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>{lesson.title || t('Тест')}</h1>
      <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 24 }}>{tasks.length} {t(tasks.length === 1 ? 'вопрос' : 'вопросов')}</p>

      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-muted)' }}>{t('В тесте пока нет вопросов')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tasks.map((task, i) => {
            const tp = taskType(task)
            const seqItems = task.sequenceItems ?? []
            const seqOrder = (answers[task.id] as number[] | undefined) ?? seqItems.map((_, idx) => idx)

            return (
              <div key={task.id} style={{ background: 'rgba(var(--glass-rgb), 0.7)', border: '1px solid var(--color-border-glass)', borderRadius: 16, padding: '18px 20px' }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--color-purple-soft)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', paddingTop: 3, ...proseWrap }}>{bindShortWords(task.question || task.label)}</div>
                </div>

                {/* Картинка условия. В тесте она рисуется по тем же правилам,
                    что и в домашке: без неё задание «что изображено» решить
                    нельзя, а тест собирается из тех же заданий. */}
                {task.image && (
                  <img
                    src={task.image}
                    alt=""
                    style={{
                      display: 'block', marginLeft: 36, marginBottom: 12, borderRadius: 12,
                      width: `${task.imageSize ?? DEFAULT_IMAGE_SIZE}%`, maxWidth: 'calc(100% - 36px)',
                      border: '1px solid var(--color-border)', background: '#fff',
                    }}
                  />
                )}

                {/* single — radio */}
                {tp === 'single' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 36 }}>
                    {(task.choices ?? []).map((ch, ci) => {
                      const selected = answers[task.id] === ci
                      return (
                        <button key={ci} onClick={() => setAnswer(task.id, ci)} style={{
                          display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                          padding: '11px 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                          border: selected ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border-soft)',
                          background: selected ? 'var(--color-purple-soft)' : 'var(--color-bg-2)',
                          fontSize: 14, color: 'var(--color-text)', fontWeight: selected ? 600 : 400,
                        }}>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, border: selected ? '5px solid var(--color-accent)' : '2px solid var(--color-border-medium)', transition: 'all 0.12s' }} />
                          <span style={proseWrap}>{bindShortWords(ch)}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* multi — checkboxes */}
                {tp === 'multi' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 36 }}>
                    {(task.choices ?? []).map((ch, ci) => {
                      const selected = ((answers[task.id] as number[] | undefined) ?? []).includes(ci)
                      return (
                        <button key={ci} onClick={() => toggleMulti(task.id, ci)} style={{
                          display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                          padding: '11px 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                          border: selected ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border-soft)',
                          background: selected ? 'var(--color-purple-soft)' : 'var(--color-bg-2)',
                          fontSize: 14, color: 'var(--color-text)', fontWeight: selected ? 600 : 400,
                        }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                            border: selected ? '2px solid var(--color-accent)' : '2px solid var(--color-border-medium)',
                            background: selected ? 'var(--color-accent)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s',
                          }}>
                            {selected && <span style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>✓</span>}
                          </div>
                          <span style={proseWrap}>{bindShortWords(ch)}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* fill / extended — растущее поле ответа (разница только в
                    подсказке: короткий ответ или развёрнутый).
                    Сюда же падает недозаполненная письменность (тип выбран, а
                    буква или слог не указаны): без этого запаса такое задание
                    осталось бы вовсе без поля ответа — решить его нельзя. */}
                {(tp === 'fill' || tp === 'extended'
                  || (tp === 'trace' && !task.chamo)
                  || (tp === 'buildSyllable' && !task.syllable)
                  || ((tp === 'unscramble' || tp === 'charBank') && charUnits(task.answer ?? '').length < 2)
                  || (tp === 'blockOrder' && seqItems.length === 0)
                  || (tp === 'jamoType' && charUnits(task.answer ?? '').flatMap(keysOf).length < 2)
                  || (tp === 'dialogGap' && (!task.answer?.trim() || (task.dialog?.length ?? 0) < 2))
                  || (tp === 'wordDrop' && !(task.gaps ?? []).some(g => !!g.answer?.trim()))
                  || (tp === 'crossword' && crosswordClues(task).length < 2)) && (
                  <div style={{ paddingLeft: 36, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <GrowTextarea
                      value={(answers[task.id] as string) ?? ''}
                      onChange={v => setAnswer(task.id, v)}
                      placeholder={tp === 'fill' ? t('Твой ответ…') : t('Развёрнутый ответ…')}
                      minHeight={TEST_ANSWER_MIN_H}
                      inputMode={needsHangul(task.answer) ? 'none' : undefined}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--color-border-soft)', background: 'var(--color-bg-input)', fontSize: 14, color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit' }}
                    />
                    {/* Ответ по-корейски — раскладки у ученика нет (HangulKeyboard). */}
                    {needsHangul(task.answer) && (
                      <HangulKeyboard
                        value={answers[task.id] as string | undefined}
                        onChange={v => setAnswer(task.id, v)}
                      />
                    )}
                  </div>
                )}

                {/* matching — соединить пары: правые части перемешаны в банке.
                    Ответ пишется картой left→right — ровно её ждёт gradeTask(). */}
                {tp === 'matching' && (task.pairs?.length ?? 0) >= 2 && (
                  <div style={{ paddingLeft: 36 }}>
                    <MatchingSolver
                      pairs={task.pairs!}
                      value={matchingFromMap(task.pairs!, answers[task.id])}
                      onChange={next => setAnswer(task.id, matchingToMap(task.pairs!, next))}
                    />
                  </div>
                )}

                {/* sequence — reorderable list */}
                {tp === 'sequence' && seqItems.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 36 }}>
                    {seqOrder.map((itemIdx, pos) => (
                      <div key={itemIdx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--color-yellow-soft)', color: 'var(--color-yellow-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{pos + 1}</span>
                        <div style={{ flex: 1, padding: '9px 12px', borderRadius: 10, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', fontSize: 14, color: 'var(--color-text)' }}>
                          {seqItems[itemIdx]}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <button onClick={() => moveSeq(task.id, seqItems, pos, -1)} disabled={pos === 0}
                            style={{ width: 24, height: 22, borderRadius: 6, border: 'none', background: 'var(--color-bg-3)', cursor: pos === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: pos === 0 ? 0.4 : 1 }}>
                            <ArrowUp size={12} style={{ color: 'var(--color-text-3)' }} />
                          </button>
                          <button onClick={() => moveSeq(task.id, seqItems, pos, 1)} disabled={pos === seqOrder.length - 1}
                            style={{ width: 24, height: 22, borderRadius: 6, border: 'none', background: 'var(--color-bg-3)', cursor: pos === seqOrder.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: pos === seqOrder.length - 1 ? 0.4 : 1 }}>
                            <ArrowDown size={12} style={{ color: 'var(--color-text-3)' }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* blockOrder — собрать последовательность тапами из банка блоков */}
                {tp === 'blockOrder' && seqItems.length > 0 && (
                  <div style={{ paddingLeft: 36 }}>
                    <BlockOrderSolver
                      items={seqItems}
                      value={(answers[task.id] as string) ?? undefined}
                      onChange={v => setAnswer(task.id, v)}
                    />
                  </div>
                )}

                {/* unscramble / charBank — сборка слова тапами по плиткам-слогам */}
                {(tp === 'unscramble' || tp === 'charBank') && charUnits(task.answer ?? '').length >= 2 && (
                  <div style={{ paddingLeft: 36 }}>
                    <CharTilesSolver
                      mode={tp === 'unscramble' ? 'unscramble' : 'bank'}
                      answer={task.answer!}
                      distractors={task.distractors}
                      value={(answers[task.id] as string) ?? undefined}
                      onChange={v => setAnswer(task.id, v)}
                    />
                  </div>
                )}

                {/* jamoType — экранная клавиатура: слоги складываются из нажатий */}
                {tp === 'jamoType' && charUnits(task.answer ?? '').flatMap(keysOf).length >= 2 && (
                  <div style={{ paddingLeft: 36 }}>
                    <JamoTypeSolver
                      answer={task.answer!}
                      value={(answers[task.id] as string) ?? undefined}
                      onChange={v => setAnswer(task.id, v)}
                    />
                  </div>
                )}

                {/* dialogGap — озвученный диалог с пропуском */}
                {tp === 'dialogGap' && (task.dialog?.length ?? 0) >= 2 && !!task.answer?.trim() && (
                  <div style={{ paddingLeft: 36 }}>
                    <DialogGapSolver
                      dialog={task.dialog!}
                      answer={task.answer!}
                      distractors={task.distractors}
                      lang={task.lang}
                      value={(answers[task.id] as string) ?? undefined}
                      onChange={v => setAnswer(task.id, v)}
                    />
                  </div>
                )}

                {/* wordDrop — пропуски в пачке строк по общему банку слов */}
                {tp === 'wordDrop' && (task.gaps ?? []).some(g => !!g.answer?.trim()) && (
                  <div style={{ paddingLeft: 36 }}>
                    <WordDropSolver
                      rows={(task.gaps ?? []).filter(g => !!g.answer?.trim())}
                      distractors={task.distractors}
                      value={(answers[task.id] as string) ?? undefined}
                      onChange={v => setAnswer(task.id, v)}
                    />
                  </div>
                )}

                {/* crossword — вспомнить слово по значению */}
                {tp === 'crossword' && crosswordClues(task).length >= 2 && (
                  <div style={{ paddingLeft: 36 }}>
                    <CrosswordSolver
                      clues={crosswordClues(task)}
                      value={(answers[task.id] as string) ?? undefined}
                      onChange={v => setAnswer(task.id, v)}
                    />
                  </div>
                )}

                {/* tableFill — cells with blanks */}
                {tp === 'tableFill' && task.table && (
                  <div style={{ paddingLeft: 36 }}>
                    {/* Unified table renderer — tests keep their per-cell answer
                        map and treat both empty and blank cells as fill-in. */}
                    <QuestionTable
                      table={task.table}
                      mobile={!isDesktop}
                      interactive
                      blankAsInput
                      cellValue={key => (answers[task.id] as Record<string, string> | undefined)?.[key] ?? ''}
                      onCellChange={(key, v) => setCell(task.id, key, v)}
                    />
                  </div>
                )}

                {/* whiteboard — textarea fallback */}
                {tp === 'whiteboard' && (
                  <div style={{ paddingLeft: 36 }}>
                    <GrowTextarea
                      value={(answers[task.id] as string) ?? ''}
                      onChange={v => setAnswer(task.id, v)}
                      placeholder={t('Опиши решение (рисунок на доске приложишь учителю)…')}
                      minHeight={TEST_ANSWER_MIN_H}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--color-border-soft)', background: 'var(--color-bg-input)', fontSize: 14, color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </div>
                )}

                {/* wordBank / listenBank — arrange word tiles (auto-graded via gradeTask) */}
                {(tp === 'wordBank' || tp === 'listenBank') && (
                  <div style={{ paddingLeft: 36, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {tp === 'listenBank' && (
                      <AudioPlayer audioUrl={task.audioUrl} ttsText={task.ttsText} ttsVoice={task.ttsVoice} allowSlow={task.allowSlow} lang={task.lang} />
                    )}
                    <WordBankSolver
                      tokens={sentenceTokens(task.sentence ?? '')}
                      distractors={task.distractors ?? []}
                      value={(answers[task.id] as string[] | undefined) ?? []}
                      onChange={words => setAnswer(task.id, words)}
                    />
                  </div>
                )}

                {/* listenType — audio dictation: hear → type (auto-graded) */}
                {tp === 'listenType' && (
                  <div style={{ paddingLeft: 36, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <AudioPlayer audioUrl={task.audioUrl} ttsText={task.ttsText} ttsVoice={task.ttsVoice} allowSlow={task.allowSlow} lang={task.lang} />
                    <GrowTextarea
                      value={(answers[task.id] as string) ?? ''}
                      onChange={v => setAnswer(task.id, v)}
                      placeholder={t('Напечатай, что услышал…')}
                      minHeight={TEST_ANSWER_MIN_H}
                      inputMode={needsHangul(task.answer) ? 'none' : undefined}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--color-border-soft)', background: 'var(--color-bg-input)', fontSize: 14, color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit' }}
                    />
                    {needsHangul(task.answer) && (
                      <HangulKeyboard
                        value={answers[task.id] as string | undefined}
                        onChange={v => setAnswer(task.id, v)}
                      />
                    )}
                  </div>
                )}

                {/* minimalPair — audio + pick which of two look-alikes was heard (auto-graded) */}
                {tp === 'minimalPair' && (
                  <div style={{ paddingLeft: 36, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <AudioPlayer audioUrl={task.audioUrl} ttsText={task.ttsText} ttsVoice={task.ttsVoice} allowSlow={task.allowSlow} lang={task.lang} />
                    <div style={{ display: 'flex', gap: 10 }}>
                      {(['A', 'B'] as const).map(side => {
                        const label = side === 'A' ? task.pairA : task.pairB
                        const selected = answers[task.id] === side
                        return (
                          <button key={side} onClick={() => setAnswer(task.id, side)} style={{
                            flex: 1, padding: '14px 16px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
                            fontSize: 15, fontWeight: 700, textAlign: 'center',
                            border: selected ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border-soft)',
                            background: selected ? 'var(--color-purple-soft)' : 'var(--color-bg-2)',
                            color: selected ? 'var(--color-accent)' : 'var(--color-text)',
                          }}>
                            {label || side}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* trace — обводка буквы по чертам. Ответ один: 'done', когда
                    пройдены все черты; сверять тут нечего, см. taskTypes.ts. */}
                {tp === 'trace' && task.chamo && (
                  <div style={{ paddingLeft: 36 }}>
                    <ChamoTrace
                      chamo={task.chamo}
                      value={(answers[task.id] as string) ?? undefined}
                      onChange={v => setAnswer(task.id, v)}
                    />
                  </div>
                )}

                {/* videoWatch — ролик прямо в тесте. Ответ набирает плеер:
                    засчитанный просмотр и есть выполненное задание. */}
                {tp === 'videoWatch' && task.videoUrl && (
                  <div style={{ paddingLeft: 36 }}>
                    <TaskVideo
                      url={task.videoUrl}
                      title={task.question?.trim() || task.label || t('Видео')}
                      credit={task.videoCredit}
                      startSeconds={task.videoStart}
                      watchSeconds={task.videoWatchSeconds}
                      value={(answers[task.id] as string) ?? undefined}
                      onChange={v => setAnswer(task.id, v)}
                    />
                  </div>
                )}

                {/* buildSyllable — слог собирают из букв; ответ пишется списком
                    букв через запятую, ровно его ждёт gradeTask(). */}
                {tp === 'buildSyllable' && task.syllable && (
                  <div style={{ paddingLeft: 36 }}>
                    <SyllableBuilder
                      syllable={task.syllable}
                      value={(answers[task.id] as string) ?? undefined}
                      onChange={v => setAnswer(task.id, v)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tasks.length > 0 && (
        <div style={{ position: 'sticky', bottom: 16, marginTop: 24, display: 'flex', justifyContent: 'center' }}>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={submit}
            disabled={submitting}
            style={{
              padding: '13px 40px', borderRadius: 16, border: 'none',
              background: 'var(--grad-purple)', color: '#fff', fontSize: 15, fontWeight: 750,
              cursor: submitting ? 'wait' : 'pointer', fontFamily: 'inherit',
              boxShadow: '0 8px 24px rgba(99,84,207,0.35)', opacity: submitting ? 0.7 : 1,
            }}>
            {submitting ? t('Отправляем…') : `${t('Отправить тест')} (${answeredCount}/${tasks.length})`}
          </motion.button>
        </div>
      )}
    </div>
  )
}
