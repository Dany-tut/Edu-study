// ─────────────────────────────────────────────────────────────────────────────
// «Слова урока» — знакомство со словом ДО заданий.
//
// ЗАЧЕМ. Словарные карточки лежат в конце домашки и работают на проверку:
// показано слово — впиши перевод. Проверка правильная, но до неё слово нигде не
// вводилось: первым, что видел ученик, было упражнение, требующее уже знать
// слово. Этот блок закрывает дыру ровно так, как это устроено у LingoDeer:
// сначала показать слово (запись, чтение, значение, картинка, звук), потом
// спрашивать.
//
// ПОЧЕМУ ЗДЕСЬ ВИДНЫ ОТВЕТЫ КАРТОЧЕК. Это не утечка, а замысел: карточка внизу
// домашки — не экзамен, а retrieval practice сразу после знакомства. Балл за
// домашку от этого чуть растёт, и это дешевле, чем ученик, который впервые
// встречает 우유 в поле ввода.
//
// Данные берутся из самих flashcard-заданий домашки — отдельной сущности «словарь
// урока» не заводится, иначе одно и то же слово пришлось бы держать в двух местах.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, Layers, Rows3 } from 'lucide-react'
import type { HomeworkQuizQuestion } from '../data/lessonContent'
import { useReadingVisible } from '../store/readingStore'
import { useT } from '../lib/i18n'
import { bindShortWords, proseWrap } from '../lib/typography'
import { speechMs, speechText } from '../lib/speech'
import AudioPlayer from './AudioPlayer'

/**
 * «Карточка — это один знак»: буква хангыля, кана, иероглиф. У таких карточек
 * смотреть, кроме самого знака, не на что, поэтому он печатается крупно.
 * Ровно ОДИН символ: 우유 — это уже слово, и раздувать его до размера буквы
 * не за чем.
 * Латиница сюда не попадает: «a» в английском уроке — это слово, а не знак.
 */
const GLYPH_RE = /^[\u1100-\u11FF\u3040-\u30FF\u3130-\u318F\u3400-\u9FFF\uAC00-\uD7AF]$/
function isGlyph(face: string) {
  return GLYPH_RE.test(face.trim())
}

