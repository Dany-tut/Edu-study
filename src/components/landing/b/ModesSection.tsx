// «27 режимов заданий» (Figma «Искра», стр. 290:2: секция 303:356 / тёмная
// 303:742, блок «Постеры режимов» 347:600 / 347:768). Жанры фильтруют постеры,
// лента листается вбок со щелчками, фейдами по краям и стрелками. Наведение или
// фокус на любом постере — подъём, цветная рамка со свечением, и мини-макет
// «проигрывается»: анимированный WebP из трёх стадий задания (пусто → в процессе
// → готово), отрисованных с TaskTypePreviewCard. На телефоне играет по касанию.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useT } from '../../../lib/i18n'
import { useTheme } from '../../../store/themeStore'
import { ChevronLeft, ChevronRight } from '../../icons/appIcons'
import { asset, Section, SectionHead } from './kit'

type Genre = 'listen' | 'build' | 'write' | 'speech' | 'words'

const GENRES: { id: Genre; label: string; rgb: string; hex: string }[] = [
  { id: 'listen', label: 'Слух', rgb: '74,133,237', hex: '#4a85ed' },
  { id: 'build', label: 'Сборка', rgb: '224,168,41', hex: '#e0a829' },
  { id: 'write', label: 'Письмо', rgb: '237,117,66', hex: '#ed7542' },
  { id: 'speech', label: 'Речь и картинки', rgb: '143,115,245', hex: '#8f73f5' },
  { id: 'words', label: 'Слова и выбор', rgb: '46,184,133', hex: '#2eb885' },
]
const genreOf = (id: Genre) => GENRES.find(g => g.id === id)!

type Subject = 'Химия' | 'Биология' | 'Английский' | 'Корейский'

/** Порядок и данные — как в ленте макета (номер = имя картинки modes-<тема>-NN). */
const POSTERS: { n: number; mode: string; genre: Genre; subject: Subject }[] = [
  { n: 1, mode: 'wordBank', genre: 'build', subject: 'Химия' },
  { n: 2, mode: 'single', genre: 'words', subject: 'Биология' },
  { n: 3, mode: 'tableFill', genre: 'write', subject: 'Химия' },
  { n: 4, mode: 'matching', genre: 'words', subject: 'Биология' },
  { n: 5, mode: 'sequence', genre: 'build', subject: 'Биология' },
  { n: 6, mode: 'crossword', genre: 'words', subject: 'Биология' },
  { n: 7, mode: 'pattern', genre: 'write', subject: 'Химия' },
  { n: 8, mode: 'wordDrop', genre: 'write', subject: 'Химия' },
  { n: 9, mode: 'listenBank', genre: 'listen', subject: 'Биология' },
  { n: 10, mode: 'listenType', genre: 'listen', subject: 'Биология' },
  { n: 11, mode: 'speaking', genre: 'speech', subject: 'Биология' },
  { n: 12, mode: 'whiteboard', genre: 'speech', subject: 'Химия' },
  { n: 13, mode: 'imageDescribe', genre: 'speech', subject: 'Биология' },
  { n: 14, mode: 'imageCompare', genre: 'speech', subject: 'Биология' },
  { n: 15, mode: 'extended', genre: 'speech', subject: 'Биология' },
  { n: 16, mode: 'fill', genre: 'write', subject: 'Химия' },
  { n: 17, mode: 'multi', genre: 'words', subject: 'Биология' },
  { n: 18, mode: 'flashcard', genre: 'words', subject: 'Биология' },
  { n: 19, mode: 'blockOrder', genre: 'build', subject: 'Биология' },
  { n: 20, mode: 'videoWatch', genre: 'listen', subject: 'Химия' },
  { n: 21, mode: 'minimalPair', genre: 'listen', subject: 'Английский' },
  { n: 22, mode: 'dialogGap', genre: 'listen', subject: 'Английский' },
  { n: 23, mode: 'unscramble', genre: 'build', subject: 'Корейский' },
  { n: 24, mode: 'charBank', genre: 'build', subject: 'Корейский' },
  { n: 25, mode: 'buildSyllable', genre: 'build', subject: 'Корейский' },
  { n: 26, mode: 'jamoType', genre: 'write', subject: 'Корейский' },
  { n: 27, mode: 'trace', genre: 'words', subject: 'Корейский' },
]

const pad = (n: number) => String(n).padStart(2, '0')

// ── Жанры ────────────────────────────────────────────────────────────────────

