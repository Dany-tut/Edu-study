import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X, ImagePlus, MessageSquarePlus } from 'lucide-react'
import TeacherSaveButton from './teacher/TeacherSaveButton'
import { optimizePhoto, ImageTooLargeError } from '../lib/imageOptim'
import { submitFeedback, FEEDBACK_SECTIONS, type FeedbackRole } from '../lib/feedbackRequests'

// Общая форма обратной связи для учителя и ученика. Раздел из списка ИЛИ
// вписанный вручную, текст, скриншоты (Ctrl+V или файлом → base64). Уходит в
// feedback_requests → вкладка «Заявки» в Админке.

const CUSTOM = '__custom__'
const MAX_ATTACHMENTS = 5

export default function FeedbackModal({ role, onClose }: { role: FeedbackRole; onClose: () => void }) {
  const [sectionChoice, setSectionChoice] = useState<string>(FEEDBACK_SECTIONS[0])
  const [customSection, setCustomSection] = useState('')
  const [message, setMessage] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const section = sectionChoice === CUSTOM ? customSection : sectionChoice
  const canSend = message.trim().length > 0 && (sectionChoice !== CUSTOM || customSection.trim().length > 0) && !saving

  async function addFiles(files: FileList | File[] | null) {
    if (!files) return
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      try {
        const src = await optimizePhoto(file)
        if (src) setPhotos(p => (p.length >= MAX_ATTACHMENTS ? p : [...p, src]))
      } catch (e) {
        if (e instanceof ImageTooLargeError) { setError(e.message); continue }
        throw e
      }
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return
    const imgs: File[] = []
    for (const it of items) {
      if (it.type.startsWith('image/')) {
        const f = it.getAsFile()
        if (f) imgs.push(f)
      }
    }
    if (imgs.length) { e.preventDefault(); void addFiles(imgs) }
  }

  async function send() {
    if (!canSend) return
    setSaving(true)
    setError(null)
    const { error } = await submitFeedback({ role, section, message, attachments: photos })
    setSaving(false)
    if (error) { setError('Не удалось отправить. Попробуйте ещё раз.'); return }
    setDone(true)
    setTimeout(onClose, 1400)
  }

  // Esc закрывает.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // On a phone the dialog is nearly full-width; a right-floated send button then
  // looks lopsided, so stretch it.
  const isPhone = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches

  const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 6, display: 'block' }
  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 12,
    background: 'var(--color-bg-3)', border: '1px solid var(--color-border)',
    color: 'var(--color-text)', fontSize: 14, fontFamily: 'inherit', outline: 'none',
  }

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1200 }}
      />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1201, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'none' }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 18 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 18 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          onPaste={onPaste}
          style={{
            pointerEvents: 'auto', width: 540, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto',
            background: 'var(--color-bg-2)', borderRadius: 22, padding: 24,
            border: '1px solid var(--color-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.28)',
          }}
        >
          {/* Header — top-aligned so the icon and ✕ line up with the title, not
              the middle of the two-line subtitle. */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, marginBottom: 18 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MessageSquarePlus size={19} style={{ color: 'var(--color-purple)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)' }}>Обратная связь</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1 }}>Опишите ошибку или пожелание — заявка уйдёт администратору</div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <X size={16} />
            </button>
          </div>

          {done ? (
            <div style={{ padding: '28px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>Спасибо! Заявка отправлена</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 4 }}>Мы посмотрим её в ближайшее время.</div>
            </div>
          ) : (
            <>
              {/* Раздел */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Раздел</label>
                <select value={sectionChoice} onChange={e => setSectionChoice(e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>
                  {FEEDBACK_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value={CUSTOM}>Свой вариант…</option>
                </select>
                {sectionChoice === CUSTOM && (
                  <input
                    autoFocus value={customSection} onChange={e => setCustomSection(e.target.value)}
                    placeholder="Название раздела или экрана"
                    style={{ ...fieldStyle, marginTop: 8 }}
                  />
                )}
              </div>

              {/* Сообщение */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Что случилось?</label>
                <textarea
                  value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Опишите проблему как можно подробнее…"
                  rows={4}
                  style={{ ...fieldStyle, resize: 'vertical', minHeight: 90 }}
                />
              </div>

              {/* Вложения */}
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>Скриншоты (необязательно)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {photos.map((src, i) => (
                    <div key={i} style={{ position: 'relative', width: 72, height: 72, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                        style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: 6, border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {photos.length < MAX_ATTACHMENTS && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      style={{ width: 72, height: 72, borderRadius: 10, border: '1.5px dashed var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    >
                      <ImagePlus size={18} />
                      <span style={{ fontSize: 10, fontWeight: 600 }}>Добавить</span>
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', marginTop: 7 }}>Можно вставить из буфера через Ctrl + V</div>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { void addFiles(e.target.files); e.target.value = '' }} />
              </div>

              {error && <div style={{ fontSize: 13, color: 'var(--color-red-text, #e5484d)', marginBottom: 12 }}>{error}</div>}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <TeacherSaveButton label="Отправить" savedLabel="Отправлено" savingLabel="Отправляю…" onClick={send} disabled={!canSend} saving={saving} fullWidth={isPhone} />
              </div>
            </>
          )}
        </motion.div>
      </div>
    </>,
    document.body,
  )
}
