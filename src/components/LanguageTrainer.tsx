import { useMemo, useState } from 'react'
import { BookOpen, Headphones, Layers, Mic, ChevronLeft, CheckCircle2, XCircle } from 'lucide-react'
import { textsForLang, type ReadingText, type ReadingQuestion } from '../data/readingLibrary'
import { languageTaxonomy } from '../data/languageTaxonomy'
import { subjectTheme } from '../lib/theme'
import { useT } from '../lib/i18n'
import ReviewSession from './ReviewSession'
import { ownerStudentIdFor } from '../store/studentDataStore'
import VoiceRecorder from './VoiceRecorder'

// Тренажёр для языковых предметов.
//
// ПОЧЕМУ ОТДЕЛЬНЫЙ КОМПОНЕНТ. Обычный тренажёр — это банк заданий ЕГЭ: карточка
// «условие → поле ответа → сверка строки». У языков банка нет вовсе
// (SUBJECTS[...].hasBank === false), и главное — язык так не тренируется:
// нужно читать, слушать, повторять слова и говорить, а не решать номера.
//
// ЧТО ЗДЕСЬ ЕСТЬ И ЧЕГО НЕТ. Чтение работает полностью. Слова переиспользуют
// готовую систему интервальных повторений. Аудирование пока опирается на
// ссылки к урокам курса, а не на собственную библиотеку. Говорение записывает
// ответ и отдаёт учителю — автоматической оценки произношения нет.

type Mode = 'reading' | 'vocab' | 'listening' | 'speaking'

const MODES: { id: Mode; label: string; hint: string; Icon: typeof BookOpen }[] = [
  { id: 'reading',   label: 'Чтение',     hint: 'Тексты с вопросами',       Icon: BookOpen },
  { id: 'vocab',     label: 'Слова',      hint: 'Повторение по расписанию', Icon: Layers },
  { id: 'listening', label: 'Аудирование', hint: 'Лекции и разговоры',      Icon: Headphones },
  { id: 'speaking',  label: 'Говорение',  hint: 'Записать и отправить',     Icon: Mic },
]

