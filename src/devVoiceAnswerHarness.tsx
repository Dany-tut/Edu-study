// Стенд «ответ голосом» (dev-voice-answer.html). Поле развёрнутого ответа с
// VoiceDictation и блок учителя на фикстурах, без базы.
//
// Распознавалка подменена: ?fake=1 — «говорит» фразу по словам (живой текст
// печатается в поле), без параметра — настоящий Web Speech браузера.
// Запись в стенде не грузится (нет входа): ?keep=1 — попытка загрузки и
// сообщение «запись не загрузилась».
//   ?theme=dark — тёмная тема
import './lib/platform'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import GrowTextarea from './components/GrowTextarea'
import VoiceDictation from './components/VoiceDictation'
import BasicAnswersList from './components/teacher/BasicAnswersList'
import type { AnswerVoiceClip } from './lib/answerVoice'
import type { BasicAnswersPayload } from './lib/basicAnswers'
import './index.css'

const params = new URLSearchParams(location.search)
if (params.get('theme') === 'dark') document.documentElement.dataset.theme = 'dark'

if (params.get('fake') === '1') {
  const PHRASE = 'входной НДС принимаем к вычету после оприходования товара и получения счёта фактуры а в EBITDA это не влияет'.split(' ')
  class FakeRec {
    lang = ''; continuous = false; interimResults = false; maxAlternatives = 1
    onresult: ((e: unknown) => void) | null = null
    onerror: (() => void) | null = null
    onend: (() => void) | null = null
    private timer: ReturnType<typeof setInterval> | null = null
    private n = 0
    start() {
      this.timer = setInterval(() => {
        this.n = Math.min(PHRASE.length, this.n + 1)
        const res = Object.assign([{ transcript: PHRASE.slice(0, this.n).join(' ') }], { isFinal: false })
        this.onresult?.({ results: [res] })
      }, 280)
    }
    stop() { this.finish(true) }
    abort() { this.finish(false) }
    private finish(final: boolean) {
      if (this.timer) clearInterval(this.timer)
      if (final && this.n) this.onresult?.({ results: [Object.assign([{ transcript: PHRASE.slice(0, this.n).join(' ') }], { isFinal: true })] })
      setTimeout(() => this.onend?.(), 30)
    }
  }
  ;(window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeRec
}

const PROMPT = 'Объясните, когда входной НДС можно принять к вычету и как это отражается в учёте.'

const teacherPayload: BasicAnswersPayload = {
  v: 'basic-1', gradable: 0, correct: 0,
  rows: [{
    n: 3, prompt: PROMPT, type: 'extended', verdict: 'review',
    answer: 'Входной НДС принимаем к вычету после оприходования товара и получения счёта-фактуры. На EBITDA это не влияет.',
    dictation: [{ path: URL.createObjectURL(new Blob(['x'], { type: 'audio/webm' })), sec: 14, mime: 'audio/webm', heard: 'входной НДС принимаем к вычету после оприходования товара и получения счёта фактуры а в EBITDA это не влияет' }],
  }],
}

function Stand() {
  const [value, setValue] = useState('')
  const [clips, setClips] = useState<AnswerVoiceClip[]>([])
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: 16, boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <section style={{ background: 'var(--color-bg-2)', borderRadius: 24, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid var(--color-border-soft)' }}>
          <b style={{ color: 'var(--color-text)', fontSize: 15 }}>3. {PROMPT}</b>
          <GrowTextarea value={value} onChange={setValue} minHeight={96} placeholder="Развёрнутый ответ…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 16, fontFamily: 'inherit', fontSize: 14, color: 'var(--color-text)', background: 'var(--color-bg-input)', outline: 'none', border: '1px solid var(--color-border)' }} />
          <VoiceDictation value={value} onChange={setValue} lang="ru-RU" keep={params.get('keep') === '1'} clips={clips} onClips={setClips} studentId="stand" />
          <small data-testid="clips" style={{ color: 'var(--color-text-3)' }}>Записей приложено: {clips.length}</small>
        </section>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <b style={{ color: 'var(--color-text)' }}>Учитель видит</b>
          <BasicAnswersList payload={teacherPayload} showSummary={false} />
        </section>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Stand />)
