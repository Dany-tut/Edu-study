// ─────────────────────────────────────────────────────────────────────────────
// Половина «Карточек» — повторение
//
// ЧТО ЭТО. Личная колода по расписанию: слова из уроков, текстов и ошибок
// возвращаются ровно тогда, когда их вот-вот забудешь. Половина одна на весь
// предмет — в отличие от разговорника и наборов, у неё нет витрины: показывать
// нечего, кроме самой стопки и цифры долга.
//
// ПОЧЕМУ ОТДЕЛИМА. С соседями по вкладке колода делит только предмет и
// владельца. Память `states`, которую делят разговорник и наборы, здесь не
// нужна вовсе: стопка читает и пишет колоду сама (CardDeck), а не через общую
// карту состояний.
//
// ПУСТАЯ КОЛОДА — НЕ ТУПИК. У нового ученика повторять нечего, и экран когда-то
// объяснял, ОТКУДА берутся карточки, но не давал туда пойти. Поэтому пустая
// стопка всегда несёт кнопку: есть слова в текстах — «взять их разом», нет
// прочитанных текстов — «начать с текста», и она уводит в «Чтение».
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { Layers } from 'lucide-react'
import { useT } from '../../../lib/i18n'
import { RailCard, RailStat } from '../TrainerShell'
import CardDeck, { DECK_CTA } from '../../CardDeck'
import { addCards, dueCount } from '../../../data/reviewDeck'
import type { ReadingText } from '../../../data/readingLibrary'

export interface ReviewDeck {
  /** Сколько карточек ждёт сегодня — цифра на таблетке половины. */
  due: number
  rail: React.ReactNode
  content: React.ReactNode
}

export function useReviewDeck({
  lang, subjectId, owner, accent, active, deckSubjects, texts, onGoToTexts, note,
}: {
  lang: string
  subjectId: string
  owner: { studentId?: string; anonName?: string }
  accent: string
  active: boolean
  /** Предметы, чьи карточки считаются одной колодой (см. subjectAliases). */
  deckSubjects: string[]
  /** Тексты языка: из их словариков набирается колода одним нажатием. */
  texts: ReadingText[]
  onGoToTexts: () => void
  /** Пояснение под цифрой — его формулирует тренажёр, он же знает язык. */
  note: React.ReactNode
}): ReviewDeck {
  const t = useT()

  const [due, setDue] = useState(0)
  // Считаем всегда. Раньше стоял отбор `if (!hasBook) return` — долг считался
  // ТОЛЬКО у языка с разговорником, а карточка рейла «Колода» показывается
  // ровно наоборот, у языка БЕЗ него, и потому вечно писала «На сегодня 0».
  useEffect(() => {
    let alive = true
    dueCount(owner, deckSubjects)
      .then(n => { if (alive) setDue(n) })
      .catch(() => { /* цифра на таблетке — не повод ронять вкладку */ })
    return () => { alive = false }
  }, [owner, deckSubjects])

  // Перезапуск сессии стопки: колода читается один раз на монтировании, и без
  // этого счётчика подсеянные слова появились бы только после ухода со вкладки.
  const [deckKey, setDeckKey] = useState(0)
  const [seeding, setSeeding] = useState(false)
  const [seedNote, setSeedNote] = useState('')

  /** Словарики всех текстов языка — из них и набирается колода разом. */
  const glossary = useMemo(() => texts.flatMap(txt => txt.glossary.map(g => ({
    subject: subjectId,
    source: 'manual' as const,
    prompt: g.term,
    answer: g.ru,
  }))), [texts, subjectId])

  async function seedFromTexts() {
    setSeeding(true)
    setSeedNote('')
    try {
      const added = await addCards(owner, glossary)
      setSeedNote(added > 0 ? `${t('Добавлено карточек:')} ${added}` : t('Все эти слова уже в колоде.'))
      if (added > 0) setDeckKey(k => k + 1)
    } catch (e) {
      console.error('seedFromTexts:', e)
      setSeedNote(t('Не получилось добавить слова. Попробуй ещё раз.'))
    } finally {
      setSeeding(false)
    }
  }

  const cta: React.CSSProperties = {
    height: DECK_CTA.height, padding: DECK_CTA.padding, borderRadius: 999,
    border: `1px solid ${accent}`, background: 'transparent', color: accent,
    fontFamily: 'inherit', fontSize: DECK_CTA.fontSize, fontWeight: DECK_CTA.fontWeight,
  }

  const rail = (
    <RailCard title="Колода" accent={accent} icon={<Layers size={15} />}>
      <RailStat label="На сегодня" value={due} tone={due > 0 ? 'warn' : undefined} />
      {note}
    </RailCard>
  )

  const content = !active ? null : (
    <div>
      <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 14, lineHeight: 1.6 }}>
        {t('Слова из уроков и ошибок повторяются по расписанию: каждое возвращается ровно тогда, когда его вот-вот забудешь.')}
      </p>
      <CardDeck
        // Предмет — часть ключа: у стопки своя очередь, свой указатель и свой
        // прогресс сессии, и при смене предмета их надо начинать заново, а не
        // дочитывать чужую колоду.
        key={`${subjectId}:${deckKey}`}
        owner={owner}
        accent={accent}
        lang={lang}
        subject={subjectId}
        emptyExtra={
          glossary.length > 0 ? (
            <button onClick={seedFromTexts} disabled={seeding} style={{ ...cta, cursor: seeding ? 'default' : 'pointer' }}>
              {seeding ? t('Добавляю…') : `${t('Взять слова из текстов')} · ${glossary.length}`}
            </button>
          ) : texts.length > 0 ? (
            // Кнопка ведёт ровно в то единственное место, где колода начинает
            // набираться, — см. шапку файла.
            <button onClick={onGoToTexts} style={{ ...cta, cursor: 'pointer' }}>
              {`${t('Начать с текста')} · ${texts.length}`}
            </button>
          ) : null
        }
      />
      {seedNote && (
        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: 'var(--color-muted)' }}>{seedNote}</div>
      )}
    </div>
  )

  return { due, rail, content }
}