export default function LanguageTrainer({ lang, subject, subjectId, dark }: {
  /** Код изучаемого языка: en, ko, ja, pt-BR. */
  lang: string
  /** Русское название предмета — для палитры. */
  subject: string
  /** Слаг предмета — по нему берётся владелец колоды повторений. */
  subjectId: string
  dark: boolean
}) {
  const t = useT()
  const palette = subjectTheme(subject, dark)
  const [mode, setMode] = useState<Mode>('reading')
  const [openText, setOpenText] = useState<ReadingText | null>(null)

  const allTexts = useMemo(() => textsForLang(lang), [lang])

  // Фильтры по той же разметке, что у заданий: уровень / навык / тема.
  // Показываем только те значения, которые реально встречаются в текстах —
  // иначе ученик выбирает «B2» и получает пустой экран.
  const [fLevel, setFLevel] = useState('')
  const [fSkill, setFSkill] = useState('')
  const [fTopic, setFTopic] = useState('')
  const tax = useMemo(() => languageTaxonomy(subject), [subject])
  const present = <K extends keyof ReadingText>(key: K, order: string[]) => {
    const found = new Set(allTexts.map(x => String(x[key])))
    const ordered = order.filter(v => found.has(v))
    // Значения, которых нет в таксономии, всё равно показываем — иначе текст
    // с нестандартной пометкой стал бы недоступен через фильтр.
    const rest = [...found].filter(v => !order.includes(v))
    return [...ordered, ...rest]
  }
  const levelOpts = present('level', tax?.levels ?? [])
  const skillOpts = present('skill', tax?.skills ?? [])
  const topicOpts = present('topic', tax?.topics ?? [])

  const texts = useMemo(() => allTexts.filter(x =>
    (!fLevel || x.level === fLevel) &&
    (!fSkill || x.skill === fSkill) &&
    (!fTopic || x.topic === fTopic)), [allTexts, fLevel, fSkill, fTopic])

  if (openText) {
    return <Reader text={openText} accent={palette.accent} onBack={() => setOpenText(null)} />
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '8px 20px 80px' }}>
      {/* Переключатель режимов */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
        {MODES.map(m => {
          const active = m.id === mode
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                border: `1.5px solid ${active ? palette.accent : 'var(--color-border-soft)'}`,
                background: active ? palette.soft : 'var(--color-bg-2)',
                color: active ? palette.accent : 'var(--color-text-2)',
              }}
            >
              <m.Icon size={16} /> {t(m.label)}
            </button>
          )
        })}
      </div>

      {mode === 'reading' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <Chips label={t('Уровень')} value={fLevel} options={levelOpts} onChange={setFLevel} accent={palette.accent} />
          <Chips label={t('Навык')}   value={fSkill} options={skillOpts} onChange={setFSkill} accent={palette.accent} />
          <Chips label={t('Тема')}    value={fTopic} options={topicOpts} onChange={setFTopic} accent={palette.accent} />
        </div>
      )}

      {mode === 'reading' && (
        texts.length === 0 ? (
          <Empty text={allTexts.length === 0
            ? t('Для этого языка текстов пока нет. Учитель может добавить свои.')
            : t('Под выбранные фильтры ничего не подошло. Сбрось один из них.')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {texts.map(txt => (
              <button
                key={txt.id}
                onClick={() => setOpenText(txt)}
                style={{
                  textAlign: 'left', padding: '16px 18px', borderRadius: 18, cursor: 'pointer',
                  border: '1px solid var(--color-border)', background: 'var(--color-bg-2)',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: palette.soft, color: palette.accent }}>
                    {txt.level}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                    {txt.topic} · {txt.minutes} {t('мин')} · {txt.questions.length} {t('вопроса')}
                  </span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>{txt.title}</div>
              </button>
            ))}
          </div>
        )
      )}

      {mode === 'vocab' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 14, lineHeight: 1.6 }}>
            {t('Слова из уроков и ошибок повторяются по расписанию: каждое возвращается ровно тогда, когда его вот-вот забудешь.')}
          </p>
          <ReviewSession owner={{ studentId: ownerStudentIdFor(subjectId) }} />
        </div>
      )}

      {mode === 'listening' && (
        <Empty text={t('Аудирование пока идёт внутри уроков курса — там к каждому есть разбор и видео. Отдельная библиотека лекций в работе.')} />
      )}

      {mode === 'speaking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6 }}>
            {t('Запиши короткий рассказ о себе или ответ на вопрос урока. Запись уйдёт преподавателю — он послушает и разберёт.')}
          </p>
          <VoiceRecorder value={null} onChange={() => {}} maxSeconds={120} />
        </div>
      )}
    </div>
  )
}

/** Одна ось фильтра: подпись + значения. Пустое значение = «все». */
function Chips({ label, value, options, onChange, accent }: {
  label: string; value: string; options: string[]
  onChange: (v: string) => void; accent: string
}) {
  if (options.length < 2) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--color-text-3)' }}>
        {label}
      </span>
      {options.map(o => {
        const on = value === o
        return (
          <button key={o} onClick={() => onChange(on ? '' : o)}
            style={{
              padding: '5px 11px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12.5, fontWeight: 650,
              border: `1px solid ${on ? accent : 'var(--color-border-soft)'}`,
              background: on ? 'var(--color-bg-3)' : 'var(--color-bg-2)',
              color: on ? accent : 'var(--color-text-2)',
            }}>
            {o}
          </button>
        )
      })}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{
      padding: '34px 22px', borderRadius: 18, textAlign: 'center',
      border: '1px dashed var(--color-border-medium)', background: 'var(--color-bg-2)',
      fontSize: 14, lineHeight: 1.6, color: 'var(--color-muted)',
    }}>
      {text}
    </div>
  )
}

// ─── Читалка ─────────────────────────────────────────────────────────────────

