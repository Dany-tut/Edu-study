import { useMemo, useState } from 'react'
import { Sunrise, ArrowRight, Layers, Check, Flame } from 'lucide-react'
import { useDashboard } from '../store/dashboardStore'
import { useStudentData } from '../store/studentDataStore'
import { useTheme } from '../store/themeStore'
import { getSubject, resolveSubjectPalette } from '../lib/subjects'
import { textsForLang, type ReadingText } from '../data/readingLibrary'
import { addCards, deckOwner } from '../data/reviewDeck'
import { streakDays, dayKey } from '../lib/trainerDay'
import { trainerHash } from '../lib/trainerLink'
import { useT } from '../lib/i18n'

// ─────────────────────────────────────────────────────────────────────────────
// Доза дня: пять минут языка без выбора, что именно делать
//
// ЗАЧЕМ. Библиотека тренажёра большая, и это её главный недостаток для того,
// кто зашёл на пять минут: чтобы начать, надо сначала выбрать режим, потом
// уровень, потом текст — три решения до первой строки. Человек, у которого
// сегодня нет сил на решения, не выбирает ничего и закрывает вкладку. Виджет
// снимает выбор: один текст, три слова, кнопка.
//
// ПОЧЕМУ ТЕКСТ ОДИН И ТОТ ЖЕ ВЕСЬ ДЕНЬ. Он выбирается по дате, а не случайно:
// иначе доза менялась бы при каждом обновлении страницы, и «дочитаю потом»
// становилось бы невыполнимым. Тот же день — тот же текст, до полуночи.
//
// ПОЧЕМУ КОРОТКИЙ. Обещание «пять минут» — это и есть весь смысл: дозу берут
// в тот день, когда на урок нет сил. Поэтому в отбор идут только тексты до трёх
// минут, а если таких нет, виджет честно молчит, а не подсовывает лекцию.
//
// СЕРИЯ — ИЗ ОБЩЕГО СЧЁТЧИКА (lib/trainerDay). Отдельной серии «доз» здесь
// намеренно нет: две полоски про одно и то же соревнуются друг с другом, и
// человек, который сегодня час читал сцены, увидел бы «серия прервана».
// ─────────────────────────────────────────────────────────────────────────────

/** Сколько слов забираем за раз. Три — столько, сколько держится в голове за день. */
const WORDS = 3

/**
 * Текст дня: тот же на весь день, разный у разных языков.
 *
 * Ключ дня превращается в число сложением кодов символов — этого достаточно:
 * от выбора требуется устойчивость в течение суток и подвижность между ними, а
 * не равномерность распределения.
 */
export function textOfDay(texts: ReadingText[], day: string): ReadingText | undefined {
  if (texts.length === 0) return undefined
  let n = 0
  for (let i = 0; i < day.length; i++) n = (n * 31 + day.charCodeAt(i)) % 100000
  return texts[n % texts.length]
}

export default function DailyDoseWidget({ columns }: { columns: number }) {
  const t = useT()
  const { dark } = useTheme()
  const subjects = useStudentData(s => s.subjects)
  const activeSubjectId = useDashboard(s => s.activeSubjectId)
  const [taken, setTaken] = useState<number | null>(null)
  const [taking, setTaking] = useState(false)

  const active = subjects.find(s => s.id === activeSubjectId) ?? subjects[0]
  const def = getSubject(active?.subject)
  const palette = resolveSubjectPalette(def?.id ?? active?.subject ?? '', dark)
  const day = dayKey()

  // До трёх минут — см. шапку файла.
  const text = useMemo(() => {
    if (!def?.langCode) return undefined
    return textOfDay(textsForLang(def.langCode).filter(x => x.minutes <= 3), day)
  }, [def?.langCode, day])

  const streak = def ? streakDays(def.id) : 0
  const wide = columns >= 2

  // Языка нет или коротких текстов под него не написано — виджет молчит.
  // Прятать его целиком нельзя: карусель считает страницы по списку.
  if (!text) {
    return (
      <div style={{ width: '100%', height: '100%', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sunrise size={16} style={{ color: palette.accent }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Доза дня')}</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5, margin: 0 }}>
          {t('Пять минут языка каждый день: короткий текст и три слова. Появится, когда выбран языковой курс.')}
        </p>
      </div>
    )
  }

  const words = text.glossary.slice(0, WORDS)

  async function take() {
    if (!text || words.length === 0) return
    setTaking(true)
    try {
      const n = await addCards(deckOwner(), words.map(g => ({
        subject: def?.id, source: 'manual' as const, prompt: g.term, answer: g.ru,
      })))
      setTaken(n)
    } catch (e) {
      console.error('DailyDose take:', e)
      setTaken(0)
    } finally {
      setTaking(false)
    }
  }

  return (
    <div style={{
      width: '100%', height: '100%', padding: wide ? '20px 28px' : '16px 20px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sunrise size={15} style={{ color: palette.accent }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Доза дня')}</span>
        <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
          {text.minutes} {t('мин')} · {text.level}
        </span>
        {streak > 1 && (
          <span style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 700, color: palette.text,
          }}>
            <Flame size={12} /> {streak}
          </span>
        )}
      </div>

      <a
        href={trainerHash({ kind: 'text', textId: text.id })}
        style={{
          display: 'block', padding: '12px 14px', borderRadius: 14,
          background: `${palette.accent}1F`, textDecoration: 'none',
        }}
      >
        <div style={{ fontSize: wide ? 16 : 14.5, fontWeight: 750, color: palette.text, lineHeight: 1.3 }}>
          {text.title}
        </div>
        <div style={{
          fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.45, marginTop: 5,
          overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
        }}>
          {text.body.split(/\n+/)[0]}
        </div>
      </a>

      {/* Слова показываем ДО того, как их забрали: доза — это ещё и обещание,
          что работы ровно на три слова, а не «сколько наберётся». */}
      {words.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {words.map(g => (
            <span key={g.term} style={{
              fontSize: 11.5, padding: '4px 9px', borderRadius: 999,
              background: 'var(--color-bg-3)', color: 'var(--color-text-2)',
            }}>
              <b style={{ color: 'var(--color-text)' }}>{g.term}</b> — {g.ru}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
        <a
          href={trainerHash({ kind: 'text', textId: text.id })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            borderRadius: 999, background: palette.accent, color: '#fff',
            fontSize: 12.5, fontWeight: 700, textDecoration: 'none',
          }}
        >
          {t('Читать')} <ArrowRight size={14} />
        </a>

        {words.length > 0 && (
          <button
            onClick={() => void take()}
            disabled={taking || taken !== null}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              borderRadius: 999, border: '1px solid var(--color-border-soft)',
              background: 'transparent', fontFamily: 'inherit',
              color: taken !== null ? 'var(--color-green-text)' : 'var(--color-text-2)',
              fontSize: 12.5, fontWeight: 650,
              cursor: taking || taken !== null ? 'default' : 'pointer',
            }}
          >
            {taken !== null
              ? <><Check size={14} /> {taken > 0 ? `+${taken}` : t('уже в колоде')}</>
              : <><Layers size={14} /> {taking ? t('Добавляю…') : `${words.length} ${t('слова в колоду')}`}</>}
          </button>
        )}
      </div>
    </div>
  )
}