export default function VocabIntro({ words, accent, soft, defaultOpen, started = false }: {
  /** flashcard-задания домашки — по ним и строится словарь урока. */
  words: HomeworkQuizQuestion[]
  accent: string
  soft: string
  /** Открыт ли блок сразу: на знакомстве — да, после первого ответа — нет. */
  defaultOpen: boolean
  /**
   * Задания уже начаты. Блок остаётся доступным (закрывать словарь на замок
   * бессмысленно — рядом лежит учебник), но перестаёт быть открытым по
   * умолчанию и честно говорит, что подсказка есть в самом задании.
   */
  started?: boolean
}) {
  const t = useT()
  const [open, setOpen] = useState(defaultOpen)
  /** Карточка, которая звучит прямо сейчас (одновременно звучит только одна). */
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const { visible: readingVisible, toggle: toggleReading } = useReadingVisible()
  /**
   * Знакомство по одному слову.
   *
   * ЗАЧЕМ ВТОРОЙ ВИД. Сетка из двенадцати карточек — это справочник: в ней
   * удобно найти забытое слово, но невозможно ПОЗНАКОМИТЬСЯ. Глаз проходит
   * по ней за несколько секунд, ученик закрывает блок и идёт в задания, где
   * его спрашивают слово, на которое он смотрел полсекунды.
   *
   * Пошаговый проход отдаёт экран одному слову: запись, чтение, значение,
   * рисунок, звук — и кнопка «дальше». Ровно та же операция, что в LingoDeer
   * и Anki на первом показе колоды.
   *
   * ПОЧЕМУ НЕ ЗАМЕНОЙ СЕТКИ. Оба вида нужны в разные моменты: до заданий —
   * проход, посреди заданий («как там было это слово») — сетка. Поэтому это
   * тумблер, а не режим, и по умолчанию открыт проход только на знакомстве.
   */
  const [step, setStep] = useState<number | null>(defaultOpen ? 0 : null)

  if (words.length === 0) return null
  const hasReading = words.some(w => !!w.reading?.trim())
  const walking = step !== null
  const current = walking ? words[Math.min(step, words.length - 1)] : null

  return (
    <div style={{
      borderRadius: 22, border: '1px solid var(--color-border)',
      background: 'var(--color-bg-2)', overflow: 'hidden',
    }}>
      <div className="flex items-center" style={{ gap: 10, padding: '14px 18px' }}>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center cursor-pointer flex-1 min-w-0"
          style={{ gap: 10, border: 'none', background: 'none', padding: 0, fontFamily: 'inherit', textAlign: 'left' }}
        >
          <span style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, borderRadius: 10, background: soft, color: accent, flexShrink: 0,
          }}>
            <Layers size={16} />
          </span>
          <span className="min-w-0">
            <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
              {t('Слова урока')} · {words.length}
            </span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--color-muted)' }}>
              {started
                ? t('Задания уже начаты — забытое слово быстрее открыть подсказкой в самом задании')
                : t('Посмотри перед заданиями — дальше они спросятся')}
            </span>
          </span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ marginLeft: 'auto', display: 'flex', color: 'var(--color-muted)' }}
          >
            <ChevronDown size={18} />
          </motion.span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 18px 18px' }}>
              {/* Оба тумблера — одной строкой: по отдельности каждый занимал
                  свою строку и над списком слов вырастала лестница из кнопок. */}
              <div className="flex items-center flex-wrap" style={{ gap: 8, marginBottom: 12 }}>
              {/* Тумблер чтения. Показывается только там, где чтение вообще есть:
                  у английского или португальского его нет ни у одного слова, и
                  пустая кнопка «Чтение» в такой домашке только сбивала бы. */}
              {hasReading && (
                <button
                  onClick={toggleReading}
                  className="flex items-center cursor-pointer"
                  style={{
                    gap: 6, padding: '6px 12px', borderRadius: 999,
                    border: `1px solid ${readingVisible ? accent : 'var(--color-border)'}`,
                    background: readingVisible ? soft : 'transparent',
                    color: readingVisible ? accent : 'var(--color-muted)',
                    fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                  }}
                >
                  {readingVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                  {t('Чтение')}
                </button>
              )}

              {/* Переключатель «проход по одному ↔ вся сетка». Не показывается
                  на двух-трёх словах: проход по ним не отличается от списка. */}
              {words.length > 3 && (
                <button
                  onClick={() => setStep(s => (s === null ? 0 : null))}
                  className="flex items-center cursor-pointer"
                  style={{
                    gap: 6, padding: '6px 12px', borderRadius: 999,
                    border: `1px solid ${walking ? accent : 'var(--color-border)'}`,
                    background: walking ? soft : 'transparent',
                    color: walking ? accent : 'var(--color-muted)',
                    fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                  }}
                >
                  {walking ? <Rows3 size={13} /> : <ChevronRight size={13} />}
                  {walking ? t('Показать все') : t('По одному')}
                </button>
              )}

              </div>

              <div style={{
                display: 'grid', gap: 10,
                gridTemplateColumns: walking ? '1fr' : 'repeat(auto-fill, minmax(190px, 1fr))',
              }}>
                {(walking && current ? [current] : words).map(w => {
                  const face = w.front || w.prompt
                  const tts = speechText(face)
                  const speaking = speakingId === w.id
                  /** Одиночный знак без картинки — печатаем его крупно: в юните
                      хангыля вся карточка и есть эта буква. */
                  const glyph = !w.image && isGlyph(face)
                  const audio = (
                    <AudioPlayer
                      ttsText={tts}
                      lang={w.lang}
                      compact
                      variant="ghost"
                      accent={accent}
                      soft={soft}
                      onPlayingChange={p => setSpeakingId(cur => (p ? w.id : cur === w.id ? null : cur))}
                    />
                  )
                  return (
                  <div
                    key={w.id}
                    style={{
                      position: 'relative', overflow: 'hidden',
                      display: 'flex', flexDirection: 'column', gap: 4,
                      // Карточка-знак читается как одна вывеска: без картинки
                      // прижимать букву к левому краю не за чем — центрируем.
                      alignItems: glyph ? 'center' : 'stretch',
                      textAlign: glyph ? 'center' : 'left',
                      padding: '12px 14px', borderRadius: 16,
                      border: `1px solid ${speaking ? accent : 'var(--color-border-soft)'}`,
                      background: 'var(--color-bg-input)',
                      transition: 'border-color .18s ease',
                    }}
                  >
                    {/* Плитка предмета — только там, где рисунок ЕСТЬ.
                        Раньше пустая рамка с перечёркнутой картинкой стояла у
                        каждой карточки ради ровного ряда, но в алфавитных
                        юнитах рисунка нет ни у одной буквы: ряд из десяти
                        заглушек «фото нет» — это шум там, где смотреть надо на
                        саму букву. Без картинки плитки нет, а знак печатается
                        крупно (см. glyph ниже). */}
                    {w.image && (
                      <span style={{
                        width: 52, height: 52, borderRadius: 13, marginBottom: 6, flexShrink: 0,
                        display: 'grid', placeItems: 'center', overflow: 'hidden',
                        background: '#fff', border: '1px solid var(--color-border-soft)',
                      }}>
                        <img src={w.image} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
                      </span>
                    )}
                    <div className="flex items-center" style={{ gap: 8, justifyContent: glyph ? 'center' : undefined }}>
                      <span style={{
                        fontSize: glyph ? 40 : 18, fontWeight: 700, color: 'var(--color-text)',
                        lineHeight: glyph ? 1.1 : 1.25, ...proseWrap,
                      }}>
                        {face}
                      </span>
                      {/* У карточки-знака кнопка не встаёт рядом с буквой: пара
                          «буква + круг» смотрится сдвинутой с центра, а сама
                          буква из-за неё перестаёт быть центром карточки.
                          Поэтому там звук уезжает вниз, под значение. */}
                      {!glyph && (
                        <span style={{ marginLeft: 'auto', flexShrink: 0 }}>{audio}</span>
                      )}
                    </div>
                    {readingVisible && w.reading && (
                      <span style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 600 }}>{w.reading}</span>
                    )}
                    <span style={{ fontSize: 14, color: 'var(--color-text-2)', ...proseWrap }}>{bindShortWords(w.back ?? '')}</span>
                    {glyph && <span style={{ marginTop: 6 }}>{audio}</span>}

                    {/* Индикатор озвучки: линия по низу карточки заполняется, пока
                        слово произносится. Анимация чисто CSS — rAF в превью не
                        срабатывает, а этот индикатор должен работать везде. */}
                    {speaking && (
                      <span
                        aria-hidden
                        style={{
                          position: 'absolute', left: 0, right: 0, bottom: 0, height: 3,
                          background: soft, overflow: 'hidden',
                        }}
                      >
                        <span
                          className="vocab-speak-fill"
                          style={{ background: accent, animationDuration: `${speechMs(tts)}ms` }}
                        />
                      </span>
                    )}
                  </div>
                  )
                })}
              </div>

              {/* Навигация прохода. Точки, а не полоса прогресса: слов десяток,
                  и по точкам сразу видно, сколько ещё осталось. */}
              {walking && (
                <div className="flex items-center" style={{ gap: 10, marginTop: 12 }}>
                  <button
                    onClick={() => setStep(s => Math.max(0, (s ?? 0) - 1))}
                    disabled={step === 0}
                    className="flex items-center justify-center cursor-pointer"
                    style={{
                      width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                      border: '1px solid var(--color-border)', background: 'transparent',
                      color: step === 0 ? 'var(--color-border)' : 'var(--color-muted)',
                      cursor: step === 0 ? 'default' : 'pointer',
                    }}
                    aria-label={t('Предыдущее слово')}
                  >
                    <ChevronLeft size={17} />
                  </button>

                  <div className="flex items-center flex-wrap" style={{ gap: 5 }}>
                    {words.map((w, i) => (
                      <button
                        key={w.id}
                        onClick={() => setStep(i)}
                        className="cursor-pointer"
                        style={{
                          width: i === step ? 18 : 7, height: 7, borderRadius: 999, padding: 0,
                          border: 'none', background: i <= (step ?? 0) ? accent : 'var(--color-border)',
                          opacity: i === step ? 1 : i < (step ?? 0) ? 0.45 : 1,
                          transition: 'width .18s ease, opacity .18s ease',
                        }}
                        aria-label={`${t('Слово')} ${i + 1}`}
                      />
                    ))}
                  </div>

                  {/* Последнее слово закрывает проход и оставляет сетку: она и
                      нужна дальше — как справочник посреди заданий. */}
                  <button
                    onClick={() => setStep(s => ((s ?? 0) + 1 >= words.length ? null : (s ?? 0) + 1))}
                    className="flex items-center cursor-pointer"
                    style={{
                      marginLeft: 'auto', flexShrink: 0, gap: 6,
                      padding: '9px 16px', borderRadius: 12, border: 'none',
                      background: accent, color: '#fff',
                      fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                    }}
                  >
                    {(step ?? 0) + 1 >= words.length ? t('Готово') : t('Дальше')}
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
