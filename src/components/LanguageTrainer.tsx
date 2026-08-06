import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Headphones, Layers, Mic, ChevronLeft, CheckCircle2, XCircle, HelpCircle } from 'lucide-react'
import { textsForLang, type ReadingText, type ReadingQuestion, type Gloss } from '../data/readingLibrary'
import { languageTaxonomy } from '../data/languageTaxonomy'
import { listeningForLang, type ListeningItem } from '../data/listeningLibrary'
import AudioPlayer from './AudioPlayer'
import { subjectTheme } from '../lib/theme'
import { useT } from '../lib/i18n'
import { bindShortWords, proseWrap } from '../lib/typography'
import CardDeck from './CardDeck'
import { addCards, deckOwner } from '../data/reviewDeck'
import VoiceRecorder from './VoiceRecorder'
import GlossedText from './GlossedText'
import Coachmarks, { type CoachStep } from './Coachmarks'
import { hasLexicon } from '../lib/lexicon'

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
  { id: 'vocab',     label: 'Карточки',   hint: 'Свайп: знаю / не помню',   Icon: Layers },
  { id: 'listening', label: 'Аудирование', hint: 'Лекции и разговоры',      Icon: Headphones },
  { id: 'speaking',  label: 'Говорение',  hint: 'Записать и отправить',     Icon: Mic },
]

