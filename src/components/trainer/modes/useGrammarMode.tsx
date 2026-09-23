// ─────────────────────────────────────────────────────────────────────────────
// Режим «Грамматика» — справочник форм
//
// Второй режим, вынесенный из LanguageTrainer; зачем и почему хуком, а не
// компонентом — в шапке useGuideMode.
//
// ЧТО ЗДЕСЬ ИНАЧЕ, ЧЕМ У «О ЯЗЫКЕ». Справочник участвует в ОБЩЕМ поиске
// тренажёра: строка поиска одна на весь экран (в ней ищут и тексты, и формы), и
// режим её не заводит, а принимает. Поэтому `query` приходит пропом, а наружу
// возвращается `found` — сколько форм под него подошло: это число показывает
// строка управления, и считать его дважды в двух местах значило бы разойтись.
//
// СВОИ ФИЛЬТРЫ ОСТАЮТСЯ ЗДЕСЬ: раздел справочника (рейл) и ступень (строка
// управления). Они живут ровно столько, сколько открыт режим, и в адрес экрана
// не попадают — по ссылке делятся формой, а не отбором.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { BookMarked, ChevronLeft } from 'lucide-react'
import { useT } from '../../../lib/i18n'
import { usePersistentState } from '../../../lib/useDraft'
import Skeleton from '../../Skeleton'
import {
  RailCard, RailList, Toolbar, ToolButton, ToolCount, SearchPill, FilterMenu,
  Empty as ShellEmpty, plural,
} from '../TrainerShell'
import { GrammarGrid, GrammarPage } from '../GrammarShelf'
import { hasGrammarRef, loadGrammarRef, GRAMMAR_COUNTS, type GrammarRef } from '../../../data/grammar'

export interface GrammarMode {
  /** Есть ли справочник у этого языка. */
  on: boolean
  /** Число для пункта меню — синхронное, из таблицы: сам справочник ленивый. */
  count: number | undefined
  /** Открытая форма: по ней страница понимает, что человек внутри материала. */
  openId: string | null
  setOpenId: (v: string | null) => void
  /** Подпись под названием предмета: сколько всего форм и примеров. */
  subtitle: string | undefined
  rail: React.ReactNode
  toolbar: React.ReactNode
  content: React.ReactNode
  back: (() => void) | null
  /** Ключ черновиков: свои фильтры входят в него наравне с чужими. */
  draftKey: string
}

