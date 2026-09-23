// ─────────────────────────────────────────────────────────────────────────────
// Режим «О языке» — рассказ и полка учебников
//
// ПЕРВЫЙ РЕЖИМ, ВЫНЕСЕННЫЙ ИЗ LanguageTrainer. Тот файл — четыре с половиной
// тысячи строк, в которых семь режимов делят одну область видимости: состояние
// каждого объявлено вперемешку с чужим, а его куски экрана разбросаны по трём
// цепочкам `else if` — рейл, строка управления, содержимое. Из-за этого правка
// одного режима перечитывается вместе с шестью соседями, а две сессии не могут
// работать в тренажёре одновременно, не столкнувшись.
//
// ПОЧЕМУ ХУК, А НЕ КОМПОНЕНТ. Скелет тренажёра (TrainerShell) принимает не одно
// дерево, а слоты: рейл, строку управления и содержимое по отдельности. Режим
// обязан отдать три куска сразу — компонентом это выражается только «через
// портал» или подъёмом состояния обратно наверх, то есть тем же, от чего
// уходим. Хук отдаёт слоты значениями и держит состояние у себя.
//
// ЧТО ОСТАЁТСЯ СНАРУЖИ. Переключение режимов, адрес экрана и ключи черновиков:
// это свойства ТРЕНАЖЁРА, а не режима. Хук лишь сообщает, чем он сейчас занят
// (`view`, `openId`), чтобы страница собрала из этого адрес и отметку «человек
// в материале».
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Compass, Library } from 'lucide-react'
import { useT } from '../../../lib/i18n'
import { usePersistentState } from '../../../lib/useDraft'
import { bindShortWords, proseWrap } from '../../../lib/typography'
import Skeleton from '../../Skeleton'
import {
  RailCard, RailSegment, RailList, Toolbar, ToolButton, ToolCount, Empty as ShellEmpty,
} from '../TrainerShell'
import { hasStory, loadStory } from '../../../data/languageGuides'
import type { LanguageStory } from '../../../data/languageStory'
import { hasTextbooks, textbooksForLang } from '../../../data/textbooks'
import { StoryGrid, StoryChapterPage } from '../StoryReader'
import { BookShelf } from '../BookShelf'

/** Две половины режима: рассказ о языке и полка учебников. */
export type GuideView = 'story' | 'books'

export interface GuideMode {
  /** Есть ли режим у этого языка вообще: без рассказа и без полки его нет. */
  on: boolean
  /** Число для пункта меню: главы плюс книги. */
  count: number | undefined
  view: GuideView
  setView: (v: GuideView) => void
  /** Открытая глава — по ней страница понимает, что человек внутри материала. */
  openId: string | null
  setOpenId: (v: string | null) => void
  /** Половины для нижней навигации телефона. */
  views: { id: string; label: string; badge?: number }[]
  rail: React.ReactNode
  toolbar: React.ReactNode
  content: React.ReactNode
  /** Куда ведёт «назад» внутри режима. Null — выходить некуда, режим на витрине. */
  back: (() => void) | null
}