// Общая колонка для всех экранов тренажёра — список режимов, читалка,
// аудирование. Ширина одна на всех намеренно: экраны переключаются на месте, и
// разная колонка сдвигала бы содержимое вбок на каждом переходе.
//
// width: '100%' здесь обязателен. Родитель (.dashboard-main) — flex-колонка, а у
// флекс-элемента с auto-полем по поперечной оси растяжение отключается: без явной
// ширины блок ужимается до max-content своего содержимого. Ширина тогда разная у
// каждой вкладки, а из-за центрирования вся вёрстка — включая ряд вкладок —
// прыгает вбок при переключении.
const column = { width: '100%', maxWidth: 860, margin: '0 auto', padding: '8px 20px 80px' } as const

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
  const [openAudio, setOpenAudio] = useState<ListeningItem | null>(null)

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
  const audio = useMemo(() => listeningForLang(lang), [lang])
  const levelOpts = present('level', tax?.levels ?? [])
  const skillOpts = present('skill', tax?.skills ?? [])
  const topicOpts = present('topic', tax?.topics ?? [])

  const texts = useMemo(() => allTexts.filter(x =>
    (!fLevel || x.level === fLevel) &&
    (!fSkill || x.skill === fSkill) &&
    (!fTopic || x.topic === fTopic)), [allTexts, fLevel, fSkill, fTopic])

  // ── Колода карточек ────────────────────────────────────────────────────────
  //
  // Пустая колода у новичка — нормальное состояние: карточки набираются из
  // домашки (слова юнита и ошибки, см. lib/reviewCapture.ts), а первую он ещё не
  // сдал. Поэтому даём взять словари прочитанных текстов — двадцать слов, с
  // которыми режим сразу имеет смысл. Явной кнопкой, а не молча: колода ученика
  // — его вещь, и наполнять её за него без спроса значит однажды выдать ему
  // сотню чужих слов.
  //
  // Владелец берётся общим хелпером, а не выводится из предмета: домашка знает
  // курс, тренажёр — предмет, и по разным ключам получались бы разные колоды
  // (подробности в data/reviewDeck.ts).
  const owner = useMemo(() => deckOwner(), [])
  const [deckKey, setDeckKey] = useState(0)
  const [seeding, setSeeding] = useState(false)
  const [seedNote, setSeedNote] = useState('')
  const glossaryCards = useMemo(() => allTexts.flatMap(txt => txt.glossary.map(g => ({
    subject: subjectId,
    source: 'manual' as const,
    prompt: g.term,
    answer: g.ru,
  }))), [allTexts, subjectId])

  async function seedFromTexts() {
    setSeeding(true)
    setSeedNote('')
    try {
      const added = await addCards(owner, glossaryCards)
      setSeedNote(added > 0 ? `${t('Добавлено карточек:')} ${added}` : t('Все эти слова уже в колоде.'))
      if (added > 0) setDeckKey(k => k + 1)
    } catch (e) {
      console.error('seedFromTexts:', e)
      setSeedNote(t('Не получилось добавить слова. Попробуй ещё раз.'))
    } finally {
      setSeeding(false)
    }
  }

  if (openText) {
    return <Reader text={openText} accent={palette.accent} lang={lang} onBack={() => setOpenText(null)} />
  }
  if (openAudio) {
    return <Listener item={openAudio} accent={palette.accent} lang={lang} onBack={() => setOpenAudio(null)} />
  }

  return (
    <div style={column}>
      {/* Переключатель режимов.
          Ряд центрируется по колонке: карточки текстов занимают её целиком и
          читаются как центрированный блок, а четыре узкие вкладки, прижатые
          влево, выглядели рядом с ними съехавшими. */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
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
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
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
          <CardDeck
            // key перезапускает сессию после подгрузки слов: колода читается
            // один раз на монтировании, иначе новые карточки появятся только
            // после ухода со вкладки и обратно.
            key={deckKey}
            owner={owner}
            accent={palette.accent}
            lang={lang}
            subject={subjectId}
            emptyExtra={
              glossaryCards.length > 0 ? (
                <button
                  onClick={seedFromTexts}
                  disabled={seeding}
                  style={{
                    padding: '10px 18px', borderRadius: 999, cursor: seeding ? 'default' : 'pointer',
                    border: `1.5px solid ${palette.accent}`, background: 'transparent', color: palette.accent,
                    fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                  }}
                >
                  {seeding ? t('Добавляю…') : `${t('Взять слова из текстов')} · ${glossaryCards.length}`}
                </button>
              ) : null
            }
          />
          {seedNote && (
            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: 'var(--color-muted)' }}>{seedNote}</div>
          )}
        </div>
      )}

      {mode === 'listening' && (
        audio.length === 0 ? (
          <Empty text={t('Для этого языка материалов пока нет.')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {audio.map(a => (
              <button
                key={a.id}
                onClick={() => setOpenAudio(a)}
                style={{
                  textAlign: 'left', padding: '16px 18px', borderRadius: 18, cursor: 'pointer',
                  border: '1px solid var(--color-border)', background: 'var(--color-bg-2)', fontFamily: 'inherit',
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: palette.soft, color: palette.accent }}>
                    {a.level}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                    {a.topic} · {a.minutes} {t('мин')} · {a.questions.length} {t('вопроса')}
                  </span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>{a.title}</div>
              </button>
            ))}
          </div>
        )
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

/** Онбординг проходится один раз на браузер, потом только по кнопке «Подсказки». */
const TOUR_KEY = 'lang-reader-tour-v1'

function Reader({ text, accent, lang, onBack }: {
  text: ReadingText; accent: string; lang: string; onBack: () => void
}) {
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

  // ── Онбординг ──────────────────────────────────────────────────────────────
  //
  // Экран читалки внешне похож на тест, и без объяснения ученик проходит мимо
  // двух главных вещей: что любое слово переводится касанием и что текст можно
  // слушать. Поэтому при первом открытии текста проводим по экрану подсказками;
  // вернуть их можно кнопкой рядом с «К списку».
  const audioRef = useRef<HTMLDivElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const chipsRef = useRef<HTMLDivElement | null>(null)
  const questionsRef = useRef<HTMLDivElement | null>(null)
  const checkRef = useRef<HTMLButtonElement | null>(null)
  const [tour, setTour] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(TOUR_KEY)) setTour(true)
    } catch { /* приватный режим — просто без онбординга */ }
  }, [])

  function closeTour() {
    setTour(false)
    try { localStorage.setItem(TOUR_KEY, '1') } catch { /* не критично */ }
  }

  // Пословный перевод есть не у всех языков (см. data/wordGloss.ts). Где
  // словаря нет, текст остаётся обычным: кликать по каждому слову ради ответа
  // «нет в словаре» — хуже, чем не кликать вовсе.
  const glossed = hasLexicon(lang)

  const steps: CoachStep[] = [
    {
      title: t('Как устроено чтение'),
      text: glossed
        ? t('Три вещи, дальше сам: любое слово переводится касанием, текст можно слушать, ответы проверяются кнопкой внизу.')
        : t('Две вещи, дальше сам: текст можно слушать, ответы проверяются кнопкой внизу.'),
    },
    ...(glossed ? [{
      ref: bodyRef,
      title: t('Перевод любого слова'),
      text: t('Наведи курсор или нажми на слово — рядом появится перевод и грамматическая пометка. Пунктир снизу значит, что слово есть в словаре; у остальных работает озвучка.'),
    }] : []),
    {
      ref: audioRef,
      title: t('Послушать текст'),
      text: t('Кнопка читает текст вслух целиком. «Медленно» — тот же голос вдвое медленнее, для первого прохода.'),
    },
    ...(text.glossary.length > 0 ? [{
      ref: chipsRef,
      title: t('Ключевые слова'),
      text: t('Слова, ради которых текст и написан. Нажми, чтобы раскрыть перевод, — их же можно забрать в колоду на вкладке «Карточки».'),
    }] : []),
    {
      ref: questionsRef,
      title: t('Вопросы к тексту'),
      text: t('Отвечать можно в любом порядке, пока не нажал «Проверить». После проверки ответы фиксируются и появляется разбор.'),
    },
    {
      ref: checkRef,
      title: t('Проверка и перевод'),
      text: t('Кнопка загорится, когда ответишь на все вопросы. После неё откроется полный перевод текста — до этого он закрыт, иначе читать оригинал незачем.'),
    },
  ]

  return (
    <div style={column}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 999,
            border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', fontFamily: 'inherit',
          }}
        >
          <ChevronLeft size={15} /> {t('К списку')}
        </button>
        <button
          onClick={() => setTour(true)}
          title={t('Показать подсказки')}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 999,
            border: `1px solid ${accent}55`, background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: 650, color: accent, fontFamily: 'inherit',
          }}
        >
          <HelpCircle size={15} /> {t('Подсказки')}
        </button>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>{text.title}</h1>
      <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 14 }}>
        {text.level} · {text.topic} · {text.minutes} {t('мин')}
        {text.credit && ` · ${text.credit}`}
      </p>

      {/* Озвучка текста. Синтез, а не запись диктора: файла к каждому тексту у
          нас нет, а слышать ритм фразы и границы слов нужно с первого дня. */}
      <div ref={audioRef} style={{ marginBottom: 14 }}>
        <AudioPlayer ttsText={text.body} lang={lang} allowSlow />
      </div>

      <div ref={bodyRef} style={{
        padding: '18px 20px', borderRadius: 18, background: 'var(--color-bg-2)',
        border: '1px solid var(--color-border-soft)', marginBottom: 12,
      }}>
        {glossed ? (
          <GlossedText
            text={text.body}
            lang={lang}
            extra={text.glossary}
            accent={accent}
            style={{ fontSize: 16, lineHeight: 1.85, color: 'var(--color-text)' }}
          />
        ) : (
          <div style={{ fontSize: 16, lineHeight: 1.85, color: 'var(--color-text)', whiteSpace: 'pre-wrap', ...proseWrap }}>
            {text.body}
          </div>
        )}
      </div>

      {/* Словарик: тап по слову раскрывает перевод.
          Плашки лежат в сетке фиксированной ширины, а место под перевод (две
          строки) зарезервировано всегда — просто прозрачно, пока слово не
          выбрано. Иначе выбор растягивал бы плашку, ряд переносился заново и
          вопросы уезжали вниз прямо под пальцем. Две строки, а не одна: самые
          длинные пояснения в библиотеке под 40 знаков, в одну строку они
          обрезались бы многоточием. */}
      {text.glossary.length > 0 && (
        <div ref={chipsRef} style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 8, marginBottom: 22,
        }}>
          {text.glossary.map(g => {
            const on = gloss === g.term
            const ru = glossMap.get(g.term.toLowerCase()) ?? ''
            return (
              <button
                key={g.term}
                onClick={() => setGloss(on ? null : g.term)}
                title={ru}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                  minWidth: 0, padding: '12px 14px', borderRadius: 16, cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'center',
                  border: `1px solid ${on ? accent : 'var(--color-border-soft)'}`,
                  background: on ? 'var(--color-bg-3)' : 'var(--color-bg-2)',
                  transition: 'border-color .15s, background .15s',
                }}
              >
                <span style={{
                  maxWidth: '100%', fontSize: 17, fontWeight: 650, lineHeight: '24px',
                  color: on ? accent : 'var(--color-text-2)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {g.term}
                </span>
                <span style={{
                  display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
                  maxWidth: '100%', height: 40, overflow: 'hidden',
                  fontSize: 14, fontWeight: 500, lineHeight: '20px',
                  color: 'var(--color-muted)', opacity: on ? 1 : 0, transition: 'opacity .15s',
                }}>
                  {ru}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 12 }}>
        {t('Вопросы к тексту')}
      </h2>

      <div ref={questionsRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {text.questions.map((q, qi) => (
          <QuestionCard
            key={qi}
            q={q}
            index={qi}
            value={answers[qi]}
            checked={checked}
            accent={accent}
            // Вопрос задан на изучаемом языке, и слова в нём переводятся так же,
            // как в тексте. Варианты ответа оставлены обычными: это кнопки
            // выбора, и подсказка внутри них конфликтует с нажатием.
            glossLang={glossed ? lang : undefined}
            glossExtra={text.glossary}
            onPick={v => !checked && setAnswers(a => ({ ...a, [qi]: v }))}
          />
        ))}
      </div>

      {!checked ? (
        <button
          ref={checkRef}
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

      <Coachmarks steps={steps} open={tour} onClose={closeTour} accent={accent} />
    </div>
  )
}

function QuestionCard({ q, index, value, checked, accent, glossLang, glossExtra, onPick }: {
  q: ReadingQuestion; index: number; value?: number; checked: boolean
  accent: string; onPick: (v: number) => void
  /** Задан — формулировка вопроса тоже переводится по словам. */
  glossLang?: string
  glossExtra?: Gloss[]
}) {
  return (
    <div style={{ padding: '15px 17px', borderRadius: 18, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)' }}>
      <div style={{
        display: 'flex', gap: 6, fontSize: 15, fontWeight: 650,
        color: 'var(--color-text)', marginBottom: 11,
      }}>
        <span style={{ flexShrink: 0 }}>{index + 1}.</span>
        {glossLang
          ? <GlossedText text={q.q} lang={glossLang} extra={glossExtra} accent={accent} style={{ flex: 1, minWidth: 0 }} />
          : <span style={proseWrap}>{bindShortWords(q.q)}</span>}
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
              <span style={proseWrap}>{bindShortWords(opt)}</span>
            </button>
          )
        })}
      </div>
      {checked && q.why && (
        <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-2)', ...proseWrap }}>
          {bindShortWords(q.why)}
        </div>
      )}
    </div>
  )
}