export function useGrammarMode({
  lang, subjectId, accent, soft, active, query, onQuery, result, onQuizDone,
}: {
  lang: string
  subjectId: string
  accent: string
  soft: string
  active: boolean
  /** Общий поиск тренажёра: одна строка на экран, режим её не заводит. */
  query: string
  onQuery: (v: string) => void
  /** Результат прошлого прохождения формы — хранится страницей, у неё общий кэш. */
  result: (id: string) => { score: number; total: number } | undefined
  onQuizDone: (id: string, score: number, total: number) => void
}): GrammarMode {
  const t = useT()

  const on = useMemo(() => hasGrammarRef(lang), [lang])

  // Ленивый по той же причине, что и разговорник: восемьсот примеров одного
  // языка не должны приезжать тому, кто открыл тренажёр на «Чтении». Счётчик
  // для пункта меню при этом синхронный (GRAMMAR_COUNTS).
  const [gram, setGram] = useState<GrammarRef | null | undefined>(undefined)
  useEffect(() => {
    if (!on) { setGram(null); return }
    let alive = true
    setGram(undefined)
    loadGrammarRef(lang).then(r => { if (alive) setGram(r ?? null) })
    return () => { alive = false }
  }, [on, lang])

  // Открытая форма переживает F5 — как открытый текст и открытая тема.
  const [openId, setOpenId] = usePersistentState<string | null>(`trainer.${lang}.form`, null)
  const [chapter, setChapter] = useState('')
  /** Ступени справочника — многовыбор, как «Уровень» у сцен. */
  const [levels, setLevels] = useState<string[]>([])

  const openForm = useMemo(
    () => (gram && openId ? gram.forms.find(f => f.id === openId) ?? null : null),
    [gram, openId],
  )

  const groups = useMemo(() => {
    if (!gram) return []
    const q = query.trim().toLowerCase()
    const hit = gram.forms.filter(f => {
      if (chapter && f.chapter !== chapter) return false
      if (levels.length && !levels.includes(f.level)) return false
      if (!q) return true
      const hay = `${f.form} ${f.title} ${f.short} ${f.attach} ${f.rule} ${f.examples.map(e => `${e.text} ${e.ru}`).join(' ')}`
      return hay.toLowerCase().includes(q)
    })
    // Порядок разделов задаёт сам справочник, а не порядок находок: витрина
    // должна выглядеть одинаково при любом фильтре.
    return gram.chapters
      .map(c => ({ chapter: c, forms: hit.filter(f => f.chapter === c) }))
      .filter(g => g.forms.length > 0)
  }, [gram, chapter, levels, query])

  const found = useMemo(() => groups.reduce((n, g) => n + g.forms.length, 0), [groups])

  /** Ступени, которые вообще встречаются в справочнике, — для фильтра. */
  const levelOpts = useMemo(() => {
    if (!gram) return []
    const seen: string[] = []
    for (const f of gram.forms) if (!seen.includes(f.level)) seen.push(f.level)
    return seen.sort()
  }, [gram])

  const rail = !active ? null : gram && !openForm ? (
    <RailCard title="Раздел" accent={accent} icon={<BookMarked size={15} />}>
      <RailList
        items={[
          { id: '', label: t('Все разделы'), hint: String(gram.forms.length) },
          ...gram.chapters.map(c => ({
            id: c,
            label: t(c),
            hint: String(gram.forms.filter(f => f.chapter === c).length),
          })),
        ]}
        value={chapter}
        onChange={setChapter}
        accent={accent}
        soft={soft}
      />
    </RailCard>
  ) : null

  const toolbar = !active ? null : (
    <Toolbar>
      {openForm ? (
        <ToolButton onClick={() => setOpenId(null)}>
          <ChevronLeft size={14} /> {t('К справочнику')}
        </ToolButton>
      ) : (
        <>
          <SearchPill value={query} onChange={onQuery} placeholder={t('Форма, название или пример…')} />
          {/* Ступень стоит в строке фильтров, а не в рейле: то же место, что у
              «Уровня» на сценах, и один экземпляр переключателя на экран. */}
          {levelOpts.length > 1 && (
            <FilterMenu
              label="Уровень"
              options={levelOpts.map(l => ({
                value: l,
                label: l,
                count: gram ? gram.forms.filter(f => f.level === l).length : 0,
              }))}
              value={levels}
              onChange={setLevels}
              accent={accent}
              soft={soft}
            />
          )}
          <ToolCount>{found} {t(plural(found, ['форма', 'формы', 'форм']))}</ToolCount>
        </>
      )}
    </Toolbar>
  )

  const content = !active ? null : gram === undefined ? (
    <Skeleton.Cards rows={3} />
  ) : gram === null ? (
    <ShellEmpty text="Для этого языка справочник пока не написан." />
  ) : openForm ? (
    <GrammarPage
      form={openForm}
      all={gram}
      lang={lang}
      subject={subjectId}
      accent={accent}
      soft={soft}
      onOpenForm={id => setOpenId(id)}
      onQuizDone={onQuizDone}
    />
  ) : (
    <GrammarGrid groups={groups} result={result} accent={accent} soft={soft} onOpen={id => setOpenId(id)} />
  )

  return {
    on,
    count: on ? (GRAMMAR_COUNTS[lang] ?? GRAMMAR_COUNTS[lang.split('-')[0]]) : undefined,
    openId,
    setOpenId,
    subtitle: gram
      ? `${gram.forms.length} ${t('форм')} · ${gram.forms.reduce((n, f) => n + f.examples.length, 0)} ${t('примеров')}`
      : undefined,
    rail,
    toolbar,
    content,
    back: active && openForm ? () => setOpenId(null) : null,
    draftKey: [chapter, levels.join(',')].join('|'),
  }
}
