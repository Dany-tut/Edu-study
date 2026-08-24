// ─────────────────────────────────────────────────────────────────────────────
// Подтверждения и сообщения — свои, не системные
//
// window.confirm/alert рисует ОС: белая коробка с чужим шрифтом посреди тёмного
// кабинета, кнопки «ОК/Отмена» в системном порядке и без нашего красного. Тот же
// разговор, что с чекбоксами и дропдаунами: контрол, который нельзя одеть, в
// продукте не живёт. Плюс нативный confirm блокирует поток и не переживает
// анимации — из него нельзя показать имя ученика курсивом или предупреждение
// второй строкой.
//
// Устроено синглтоном, а не хуком с узлом в каждом компоненте: спрашивать
// приходится из обработчиков, лежащих в десятке файлов, и таскать <Dialog/> в
// каждый — гарантия, что где-то забудут и останется системная коробка. Хост
// монтируется один раз в App, а вызывающий пишет ровно то же, что писал:
//
//   if (!await confirmDialog({ title: 'Удалить курс?', tone: 'danger' })) return
//   void alertDialog('Не удалось сохранить — проверьте связь.')
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Info } from 'lucide-react'
import { t } from '../lib/i18n'

export type ConfirmOpts = {
  /** Главный вопрос. Одна строка, без «вы уверены?» — что произойдёт. */
  title: string
  /** Пояснение под ним: что именно потеряется и можно ли вернуть. */
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** 'danger' — красная кнопка подтверждения (удаление, обнуление). */
  tone?: 'danger' | 'default'
}

type Dialog = ConfirmOpts & {
  id: number
  kind: 'confirm' | 'alert'
  resolve: (ok: boolean) => void
}

let seq = 0
let push: ((d: Dialog) => void) | null = null
/** Очередь до монтирования хоста: диалог из раннего эффекта не должен пропасть. */
const pending: Dialog[] = []

function enqueue(d: Dialog) {
  if (push) push(d)
  else pending.push(d)
}

/** Спросить да/нет. Резолвится `false` при «Отмене», Esc и клике по фону. */
export function confirmDialog(opts: ConfirmOpts): Promise<boolean> {
  return new Promise(resolve => {
    enqueue({ ...opts, id: ++seq, kind: 'confirm', resolve })
  })
}

/** Сообщить и дождаться «Понятно». Строка — это заголовок. */
export function alertDialog(opts: ConfirmOpts | string): Promise<boolean> {
  const o = typeof opts === 'string' ? { title: opts } : opts
  return new Promise(resolve => {
    enqueue({ ...o, id: ++seq, kind: 'alert', resolve })
  })
}

/** Монтируется один раз (в App). Рисует верхний диалог очереди. */
export default function ConfirmHost() {
  const [queue, setQueue] = useState<Dialog[]>([])

  useEffect(() => {
    push = d => setQueue(q => [...q, d])
    if (pending.length) { setQueue(q => [...q, ...pending.splice(0)]) }
    return () => { push = null }
  }, [])

  const top = queue[0] ?? null
  const close = (ok: boolean) => {
    if (!top) return
    top.resolve(ok)
    setQueue(q => q.slice(1))
  }

  // Enter подтверждает, Esc отменяет — как в системном окне, которое мы заменили.
  const okRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!top) return
    okRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(false) }
      if (e.key === 'Enter') { e.preventDefault(); close(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top?.id])

  const danger = top?.tone === 'danger'
  const Icon = danger ? AlertTriangle : Info
  const tone = danger ? 'var(--color-red-text)' : 'var(--color-accent)'

  return createPortal(
    <AnimatePresence>
      {top && (
        // mode="sync" по умолчанию: с "wait" очередь из двух вопросов подряд
        // залипала на пустом экране (см. заметку про AnimatePresence + React 19).
        <motion.div
          key={top.id}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 4200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div onClick={() => close(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
          <motion.div
            initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            role="dialog" aria-modal="true"
            style={{
              position: 'relative', width: 'min(420px, 100%)',
              borderRadius: 22, border: '1px solid var(--color-border-glass)',
              background: 'rgba(var(--glass-rgb), 0.99)', boxShadow: 'var(--shadow-lg)',
              padding: '22px 22px 18px',
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{
                width: 34, height: 34, borderRadius: 12, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: danger ? 'var(--color-red-soft)' : 'var(--color-purple-soft)', color: tone,
              }}>
                <Icon size={17} />
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 15.5, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.35 }}>
                  {top.title}
                </div>
                {top.message && (
                  <div style={{ marginTop: 6, fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
                    {top.message}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              {top.kind === 'confirm' && (
                <button
                  onClick={() => close(false)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                    border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)',
                    color: 'var(--color-text-2)', fontSize: 13, fontWeight: 650,
                  }}
                >
                  {top.cancelLabel ?? t('Отмена')}
                </button>
              )}
              <button
                ref={okRef}
                onClick={() => close(true)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                  border: 'none', outline: 'none',
                  // Сплошная кнопка с белым текстом — это --grad-purple; красный
                  // вариант такой же сплошной, иначе «удалить» читается слабее «отмены».
                  background: danger ? 'var(--color-red-text)' : 'var(--grad-purple)',
                  color: '#fff', fontSize: 13, fontWeight: 750,
                }}
              >
                {top.confirmLabel ?? (top.kind === 'alert' ? t('Понятно') : t('Продолжить'))}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