function GenreTab({ active, dot, label, count, dark, onClick }: { active: boolean; dot?: string; label: string; count: number; dark: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-[9px] transition-colors ${
        active
          ? 'bg-[var(--color-text)] text-[var(--color-bg)]'
          : dark
            ? 'bg-[rgba(255,255,255,0.06)] text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.1)]'
            : 'bg-[rgba(0,0,0,0.04)] text-[var(--color-text)] hover:bg-[rgba(0,0,0,0.07)]'
      }`}
    >
      {dot && <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: dot }} />}
      <span className="text-[14px] font-semibold">{label}</span>
      <span className={`text-[13px] opacity-60 ${active ? '' : 'text-[var(--color-muted)]'}`}>{count}</span>
    </button>
  )
}

// ── Постер ───────────────────────────────────────────────────────────────────

function Poster({ n, genre, subject, dark }: { n: number; genre: Genre; subject: Subject; dark: boolean }) {
  const t = useT()
  const g = genreOf(genre)
  const c = g.rgb
  // Анимация стартует заново при каждом наведении: новый key пересоздаёт <img>.
  const [play, setPlay] = useState(0)
  const start = () => setPlay(v => (v > 0 ? v : Math.abs(v) + 1))
  const stop = () => setPlay(v => -Math.abs(v))
  const [ready, setReady] = useState(0)
  const theme = dark ? 'dark' : 'light'
  const still = asset(`modes-${theme}-${pad(n)}.webp`)
  const anim = asset(`modes-${theme}-${pad(n)}-play.webp`)
  // Анимацию подгружаем заранее, как только постер рядом с экраном, —
  // к наведению она уже в кеше и стартует сразу.
  const root = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = root.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting)) { const im = new Image(); im.src = anim; io.disconnect() }
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [anim])
  const style = {
    '--pc': c,
    backgroundImage: dark
      ? `linear-gradient(180deg, rgba(${c},0.42) 0%, rgba(${c},0.06) 75%), linear-gradient(#1c1c24, #1c1c24)`
      : `linear-gradient(180deg, rgba(${c},0.3) 0%, rgba(${c},0.04) 80%), linear-gradient(#fff, #fff)`,
    borderColor: `rgba(${c},${dark ? 0.35 : 0.25})`,
  } as CSSProperties
  const fade = dark ? '28,28,36' : '255,255,255'

  return (
    <article
      ref={root}
      tabIndex={0}
      aria-label={`${pad(n)} · ${t(g.label)} · ${t(subject)}`}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
      onPointerUp={e => { if (e.pointerType === 'touch') setPlay(v => (v > 0 ? -v : Math.abs(v) + 1)) }}
      className={`mode-poster group outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] relative h-[336px] w-[300px] shrink-0 snap-start overflow-hidden rounded-[24px] border transition-[transform,box-shadow,border-color] duration-200 ease-out
        hover:-translate-y-[14px] focus-within:-translate-y-[14px]
        hover:![border-color:rgba(var(--pc),0.9)] focus-within:![border-color:rgba(var(--pc),0.9)]
        ${dark
          ? 'hover:shadow-[0_0_0_1px_rgba(var(--pc),0.9),0_20px_40px_-6px_rgba(var(--pc),0.45)] focus-within:shadow-[0_0_0_1px_rgba(var(--pc),0.9),0_20px_40px_-6px_rgba(var(--pc),0.45)]'
          : 'hover:shadow-[0_0_0_1px_rgba(var(--pc),0.9),0_20px_40px_-6px_rgba(var(--pc),0.35)] focus-within:shadow-[0_0_0_1px_rgba(var(--pc),0.9),0_20px_40px_-6px_rgba(var(--pc),0.35)]'}`}
      style={style}
    >
      <p
        className="absolute left-[15px] top-[5px] whitespace-nowrap text-[56px] font-bold tracking-[-2.24px]"
        style={{ color: `rgba(${c},${dark ? 0.55 : 0.45})` }}
        aria-hidden
      >
        {pad(n)}
      </p>
      <div className="absolute right-[15px] top-[21px] flex flex-col items-end gap-[4px] text-right">
        <p className="whitespace-nowrap text-[11px] font-semibold uppercase leading-[13px] tracking-[0.88px]" style={{ color: g.hex }}>
          {t(g.label)}
        </p>
        <p className={`whitespace-nowrap text-[12px] font-semibold leading-[14px] ${dark ? 'text-[rgba(235,235,242,0.75)]' : 'text-[rgba(51,51,64,0.75)]'}`}>
          {t(subject)}
        </p>
      </div>
      {/* Неподвижный кадр виден всегда; анимация ложится сверху, только когда
          догрузилась, — без пустоты при наведении. Пока грузится — блик-скелетон. */}
      <img
        src={still}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute left-[9px] top-[75px] h-[254px] w-[280px] rounded-[16px] object-contain"
      />
      {play > 0 && (
        <img
          key={`play-${play}`}
          src={anim}
          alt=""
          decoding="async"
          onLoad={() => setReady(play)}
          className={`absolute left-[9px] top-[75px] h-[254px] w-[280px] rounded-[16px] object-contain transition-opacity duration-200 ${ready === play ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {play > 0 && ready !== play && (
        <span aria-hidden className="lp-skeleton pointer-events-none absolute left-[9px] top-[75px] h-[254px] w-[280px] rounded-[16px]" />
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-[56px] w-full"
        style={{ backgroundImage: `linear-gradient(180deg, rgba(${fade},0) 0%, rgba(${fade},0.95) 100%)` }}
      />
    </article>
  )
}

// ── Лента с фейдами и стрелками ──────────────────────────────────────────────

function ArrowButton({ dir, disabled, dark, onClick, label }: { dir: 'prev' | 'next'; disabled: boolean; dark: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-12 items-center justify-center rounded-full text-[26px] font-semibold leading-none shadow-[0_6px_16px_rgba(0,0,0,0.12)] transition-[opacity,transform] hover:scale-105 disabled:cursor-default disabled:opacity-50 disabled:hover:scale-100 ${
        dark ? 'bg-[#2e2e38] text-[#f5f5fa]' : 'bg-white text-[#121217]'
      }`}
    >
      {dir === 'prev' ? <ChevronLeft size={22} aria-hidden /> : <ChevronRight size={22} aria-hidden />}
    </button>
  )
}

export default function ModesSection() {
  const t = useT()
  const dark = useTheme(s => s.dark)
  const [genre, setGenre] = useState<Genre | 'all'>('all')
  const stripRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: false })

  const visible = genre === 'all' ? POSTERS : POSTERS.filter(p => p.genre === genre)

  const measure = useCallback(() => {
    const el = stripRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft >= max - 4 })
  }, [])

  useEffect(() => {
    const el = stripRef.current
    if (!el) return
    el.scrollTo({ left: 0 })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [genre, measure])

  const scrollBy = (dir: 1 | -1) => {
    const el = stripRef.current
    if (!el) return
    const step = Math.max(320, Math.floor((el.clientWidth - 40) / 320) * 320)
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  const fadeTo = 'var(--color-bg)'

  return (
    <Section id="modes" className="pb-[10px] pt-16 sm:pt-[110px]">
      <SectionHead
        eyebrow={t('Тренажёр')}
        title={t('27 режимов заданий')}
        lead={t('Слух, речь, письмо, сборка тапами и вспоминание по значению — каждый навык тренируется своим экраном.')}
      />

      <div className="mt-10 flex flex-col gap-7">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('Жанры режимов')}>
          <GenreTab active={genre === 'all'} label={t('Все')} dark={dark} count={POSTERS.length} onClick={() => setGenre('all')} />
          {GENRES.map(g => (
            <GenreTab
              key={g.id}
              active={genre === g.id}
              dot={g.hex}
              dark={dark}
              label={t(g.label)}
              count={POSTERS.filter(p => p.genre === g.id).length}
              onClick={() => setGenre(g.id)}
            />
          ))}
        </div>

        <div className="relative -mx-4 sm:-mx-10">
          <div
            ref={stripRef}
            onScroll={measure}
            className="flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto overscroll-x-contain px-4 pb-14 pt-5 -mb-9 [scrollbar-width:none] sm:scroll-px-10 sm:px-10 [&::-webkit-scrollbar]:hidden"
            aria-label={t('Постеры режимов')}
            role="region"
            tabIndex={-1}
          >
            {visible.map(p => (
              <Poster key={p.n} n={p.n} genre={p.genre} subject={p.subject} dark={dark} />
            ))}
          </div>

          {/* Фейды краёв: левый появляется после прокрутки, правый — пока есть что листать. */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 left-0 w-16 transition-opacity duration-200 sm:w-[120px] ${edges.start ? 'opacity-0' : 'opacity-100'}`}
            style={{ backgroundImage: `linear-gradient(270deg, transparent, ${fadeTo})` }}
          />
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 right-0 w-16 transition-opacity duration-200 sm:w-[160px] ${edges.end ? 'opacity-0' : 'opacity-100'}`}
            style={{ backgroundImage: `linear-gradient(90deg, transparent, ${fadeTo})` }}
          />

          {!(edges.start && edges.end) && (
            <div className="flex justify-end gap-3 px-4 sm:absolute sm:right-10 sm:top-[164px] sm:px-0">
              <ArrowButton dir="prev" label={t('Назад')} dark={dark} disabled={edges.start} onClick={() => scrollBy(-1)} />
              <ArrowButton dir="next" label={t('Вперёд')} dark={dark} disabled={edges.end} onClick={() => scrollBy(1)} />
            </div>
          )}
        </div>
      </div>
    </Section>
  )
}
