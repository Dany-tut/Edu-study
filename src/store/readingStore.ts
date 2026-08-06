// Показывать ли чтение слова (романизацию, кану, транскрипцию).
//
// ЗАЧЕМ ТУМБЛЕР. Романизация нужна ровно до того момента, пока ученик не читает
// само письмо; дальше она из опоры превращается в костыль — глаз цепляется за
// латиницу и хангыль/кана так и не начинают читаться. Пока чтение было вклеено
// в лицо карточки строкой «우유 (uyu)», выключить его было нечем.
//
// ПОЧЕМУ ГЛОБАЛЬНО, А НЕ НА КУРС. Это свойство ученика, а не курса: человек либо
// уже читает письмо, либо ещё нет, и переключать это заново в каждом курсе он не
// должен. Живёт в localStorage — переживает перезагрузку, на сервер не ходит.

import { create } from 'zustand'

const KEY = 'reading_visible'

function getSaved(): boolean {
  // По умолчанию чтение ВКЛЮЧЕНО: новичок, впервые открывший корейский, без
  // романизации не прочитает ни слова. Выключает его тот, кому она мешает.
  try { return localStorage.getItem(KEY) !== '0' } catch { return true }
}

interface ReadingStore {
  visible: boolean
  toggle: () => void
}

export const useReadingVisible = create<ReadingStore>(set => ({
  visible: getSaved(),
  toggle: () => set(s => {
    const next = !s.visible
    try { localStorage.setItem(KEY, next ? '1' : '0') } catch {}
    return { visible: next }
  }),
}))