function Reader({ text, accent, onBack }: { text: ReadingText; accent: string; onBack: () => void }) {
  const t = useT()
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [checked, setChecked] = useState(false)
  const [gloss, setGloss] = useState<string | null>(null)

  const correctCount = text.questions.filter((q, i) => answers[i] === q.correct).length
  const allAnswered = text.questions.every((_, i) => answers[i] !== undefined)

  // Слова из глоссария подсвечиваются прямо в тексте: клик показывает перевод,
  // не уводя со страницы. Это и есть главная механика чтения на языке —
  // посмотреть слово и остаться в тексте, а не уйти в словарь и потерять нить.
  const glossMap = useMemo(
    () => new Map(text.glossary.map(g => [g.term.toLowerCase(), g.ru])),
    [text.glossary],
  )

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '8px 20px 80px' }}>
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 999,
          border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', fontFamily: 'inherit', marginBottom: 16,
        }}
      >
        <ChevronLeft size={15} /> {t('К списку')}
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>{text.title}</h1>
      <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 18 }}>
        {text.level} · {text.topic} · {text.minutes} {t('мин')}
        {text.credit && ` · ${text.credit}`}
      </p>

      <div style={{
        padding: '18px 20px', borderRadius: 18, background: 'var(--color-bg-2)',
        border: '1px solid var(--color-border-soft)', fontSize: 16, lineHeight: 1.85,
        color: 'var(--color-text)', whiteSpace: 'pre-wrap', marginBottom: 12,
      }}>
        {text.body}
      </div>

      {/* Словарик: тап по слову раскрывает перевод */}
      {text.glossary.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 22 }}>
          {text.glossary.map(g => (
            <button
              key={g.term}
              onClick={() => setGloss(gloss === g.term ? null : g.term)}
              style={{
                padding: '6px 11px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 13, fontWeight: 600,
                border: `1px solid ${gloss === g.term ? accent : 'var(--color-border-soft)'}`,
                background: gloss === g.term ? 'var(--color-bg-3)' : 'var(--color-bg-2)',
                color: gloss === g.term ? accent : 'var(--color-text-2)',
              }}
            >
              {g.term}{gloss === g.term && ` — ${glossMap.get(g.term.toLowerCase())}`}
            </button>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 12 }}>
        {t('Вопросы к тексту')}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {text.questions.map((q, qi) => (
          <QuestionCard
            key={qi}
            q={q}
            index={qi}
            value={answers[qi]}
            checked={checked}
            accent={accent}
            onPick={v => !checked && setAnswers(a => ({ ...a, [qi]: v }))}
          />
        ))}
      </div>

      {!checked ? (
        <button
          onClick={() => setChecked(true)}
          disabled={!allAnswered}
          style={{
            marginTop: 22, width: '100%', padding: '13px', borderRadius: 16, border: 'none',
            cursor: allAnswered ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            fontSize: 15, fontWeight: 700, color: '#fff',
            background: allAnswered ? accent : 'var(--color-border-medium)',
          }}
        >
          {allAnswered ? t('Проверить') : t('Ответь на все вопросы')}
        </button>
      ) : (
        <div style={{
          marginTop: 22, padding: '16px 18px', borderRadius: 18, textAlign: 'center',
          background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
            {correctCount} / {text.questions.length}
          </div>
          {/* Перевод открывается только после проверки: иначе читать оригинал незачем. */}
          {text.translation && (
            <details style={{ marginTop: 10, textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: accent }}>
                {t('Перевод текста')}
              </summary>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-2)', marginTop: 8, whiteSpace: 'pre-wrap' }}>
                {text.translation}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

function QuestionCard({ q, index, value, checked, accent, onPick }: {
  q: ReadingQuestion; index: number; value?: number; checked: boolean
  accent: string; onPick: (v: number) => void
}) {
  return (
    <div style={{ padding: '15px 17px', borderRadius: 18, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)' }}>
      <div style={{ fontSize: 15, fontWeight: 650, color: 'var(--color-text)', marginBottom: 11 }}>
        {index + 1}. {q.q}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {q.options.map((opt, oi) => {
          const picked = value === oi
          const right = q.correct === oi
          const showRight = checked && right
          const showWrong = checked && picked && !right
          return (
            <button
              key={oi}
              onClick={() => onPick(oi)}
              disabled={checked}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left',
                padding: '10px 13px', borderRadius: 13, fontFamily: 'inherit', fontSize: 14,
                cursor: checked ? 'default' : 'pointer', color: 'var(--color-text)',
                border: `1.5px solid ${showRight ? '#6EE7A0' : showWrong ? '#F48B91' : picked ? accent : 'var(--color-border-soft)'}`,
                background: showRight ? 'var(--color-green-soft)' : showWrong ? 'var(--color-red-soft)' : picked ? 'var(--color-bg-3)' : 'var(--color-bg-input)',
              }}
            >
              {checked && (showRight ? <CheckCircle2 size={15} style={{ color: 'var(--color-green-text)', flexShrink: 0 }} />
                : showWrong ? <XCircle size={15} style={{ color: 'var(--color-red-text)', flexShrink: 0 }} /> : null)}
              {opt}
            </button>
          )
        })}
      </div>
      {checked && q.why && (
        <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-2)' }}>
          {q.why}
        </div>
      )}
    </div>
  )
}
