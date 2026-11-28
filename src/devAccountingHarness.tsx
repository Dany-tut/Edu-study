// Локальный стенд курса «Бухгалтерия» (dev-accounting.html).
//
// ЗАЧЕМ. Предметный курс доезжает до ученика только через строки каталога в
// Supabase, а заводить курс в рабочую базу без согласования Дани нельзя
// (AGENTS.md, «Сохранность данных»). Стенд показывает ТОТ ЖЕ контент, что
// получит ученик (ACC_LESSONS → конспект через Prose, домашка через
// HomeworkFlow), без базы: оглавление, поиск по рабочим вопросам, файлы урока,
// прогресс и «продолжить с места» — в localStorage этого браузера.
//
// Это инструмент проверки, а не экран продукта: в приложении курс открывается
// обычной страницей урока Искры.
// Первым — хранилище кабинета: HomeworkFlow тянет studentDataStore, а тот на
// верхнем уровне обращается к useDashboard; без этого порядка цикл импорта
// падает «Cannot access 'useDashboard' before initialization» (dev-flow тоже).
import KonspektPara from './components/konspekt/KonspektBlocks'
import KonspektToc from './components/konspekt/KonspektToc'
import KonspektNav from './components/konspekt/KonspektNav'
import { parseKonspekt, konspektToc } from './lib/konspekt'
import './lib/platform'
import { accLessonFiles } from './data/accounting/accFiles'
import './store/studentDataStore'
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { isLabRef } from './lib/excelLab/embed'
import { createRoot } from 'react-dom/client'
import HomeworkFlow from './components/HomeworkFlow'
import AnswerFlightLayer from './components/AnswerFlightLayer'
import Prose from './components/Prose'
import ImageZoom from './components/ImageZoom'
import { NotesWithReveals } from './components/AnswerReveal'
import LessonAskCard from './components/LessonAskCard'
import { splitServiceParas } from './lib/lessonServiceParas'
import { proseLines, proseWrap } from './lib/typography'
import type { LessonHomework } from './data/lessonContent'
import { ACC_LESSONS, ACC_COURSE_TITLE } from './data/accounting/accountingLessons'
import './index.css'
// Живые блоки Excel-лаборатории — как в TheorySheet: разбор формулы и тренажёр по данным картинки.
const ExcelLabFigure = lazy(() => import('./components/excelLab/ExcelLabFigure'))

const PROGRESS = 'acc-stand:done'
const LAST = 'acc-stand:last'
const read = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? '') as T } catch { return d } }
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* приватный режим */ } }


const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е')