// ─── Прослушивание ───────────────────────────────────────────────────────────

function Listener({ item, accent, lang, onBack }: {
  item: ListeningItem; accent: string; lang: string; onBack: () => void
}) {
  const t = useT()
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [checked, setChecked] = useState(false)

  const correctCount = item.questions.filter((q, i) => answers[i] === q.correct).length
  const allAnswered = item.questions.every((_, i) => answers[i] !== undefined)

  return (
    <div style={column}>
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

      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>{item.title}</h1>
      <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 18 }}>
        {item.level} · {item.topic} · {item.minutes} {t('мин')}{item.credit && ` · ${item.credit}`}
      </p>

      <div style={{ marginBottom: 18 }}>
        <AudioPlayer ttsText={item.script} lang={lang} allowSlow />
      </div>

      <p style={{ fontSize: 12.5, color: 'var(--color-muted)', marginBottom: 16, lineHeight: 1.6 }}>
        {t('Слушай столько раз, сколько нужно. Расшифровка откроется после ответов — если прочитать её сразу, это перестанет быть аудированием.')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {item.questions.map((q, qi) => (
          <QuestionCard
            key={qi} q={q} index={qi} value={answers[qi]} checked={checked} accent={accent}
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
          marginTop: 22, padding: '16px 18px', borderRadius: 18,
          background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4, textAlign: 'center' }}>
            {correctCount} / {item.questions.length}
          </div>
          {item.script && (
            <details style={{ marginTop: 10 }} open>
              <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: accent }}>
                {t('Расшифровка')}
              </summary>
              <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--color-text)', marginTop: 8, whiteSpace: 'pre-wrap' }}>
                {item.script}
              </div>
            </details>
          )}
          {item.translation && (
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: accent }}>
                {t('Перевод')}
              </summary>
              <div style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--color-text-2)', marginTop: 8, whiteSpace: 'pre-wrap' }}>
                {item.translation}
              </div>
            </details>
          )}
          {item.glossary.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
              {item.glossary.map(g => (
                <span key={g.term} style={{
                  padding: '5px 10px', borderRadius: 999, fontSize: 12.5,
                  background: 'var(--color-bg-3)', color: 'var(--color-text-2)',
                }}>
                  {g.term} — {g.ru}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
