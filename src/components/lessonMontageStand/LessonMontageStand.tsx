import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import LessonMontageEditor, { TONE, type MontageResult } from '../teacher/LessonMontageEditor'
import Switch from '../Switch'
import Segmented from '../Segmented'
import { ArrowRight, AudioLines, ChevronRight } from '../icons/appIcons'
import { useTheme } from '../../store/themeStore'
import { clock, editedDuration, span } from '../../lib/lessonMontage'
import { fixtures, voices } from './fixture'
import { parseVideoSource } from '../../lib/videoSource'
import './lessonMontageStand.css'

// DEV-стенд монтажа записи: /lesson-montage-stand. Без сервера и аккаунта —
// фикстура в том виде, в каком её отдаст локальный модуль расшифровки.

type Saved = Parameters<Parameters<typeof LessonMontageEditor>[0]['onApply']>
export default function LessonMontageStand() {
  const { dark, toggle } = useTheme()
  const [open, setOpen] = useState(() => new URLSearchParams(location.search).has('open'))
  const [variant, setVariant] = useState<keyof typeof fixtures>(() => new URLSearchParams(location.search).get('pauses') === 'many' ? 'many' : 'few')
  const fixture = fixtures[variant], chapters = fixture.chapters
  // ?video=<ссылка> — проверить окно со звуком на настоящем ролике.
  // Прошлые уроки курса с итогами — чтобы на стенде была видна динамика.
  const trend = [
    { id: 'u4', title: 'Урок 4 · Строение атома', stats: { teacherShare: 0.82, questions: 6, answered: 3, speakers: [{ label: 'Ученик 1', role: 'student' as const, seconds: 40 }, { label: 'Ученик 2', role: 'student' as const, seconds: 0 }] } },
    { id: 'u5', title: 'Урок 5 · Химическая связь', stats: { teacherShare: 0.74, questions: 8, answered: 5, speakers: [{ label: 'Ученик 1', role: 'student' as const, seconds: 60 }, { label: 'Ученик 2', role: 'student' as const, seconds: 25 }] } },
    { id: 'u6', title: 'Урок 6 · Растворы', stats: { teacherShare: 0.69, questions: 7, answered: 6, speakers: [{ label: 'Ученик 2', role: 'student' as const, seconds: 50 }] } },
    { id: 'u7', title: 'Урок 7 · ОВР', current: true },
  ]
  const [video] = useState(() => parseVideoSource(new URLSearchParams(location.search).get('video')))
  const [saved, setSaved] = useState<Saved | null>(null)
  const result: MontageResult | undefined = saved?.[0]
  return <div className="lms-root">
    <header className="lms-top">
      <div><h1>Искра · монтаж записи урока</h1><p>Стенд: паузы, говорящие, реплики. Данные — фикстура группового урока химии, учитель и трое учеников.</p></div>
      <div className="lms-controls">
        <Segmented variant="filter" value={variant} onChange={v => { setVariant(v); setSaved(null) }}
          items={[{ id: 'few', label: 'Обычный урок' }, { id: 'many', label: 'Много пауз' }]} />
        <label className="lms-theme">Тёмная тема<Switch checked={dark} onChange={toggle} label="Тёмная тема" /></label>
      </div>
    </header>
    <main className="lms-main">
      <section className="lms-lesson">
        <small>Конструктор · курс «Химия ЕГЭ» · урок 7 · Запись</small>
        <h2>Окислительно-восстановительные реакции</h2>
        <button type="button" className="lms-entry" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          <span className="lms-mark"><AudioLines size={22} /></span>
          <span className="lms-copy"><strong>Монтаж записи</strong><small>{result ? `Применён: было ${clock(result.duration)}, стало ${clock(result.duration - cut(result))}` : `Найдены паузы и ${voices.length} голосов — проверьте перед публикацией`}</small></span>
          <span className="lms-action">{result ? 'Изменить' : 'Открыть'} <ChevronRight size={15} /></span>
        </button>
      </section>
      {result && <section className="lms-result" aria-label="Что сохранится в урок">
        <h3>Что сохранится в урок</h3>
        <div className="lms-cards">
          <div><strong>{clock(result.duration - cut(result))}</strong><small>длина урока вместо {clock(result.duration)}</small></div>
          <div><strong>{result.pauses.filter(p => p.action === 'cut').length}</strong><small>вырезано · {span(result.pauses.filter(p => p.action === 'cut').reduce((s, p) => s + p.end - p.start, 0))}</small></div>
          <div><strong>{result.pauses.filter(p => p.action === 'speed').length}</strong><small>ускорено ×{result.settings.speed}</small></div>
        </div>
        <h4>Говорящие</h4>
        <div className="lms-chips">{result.speakers.map(s => <span key={s.id} style={{ background: TONE[s.tone].bg, color: TONE[s.tone].text }}>{s.label} · {s.role === 'teacher' ? 'учитель' : 'ученик'}</span>)}</div>
        <h4>Главы после монтажа</h4>
        <ol className="lms-chapters">{result.timecodes.map((c, i) => <li key={i}><span>{clock(chapters[i].seconds)} <ArrowRight size={12} /> <strong>{c.time}</strong></span>{c.label}</li>)}</ol>
        <details><summary>Данные монтажа (JSON)</summary><pre>{JSON.stringify({ settings: result.settings, segments: result.pauses.filter(p => p.action !== 'keep').map(p => ({ start: +p.start.toFixed(1), end: +p.end.toFixed(1), action: p.action })), speakers: result.speakers }, null, 2)}</pre></details>
      </section>}
    </main>
    <AnimatePresence>{open && <LessonMontageEditor key={'editor-' + variant} title="Монтаж записи · урок 7" duration={fixture.duration} voices={voices}
      lines={fixture.lines} quiet={fixture.quiet} chapters={chapters} levelAt={fixture.levelAt} initial={saved?.[1]} video={video} trend={trend}
      onApply={(...args) => setSaved(args)} onClose={() => setOpen(false)} />}</AnimatePresence>
  </div>
}

const cut = (r: MontageResult) => r.duration - editedDuration(r.duration, r.pauses, r.settings.speed)