function Stand() {
  const initial = Number(new URLSearchParams(location.search).get('l') ?? read<number>(LAST, 0))
  const [idx, setIdx] = useState(Number.isFinite(initial) ? Math.min(Math.max(initial, 0), ACC_LESSONS.length - 1) : 0)
  const [done, setDone] = useState<number[]>(() => read<number[]>(PROGRESS, []))
  const [q, setQ] = useState('')
  const standNotesRef = useRef<HTMLElement>(null)
  const [zoom, setZoom] = useState<{ src: string; caption?: string } | null>(null)
  // На телефоне оглавление — сверху обычным блоком: липкая колонка налезала на урок.
  const wide = typeof window !== 'undefined' && window.innerWidth >= 900
  useEffect(() => {
    write(LAST, idx)
    const u = new URL(location.href); u.searchParams.set('l', String(idx)); history.replaceState(null, '', u)
    document.getElementById('lesson-top')?.scrollIntoView()
  }, [idx])

  const hits = useMemo(() => {
    const n = norm(q.trim())
    if (!n) return []
    return ACC_LESSONS.flatMap(x => {
      const pool = [x.lesson.title, ...x.lesson.queries, ...x.lesson.topics]
      const hit = pool.find(s => norm(s).includes(n))
      return hit ? [{ x, hit }] : []
    }).slice(0, 30)
  }, [q])

  const cur = ACC_LESSONS[idx]
  // Стенд без базы: «сдано» для разбора после сдачи — флажок ?submitted=1.
  const standSubmitted = new URLSearchParams(location.search).get('submitted') === '1'
  // ?scale=1.2 — как «Крупный текст» в уроке: проверить, что блоки растут вместе с текстом.
  const standScale = Number(new URLSearchParams(location.search).get('scale') ?? 1) || 1
  const { lesson, module } = cur
  const service = splitServiceParas(lesson.content.paragraphs)
  const toc = konspektToc(service.notes)
  // Тот же вид текста, что в уроке (LessonPage renderNoteText), без разбора слов.
  const standText = (text: string, key: string, style?: React.CSSProperties) => (
    <div key={key} style={{ fontSize: '1em', lineHeight: 1.6, fontWeight: 500, color: 'var(--color-text)', ...style }}>
      {proseLines(text).map(line => <p key={line.key} style={{ fontSize: 'inherit', lineHeight: 'inherit', fontWeight: 'inherit', color: 'inherit', margin: 0, ...proseWrap, ...line.style }}><Prose text={line.text} /></p>)}
    </div>
  )
  // Тот же список, что ученик видит в «Материалах» урока (accFiles.ts).
  const files = (accLessonFiles([lesson.practice, ...lesson.content.paragraphs.map(p => p.text), lesson.content.hardTask.prompt]).materials ?? []).map(f => f.name)
  const homework: LessonHomework = {
    title: 'Проверь себя', subtitle: lesson.title, recommendationScore: 4, hasHardLevel: true,
    levels: [
      { id: 'basic', title: 'Проверка', shortLabel: 'Проверка', kind: 'quiz', motivation: 'Вопросы по уроку', dueDate: '2026-12-31', estimatedMinutes: 8, questions: lesson.content.quiz },
      { id: 'hard', title: 'Практика', shortLabel: 'Практика', kind: 'teacher-review', optional: true, unlockScore: 0, motivation: 'Практическое задание', dueDate: '2026-12-31', estimatedMinutes: 20, teacherTask: lesson.content.hardTask },
    ],
  }
  const modules = [...new Map(ACC_LESSONS.map(x => [x.module.id, x.module])).values()]
  const total = ACC_LESSONS.length
  const toggleDone = () => {
    const next = done.includes(idx) ? done.filter(i => i !== idx) : [...done, idx]
    setDone(next); write(PROGRESS, next)
  }

  return (
    <div style={{ display: 'flex', gap: 20, padding: 16, maxWidth: 1600, margin: '0 auto', color: 'var(--color-text)', background: 'var(--color-bg)', minHeight: '100vh', flexWrap: 'wrap' }}>
      <aside style={wide
        ? { flex: '1 1 300px', maxWidth: 380, position: 'sticky', top: 0, alignSelf: 'flex-start', maxHeight: '100vh', overflowY: 'auto', paddingBottom: 24 }
        : { flex: '1 1 100%', paddingBottom: 8 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: '4px 0 2px' }}>{ACC_COURSE_TITLE}</h1>
        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 10 }}>
          Локальный стенд · пройдено {done.length} из {total} · <a href="#" onClick={e => { e.preventDefault(); setIdx(read<number>(LAST, 0)) }}>продолжить</a>
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Рабочий вопрос: «реестр не проводится»…"
          style={{ width: '100%', fontSize: 16, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)', boxSizing: 'border-box' }} />
        {q && (
          <div style={{ margin: '8px 0 14px' }}>
            {hits.length === 0 && <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>Ничего не найдено — попробуйте другое слово.</div>}
            {hits.map(({ x, hit }) => (
              <button key={x.shortId} onClick={() => { setIdx(x.index); setQ('') }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', border: 0, background: 'transparent', color: 'var(--color-text)', cursor: 'pointer', borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>№{x.index + 1} {x.lesson.title}</div>
                <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{hit}</div>
              </button>
            ))}
          </div>
        )}
        {modules.map(m => (
          <div key={m.id} style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase' }}>{m.title}</div>
            {ACC_LESSONS.filter(x => x.module.id === m.id).map(x => (
              <button key={x.shortId} onClick={() => setIdx(x.index)} style={{ display: 'flex', gap: 6, width: '100%', textAlign: 'left', padding: '5px 6px', border: 0, borderRadius: 8, cursor: 'pointer', fontSize: 13, background: x.index === idx ? 'var(--color-accent-soft)' : 'transparent', color: 'var(--color-text)' }}>
                <span style={{ width: 18, color: 'var(--color-green-text)' }}>{done.includes(x.index) ? '✓' : ''}</span>
                <span>№{x.index + 1} {x.lesson.title}</span>
              </button>
            ))}
          </div>
        ))}
      </aside>

      <main style={{ flex: '3 1 560px', minWidth: 0 }}>
        <div id="lesson-top" />
        <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{module.title} · Занятие №{idx + 1} · {cur.shortId}</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: '4px 0 8px' }}>{lesson.title}</h2>
        <div style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--color-text-2)', marginBottom: 12 }}>
          <div>⏱ около {lesson.minutes} мин · 📍 {lesson.practice}</div>
          {lesson.software && <div>💻 {lesson.software}</div>}
          {lesson.applies && <div>📅 Применимость: {lesson.applies}</div>}
          {files.length > 0 && <div>⬇ Файлы: {files.map(f => <a key={f} href={`/courses/accounting/${f}`} download style={{ marginRight: 10 }}>{f}</a>)}</div>}
        </div>
        <article ref={standNotesRef} style={{ padding: 20, borderRadius: 16, border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-card)' }}>
          <div className={`konspekt-layout${toc.length >= 3 ? ' has-toc' : ''}`}>
          <div className="konspekt-col" style={{ fontSize: 16 * standScale }}>
          <NotesWithReveals paragraphs={service.notes} unlocked={standSubmitted} scale={standScale} renderPara={par => par.image && isLabRef(par.image) ? (
            <Suspense key={par.id} fallback={null}><ExcelLabFigure src={par.image} caption={par.text} /></Suspense>
          ) : par.image ? (
            <figure key={par.id} className="k-wide" style={{ margin: 0, maxWidth: 680, marginInline: 'auto' }}>
              <button type="button" onClick={() => setZoom({ src: par.image!, caption: par.text })} title="Открыть крупно" style={{ display: 'block', width: '100%', padding: 0, border: 0, background: 'none', cursor: 'zoom-in' }}>
                <img src={par.image} alt={par.text} style={{ display: 'block', width: '100%', borderRadius: 12, border: '1px solid var(--color-border)', background: '#fff' }} />
              </button>
              <figcaption style={{ marginTop: 6, fontSize: 12, color: 'var(--color-muted)', ...proseWrap }}><Prose text={par.text} /></figcaption>
            </figure>
          ) : parseKonspekt(par.text) ? (
            <KonspektPara key={par.id} pid={par.id} blocks={parseKonspekt(par.text)!} rt={standText} />
          ) : standText(par.text, par.id)} />
          {service.askSection !== null && <LessonAskCard section={service.askSection} scale={standScale} />}
          </div>
          {toc.length >= 3 && wide && <KonspektToc items={toc} />}
          </div>
          {!wide && <KonspektNav items={toc} big={standScale > 1} onToggleBig={() => { const u = new URL(location.href); u.searchParams.set('scale', standScale > 1 ? '1' : '1.25'); location.href = u.toString() }} sectionRef={standNotesRef} />}
        </article>
        <ImageZoom src={zoom?.src ?? null} caption={zoom?.caption} onClose={() => setZoom(null)} />
        <div style={{ display: 'flex', gap: 8, margin: '14px 0' }}>
          <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}>← Назад</button>
          <button onClick={toggleDone}>{done.includes(idx) ? 'Отметка снята? Нажмите ещё раз' : 'Урок пройден ✓'}</button>
          <button onClick={() => setIdx(Math.min(total - 1, idx + 1))} disabled={idx === total - 1}>Дальше →</button>
        </div>
        <div style={{ maxWidth: 1000 }}>
          <div id="widget-pill-target" style={{ position: 'fixed', top: 8, right: 8, width: 60, height: 24 }} />
          <AnswerFlightLayer />
          <HomeworkFlow key={cur.shortId} lessonId={`stand-${cur.shortId}`} lessonTitle={lesson.title} subject="Бухгалтерия" homework={homework} onBack={() => {}} />
        </div>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Stand />)