export function useGuideMode({ lang, subjectId, accent, soft, narrow, active }: {
  lang: string
  /** Предмет, а не только язык: у «Русского» и «Литературы» он общий (ru), а полки разные. */
  subjectId: string
  accent: string
  soft: string
  /** Узкий экран: в рейле нет места сегментам, их показывает нижняя навигация. */
  narrow: boolean
  /** Открыт ли режим сейчас. Слоты собираются только для открытого. */
  active: boolean
}): GuideMode {
  const t = useT()

  // Рассказ ленивый (текст плюс векторные схемы), полка учебников — нет: восемь
  // описаний книг весят единицы килобайт, и мигание пустой полки ради них было
  // бы платой ни за что.
  const storyOn = useMemo(() => hasStory(lang), [lang])
  const booksOn = useMemo(() => hasTextbooks(lang, subjectId), [lang, subjectId])
  const books = useMemo(() => textbooksForLang(lang, subjectId), [lang, subjectId])
  const on = storyOn || booksOn

  const [story, setStory] = useState<LanguageStory | null | undefined>(undefined)
  useEffect(() => {
    if (!storyOn) { setStory(null); return }
    let alive = true
    setStory(undefined)
    loadStory(lang).then(x => { if (alive) setStory(x ?? null) })
    return () => { alive = false }
  }, [storyOn, lang])

  const [view, setView] = usePersistentState<GuideView>(
    `trainer.${lang}.guideView`, storyOn ? 'story' : 'books',
  )
  const [openId, setOpenId] = usePersistentState<string | null>(`trainer.${lang}.chapter`, null)
  const openChapter = useMemo(
    () => story?.chapters.find(c => c.id === openId) ?? null,
    [story, openId],
  )

  /**
   * Докуда дочитана каждая глава.
   *
   * Живёт ЗДЕСЬ, а не внутри читалки: ту же цифру показывает витрина полоской
   * «дочитано», и держи её читалка у себя — витрине пришлось бы лезть в чужое
   * хранилище по угаданному ключу.
   */
  const [read, setRead] = usePersistentState<Record<string, number>>(`trainer.${lang}.storyRead`, {})
  /**
   * Где палец сейчас, а не докуда дочитано.
   *
   * Отдельно от `read` намеренно: тот хранит МАКСИМУМ (полоска на витрине не
   * должна ехать назад от того, что человек вернулся перечитать), и пока
   * позиция читалки бралась оттуда же, кнопка «Назад» ничего не делала —
   * максимум от шага назад не менялся.
   */
  const [at, setAt] = usePersistentState<Record<string, number>>(`trainer.${lang}.storyAt`, {})

  // Восстановленная половина могла исчезнуть вместе с языком: рассказа на этом
  // языке нет, полки нет. Тогда молча съезжаем на ту, что есть, — иначе
  // таблетки в рейле нет, а содержимое от неё показано.
  useEffect(() => {
    if (view === 'story' && !storyOn) setView('books')
    else if (view === 'books' && !booksOn) setView('story')
  }, [view, storyOn, booksOn, setView])

  const count = on ? (story ? story.chapters.length : 0) + books.length : undefined

  const views = [
    ...(storyOn ? [{ id: 'story', label: 'Как устроен' }] : []),
    ...(booksOn ? [{ id: 'books', label: 'Учебники', badge: books.length }] : []),
  ]

  // ── Слоты ──────────────────────────────────────────────────────────────────
  //
  // Собираются только у открытого режима: шесть закрытых, считающих свои куски
  // экрана на каждый рендер, — это ровно та плата, ради ухода от которой всё и
  // затевалось.

  const rail = !active ? null : (
    <>
      <RailCard title="Раздел" accent={accent} icon={<Compass size={15} />}>
        {!narrow && (
          <RailSegment
            options={views.map(v => ({ value: v.id, label: v.label, badge: v.badge }))}
            value={view}
            onChange={v => v && setView(v as GuideView)}
            accent={accent}
            soft={soft}
            clearable={false}
          />
        )}
        {/* Главы списком в рейле: из читалки видно, что идёт дальше, и можно
            перескочить, не возвращаясь на витрину. */}
        {view === 'story' && story && story.chapters.length > 0 && (
          <RailList
            items={story.chapters.map(c => ({
              id: c.id,
              label: t(c.title),
              hint: `${Math.min(read[c.id] ?? 0, c.cards.length)}/${c.cards.length}`,
            }))}
            value={openId ?? ''}
            onChange={v => setOpenId(v === openId ? null : v)}
            accent={accent}
            soft={soft}
          />
        )}
      </RailCard>
      {view === 'books' && (
        <RailCard title="Про полку" accent={accent} icon={<Library size={15} />}>
          <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5, ...proseWrap }}>
            {bindShortWords(t('Здесь ссылки на официальные страницы издательств, а не файлы. Главное на карточке — строка «когда браться»: половина брошенных учебников взята не вовремя, а не выбрана неправильно.'))}
          </div>
        </RailCard>
      )}
    </>
  )

  const toolbar = !active ? null : openChapter ? (
    <Toolbar>
      <ToolButton onClick={() => setOpenId(null)}>
        <ChevronLeft size={14} /> {t('К главам')}
      </ToolButton>
      <ToolCount>{t(openChapter.title)}</ToolCount>
    </Toolbar>
  ) : view === 'books' ? (
    <Toolbar>
      <ToolCount>{books.length} {t('книг и ресурсов')}</ToolCount>
    </Toolbar>
  ) : (
    <Toolbar>
      <ToolCount>{story ? `${story.chapters.length} ${t('глав')}` : t('Загружаем…')}</ToolCount>
    </Toolbar>
  )

  const content = !active ? null : view === 'books' ? (
    <BookShelf books={books} lang={lang} accent={accent} soft={soft} />
  ) : openChapter ? (
    <StoryChapterPage
      chapter={openChapter}
      // Закладка: своя позиция, а если главу открыли впервые за сессию —
      // первая непрочитанная карточка (читалка сама зажмёт в границы главы).
      at={at[openChapter.id] ?? read[openChapter.id] ?? 0}
      onAt={n => {
        setAt(prev => ({ ...prev, [openChapter.id]: n }))
        // Прочитанное — максимум: полоска на витрине показывает «сколько
        // прочитано», а не «где сейчас палец».
        setRead(prev => ({ ...prev, [openChapter.id]: Math.max(prev[openChapter.id] ?? 0, n + 1) }))
      }}
      accent={accent}
      soft={soft}
      onDone={() => setOpenId(null)}
    />
  ) : story === undefined ? (
    <Skeleton.Text lines={4} style={{ maxWidth: 420 }} />
  ) : story ? (
    <StoryGrid
      story={story}
      read={id => read[id] ?? 0}
      accent={accent}
      soft={soft}
      onOpen={id => setOpenId(id)}
    />
  ) : (
    <ShellEmpty text="Рассказа об этом языке пока нет." />
  )

  return {
    on, count, view, setView, openId, setOpenId, views,
    rail, toolbar, content,
    back: active && openChapter ? () => setOpenId(null) : null,
  }
}
