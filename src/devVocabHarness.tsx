// ВРЕМЕННЫЙ стенд для скриншота «Слов урока». Удаляется сразу после съёмки.
import { createRoot } from 'react-dom/client'
import VocabIntro from './components/VocabIntro'
import { vocabImage } from './data/vocabImages'
import type { HomeworkQuizQuestion } from './data/lessonContent'
import './index.css'

const W = (id: string, front: string, reading: string, back: string): HomeworkQuizQuestion => ({
  id, type: 'flashcard', prompt: front, front, reading, back, lang: 'ko',
  image: vocabImage(back),
} as HomeworkQuizQuestion)

const words = [
  W('1', 'ㅏ', '아', 'а'), W('2', 'ㅓ', '어', 'о (eo)'), W('3', 'ㅗ', '오', 'о (o)'),
  W('4', 'ㅜ', '우', 'у'), W('5', 'ㅡ', '으', 'ы'), W('6', 'ㅣ', '이', 'и'),
  W('7', 'ㅇ', '이응', 'нъ'),
  W('8', '아이', 'аи', 'ребёнок'),
  W('9', '오이', 'ои', 'огурец'), W('10', '이', 'и', 'этот'), W('11', '오', 'о', 'пять'),
]

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 24, maxWidth: 1040, margin: '0 auto' }}>
    <VocabIntro words={words} accent="#8B7CF0" soft="rgba(139,124,240,0.16)" defaultOpen={false} started />
  </div>,
)

// ?speak — кадр «слово звучит»: бегунок останавливаем на середине, чтобы он попал
// в снимок. Сам синтез заглушён — в headless голос не нужен.
if (location.search.includes('speak')) {
  setTimeout(() => {
    const card = document.querySelectorAll<HTMLButtonElement>('.vocab-card')[8]
    card?.click()
    setTimeout(() => {
      const fill = document.querySelector('.vocab-speak-fill')
      const anim = fill?.getAnimations()[0]
      if (anim) { anim.pause(); anim.currentTime = 400 }
    }, 120)
  }, 500)
}
