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
import { ChevronDown, Eye, EyeOff, Layers } from 'lucide-react'
import type { HomeworkQuizQuestion } from '../data/lessonContent'
import { useReadingVisible } from '../store/readingStore'
import { useT } from '../lib/i18n'
import { speechMs, speechText } from '../lib/speech'
import AudioPlayer from './AudioPlayer'

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

  if (words.length === 0) return null
  const hasReading = words.some(w => !!w.reading?.trim())

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
              {/* Тумблер чтения. Показывается только там, где чтение вообще есть:
                  у английского или португальского его нет ни у одного слова, и
                  пустая кнопка «Чтение» в такой домашке только сбивала бы. */}
              {hasReading && (
                <button
                  onClick={toggleReading}
                  className="flex items-center cursor-pointer"
                  style={{
                    gap: 6, marginBottom: 12, padding: '6px 12px', borderRadius: 999,
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

              <div style={{
                display: 'grid', gap: 10,
                gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
              }}>
                {words.map(w => {
                  const face = w.front || w.prompt
                  const tts = speechText(face)
                  const speaking = speakingId === w.id
                  return (
                  <div
                    key={w.id}
                    style={{
                      position: 'relative', overflow: 'hidden',
                      display: 'flex', flexDirection: 'column', gap: 4,
                      padding: '12px 14px', borderRadius: 16,
                      border: `1px solid ${speaking ? accent : 'var(--color-border-soft)'}`,
                      background: 'var(--color-bg-input)',
                      transition: 'border-color .18s ease',
                    }}
                  >
                    {w.image && (
                      <img
                        src={w.image}
                        alt=""
                        style={{ display: 'block', width: 64, height: 64, objectFit: 'contain', borderRadius: 10, background: '#fff', marginBottom: 4 }}
                      />
                    )}
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.25 }}>
                        {face}
                      </span>
                      <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
                        <AudioPlayer
                          ttsText={tts}
                          lang={w.lang}
                          compact
                          onPlayingChange={p => setSpeakingId(cur => (p ? w.id : cur === w.id ? null : cur))}
                        />
                      </span>
                    </div>
                    {readingVisible && w.reading && (
                      <span style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 600 }}>{w.reading}</span>
                    )}
                    <span style={{ fontSize: 14, color: 'var(--color-text-2)' }}>{w.back}</span>

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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
