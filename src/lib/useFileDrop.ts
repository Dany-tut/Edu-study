import { useRef, useState, type DragEvent } from 'react'

/**
 * Перетаскивание файлов на зону загрузки (дизайн-система, круг 3).
 *
 * Раньше пунктирные зоны «Добавить» принимали только клик: файл, брошенный на
 * них мышью, браузер открывал вместо страницы. Хук отдаёт обработчики для любой
 * зоны и флаг `over` — пока файл над зоной, её подсвечивают рамкой акцента.
 * Счётчик входов нужен, потому что dragleave приходит и при переходе на
 * дочерний элемент зоны.
 */
export function useFileDrop(onFiles: (files: File[]) => void, accept?: (f: File) => boolean) {
  const [over, setOver] = useState(false)
  const depth = useRef(0)
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')
  return {
    over,
    bind: {
      onDragEnter: (e: DragEvent) => { if (!hasFiles(e)) return; e.preventDefault(); depth.current++; setOver(true) },
      onDragOver: (e: DragEvent) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy' },
      onDragLeave: (e: DragEvent) => { if (!hasFiles(e)) return; depth.current = Math.max(0, depth.current - 1); if (!depth.current) setOver(false) },
      onDrop: (e: DragEvent) => {
        if (!hasFiles(e)) return
        e.preventDefault(); depth.current = 0; setOver(false)
        const files = Array.from(e.dataTransfer.files).filter(f => !accept || accept(f))
        if (files.length) onFiles(files)
      },
    },
  }
}

/** Подсветка зоны, пока над ней файл. */
export const dropOverStyle = (over: boolean) => over
  ? { borderColor: 'var(--color-accent)', borderStyle: 'solid' as const, background: 'var(--color-accent-soft)' }
  : {}
