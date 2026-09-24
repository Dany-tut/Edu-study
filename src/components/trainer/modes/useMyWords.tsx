// ─────────────────────────────────────────────────────────────────────────────
// Половина «Карточек» — личный словарь
//
// ЧТО ЭТО. Собранные слова: те же строки колоды, что и в «Повторении», только
// показанные списком, а не расписанием (см. trainer/MyWords.tsx). Приходят они
// из текстов «Чтения» («В словарь»), из уроков курса и из разбора созвучий.
//
// ЧТО ОСТАЁТСЯ СНАРУЖИ. Словарь открывается плиткой В ВИТРИНЕ разговорника и
// лежит в том же поле, что и открытая тема (MY_WORDS_ID), — поэтому «открыт ли
// он» знает тренажёр, а не этот файл: иначе два места писали бы в одно поле.
// Сюда уехало всё остальное — чтение словаря, вычитание фраз разговорника,
// счётчики, вычёркивание, рейл, строка, содержимое и сама плитка.
//
// ФРАЗЫ РАЗГОВОРНИКА ВЫЧИТАЮТСЯ. Они уже разложены по своим плиткам, и словарь
// с ними стал бы копией всей витрины. Множество приходит снаружи: его считает
// тот, кто держит книгу.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookMarked } from 'lucide-react'
import { useT } from '../../../lib/i18n'
import { bindShortWords, proseWrap } from '../../../lib/typography'
import Skeleton from '../../Skeleton'
import { RailCard, RailStat, Toolbar, ToolCount, StatusTabs } from '../TrainerShell'
import { BackToSets, DeckHint, type PhraseView, type RunMode } from '../../PhraseDecks'
import {
  MyWordsSession, MyWordsTile, myWordsFrom, myWordsStats, type MyWord,
} from '../MyWords'
import { collectedCards, forgetCard, type CardState, type ReviewCard } from '../../../data/reviewDeck'

export interface MyWordsHalf {
  /** Прочитан ли словарь: «пусто» и «не доехало» — разные экраны. */
  ready: boolean
  rail: React.ReactNode
  toolbar: React.ReactNode
  content: React.ReactNode
  /** Плитка словаря — она стоит первой в витрине разговорника. */
  tile: React.ReactNode
}

export function useMyWords({
  lang, subjectId, owner, accent, soft, deckSubjects, reloadKey, onReload,
  bookPhrases, bookReady, open, onOpen, onClose,
  run, onRun, phraseView, states, statesReady, onGraded, tourExtra,
}: {
  lang: string
  subjectId: string
  owner: { studentId?: string; anonName?: string }
  accent: string
  soft: string
  /** Предметы, чьи карточки считаются одним словарём (см. subjectAliases). */
  deckSubjects: string[]
  /** Счётчик перечитывания: слово, забранное из текста, должно появиться сразу. */
  reloadKey: number
  onReload: () => void
  /** Фразы разговорника — их в словаре быть не должно, см. шапку файла. */
  bookPhrases: Set<string>
  /** Доехала ли книга: до этого свои слова не отличить от её фраз. */
  bookReady: boolean
  /** Открыт ли словарь. Поле общее с темой разговорника и живёт в тренажёре. */
  open: boolean
  onOpen: () => void
  onClose: () => void
  run: RunMode
  onRun: (v: RunMode) => void
  phraseView: PhraseView
  states: Map<string, CardState>
  statesReady: boolean
  onGraded: (prompt: string, st: CardState) => void
  /** Шаг онбординга стопки — он общий у словаря с темой разговорника. */
  tourExtra?: React.ComponentProps<typeof MyWordsSession>['tourExtra']
}): MyWordsHalf {
  const t = useT()

  const [cards, setCards] = useState<ReviewCard[]>([])
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    collectedCards(owner, deckSubjects)
      .then(c => { if (alive) { setCards(c); setReady(true) } })
      // Словарь не доехал — вкладка живёт дальше: плитка покажет ноль слов,
      // а не заменит собой всю витрину наборов ошибкой.
      .catch(e => { console.error('collectedCards:', e); if (alive) setReady(true) })
    return () => { alive = false }
  }, [owner, deckSubjects, reloadKey])

  const words = useMemo(() => myWordsFrom(cards, lang, bookPhrases), [cards, lang, bookPhrases])
  const stats = useMemo(() => myWordsStats(words, states), [words, states])

  /**
   * Вычеркнуть слово.
   *
   * Строка уходит с экрана сразу, до ответа базы: удаление своего же слова — не
   * то место, где ученик готов ждать сеть. Если база отказала (нет прав, нет
   * связи), перечитываем словарь — слово возвращается на место, а не пропадает
   * с экрана, оставшись в расписании.
   */
  const forget = useCallback(async (w: MyWord) => {
    setCards(prev => prev.filter(c => c.id !== w.cardId))
    const ok = await forgetCard(w.cardId)
    if (!ok) onReload()
  }, [onReload])

  const rail = !open ? null : (
    <RailCard title="Словарь" accent={accent} icon={<BookMarked size={15} />}>
      <RailStat label="Слов собрано" value={stats.total} />
      <RailStat label="Выучено" value={stats.learned} tone={stats.learned > 0 ? 'good' : undefined} />
      <RailStat label="Сегодня в стопке" value={stats.due} tone={stats.due > 0 ? 'warn' : undefined} />
      {/* Откуда берутся слова — здесь, а не только в пустом состоянии:
          словарь пополняют по ходу дела, и напоминание нужно тому, у
          кого в нём уже что-то есть, ровно так же. */}
      <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5, ...proseWrap }}>
        {bindShortWords(t('Слова приходят из текстов «Чтения» (нажми на слово → «В словарь»), из уроков курса и из разбора созвучий.'))}
      </div>
    </RailCard>
  )

  const toolbar = !open ? null : (
    <Toolbar>
      <BackToSets onBack={onClose} />
      {/* Обёртка не декоративная: на телефоне Toolbar забирает StatusTabs в
          шторку «Фильтры», а здесь это не фильтр, а способ прогона колоды —
          «Свайп» против «Списком» жмут постоянно и ищут глазами в строке.
          Обёртка выводит контрол из-под разбора по типу и оставляет в строке
          (см. Toolbar в TrainerShell). */}
      <div style={{ display: 'flex' }}>
        <StatusTabs
          options={[{ value: 'swipe', label: 'Свайп' }, { value: 'list', label: 'Списком' }]}
          value={run}
          onChange={v => onRun(v as RunMode)}
          accent={accent}
        />
      </div>
      <ToolCount>{stats.total} {t('слов')}</ToolCount>
    </Toolbar>
  )

  // Книга нужна не ради показа, а ради вычитания: пока она едет, фразы
  // разговорника не отличить от своих слов, и словарь на секунду показал бы
  // все шестьсот. Поэтому ждём и её, и саму колоду.
  const content = !open ? null : !ready || !bookReady ? (
    <Skeleton.Text lines={4} style={{ maxWidth: 420 }} />
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <MyWordsSession
        words={words}
        lang={lang}
        subjectId={subjectId}
        accent={accent}
        owner={owner}
        view={phraseView}
        run={run}
        states={states}
        statesReady={statesReady}
        onGraded={onGraded}
        onForget={forget}
        tourExtra={tourExtra}
      />
      {run === 'swipe' && words.length > 0 && <DeckHint />}
    </div>
  )

  const tile = (
    <MyWordsTile
      words={words}
      states={states}
      ready={ready}
      accent={accent}
      soft={soft}
      onOpen={onOpen}
    />
  )

  return { ready, rail, toolbar, content, tile }
}
