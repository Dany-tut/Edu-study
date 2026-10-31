import { useEffect, useRef, useState } from 'react'
import { useFileDrop, dropOverStyle } from '../lib/useFileDrop'
import { FIELD } from '../lib/fieldStyle'
import Modal from './Modal'
import PhotoGallery from './PhotoGallery'
import { useOverlayScroll, fadeMask } from './teacher/OverlayScroll'
import { AlertIcon } from './Alert'
import { X, ImagePlus } from './icons/appIcons'
import TeacherSaveButton from './teacher/TeacherSaveButton'
import TeacherSelect from './teacher/TeacherSelect'
import { optimizePhoto, ImageTooLargeError } from '../lib/imageOptim'
import { submitFeedback, FEEDBACK_SECTIONS, type FeedbackRole } from '../lib/feedbackRequests'
import { useT } from '../lib/i18n'
import { Alert } from './Alert'

// Общая форма обратной связи для учителя и ученика. Раздел из списка ИЛИ
// вписанный вручную, текст, скриншоты (Ctrl+V или файлом → base64). Уходит в
// feedback_requests → вкладка «Заявки» в Админке.

const CUSTOM = '__custom__'
const MAX_ATTACHMENTS = 20

export default function FeedbackModal({ role, onClose, onSent, defaultSection, defaultMessage }: {
  role: FeedbackRole
  onClose: () => void
  /** Заявка реально ушла в базу (в отличие от onClose, который зовётся и при отмене). */
  onSent?: () => void
  /** Предзаполнить раздел (напр. «Тариф»); если его нет в списке — уйдёт в «Свой вариант». */
  defaultSection?: string
  /** Предзаполнить текст сообщения. */
  defaultMessage?: string
}) {
  const t = useT()
  const knownSection = defaultSection && (FEEDBACK_SECTIONS as readonly string[]).includes(defaultSection)
  const [sectionChoice, setSectionChoice] = useState<string>(
    defaultSection ? (knownSection ? defaultSection : CUSTOM) : FEEDBACK_SECTIONS[0],
  )
  const [customSection, setCustomSection] = useState(defaultSection && !knownSection ? defaultSection : '')
  const [message, setMessage] = useState(defaultMessage ?? '')
  const [photos, setPhotos] = useState<string[]>([])
  const [photoIndex, setPhotoIndex] = useState<number | null>(null)
  const [addingPhotos, setAddingPhotos] = useState(false)
  const addingRef = useRef(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // Фото можно бросить мышью на «Добавить», не только выбрать кликом.
  const drop = useFileDrop(files => { void addFiles(files) }, f => f.type.startsWith('image/'))
  const { ref: taRef, fade: taFade, onScroll: onTextScroll } = useOverlayScroll<HTMLTextAreaElement>()

  // Автовысота текстового поля: старт 4 строки, тянется по тексту до 10, дальше
  // прокрутка с фейдами сверху/снизу (без ручного растягивания угла).
  const TA_LINE = 21
  const TA_PAD = 20
  const TA_MIN = 4 * TA_LINE + TA_PAD
  const TA_MAX = 10 * TA_LINE + TA_PAD
  const [taOverflow, setTaOverflow] = useState(false)
  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    const next = Math.min(Math.max(el.scrollHeight, TA_MIN), TA_MAX)
    el.style.height = next + 'px'
    setTaOverflow(el.scrollHeight > TA_MAX + 1)
  }, [message, TA_MIN, TA_MAX])

  const section = sectionChoice === CUSTOM ? customSection : sectionChoice
  const canSend = message.trim().length > 0 && (sectionChoice !== CUSTOM || customSection.trim().length > 0) && !saving && !addingPhotos

  async function addFiles(files: FileList | File[] | null) {
    if (!files || saving || addingRef.current) return
    const images = Array.from(files).filter(file => file.type.startsWith('image/'))
    if (!images.length) { setError(t('Выберите фотографии или изображения')); return }
    const available = MAX_ATTACHMENTS - photos.length
    if (available <= 0) { setError(t('Можно прикрепить до 20 фото')); return }
    setError(images.length > available ? t('Можно прикрепить до 20 фото. Лишние файлы не добавлены.') : null)
    addingRef.current = true
    setAddingPhotos(true)
    try {
      for (const file of images.slice(0, available)) {
        try {
          const src = await optimizePhoto(file)
          if (!src) throw new Error('Empty image')
          setPhotos(p => [...p, src])
        } catch (e) {
          setError(e instanceof ImageTooLargeError ? e.message : t('Не удалось добавить фото. Попробуйте другой файл.'))
        }
      }
    } finally {
      addingRef.current = false
      setAddingPhotos(false)
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
    if (error) { setError(t('Не удалось отправить. Попробуйте ещё раз.')); return }
    setDone(true)
    onSent?.()
    setTimeout(onClose, 1400)
  }

  // On a phone the dialog is nearly full-width; a right-floated send button then
  // looks lopsided, so stretch it.
  const isPhone = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches

  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 6, display: 'block' }
  const fieldStyle: React.CSSProperties = { ...FIELD }

  return (
    <>
    <Modal
      onClose={onClose} onPaste={onPaste}
      footer={!done ? <TeacherSaveButton label={t('Отправить')} savedLabel={t('Отправлено')} savingLabel={t('Отправляю…')} onClick={send} disabled={!canSend} saving={saving} fullWidth={isPhone} /> : undefined}
      title={t('Обратная связь')}
      subtitle={t('Опишите ошибку или пожелание — заявка уйдёт администратору')}
    >
      {done ? (
        <div style={{ padding: '28px 8px', textAlign: 'center' }}>
          <AlertIcon tone="success" style={{ margin: '0 auto 10px' }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>{t('Спасибо! Заявка отправлена')}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 4 }}>{t('Мы посмотрим её в ближайшее время.')}</div>
        </div>
      ) : (
        <>
          {/* Раздел */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>{t('Раздел')}</label>
            <TeacherSelect
              value={sectionChoice}
              onChange={setSectionChoice}
              options={[
                ...FEEDBACK_SECTIONS.map(s => ({ value: s, label: t(s) })),
                { value: CUSTOM, label: t('Свой вариант…') },
              ]}
              clearable={false}
              triggerStyle={fieldStyle}
            />
            {sectionChoice === CUSTOM && (
              <input
                autoFocus value={customSection} onChange={e => setCustomSection(e.target.value)}
                placeholder={t('Название раздела или экрана')}
                style={{ ...fieldStyle, marginTop: 8 }}
              />
            )}
          </div>

          {/* Сообщение */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>{t('Что случилось?')}</label>
            <textarea
              ref={taRef}
              className="no-scrollbar"
              aria-label={t('Что случилось?')}
              onScroll={onTextScroll}
              value={message} onChange={e => setMessage(e.target.value)}
              placeholder={t('Опишите проблему как можно подробнее…')}
              rows={4}
              style={{
                ...fieldStyle, resize: 'none', display: 'block',
                border: 'none', borderRadius: 0, background: 'transparent', padding: '9px 0',
                lineHeight: `${TA_LINE}px`, minHeight: TA_MIN, maxHeight: TA_MAX,
                overflowY: taOverflow ? 'auto' : 'hidden',
                ...fadeMask(taFade, 18),
              }}
            />
          </div>

          {/* Вложения: одна зона для выбора на телефоне и переноса на ПК. */}
          <section {...drop.bind} style={{ marginBottom: 18, borderRadius: 12, outline: drop.over ? '2px solid var(--color-accent)' : undefined, outlineOffset: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
              <span style={{ ...labelStyle, marginBottom: 0 }}>{t('Фото (необязательно)')}</span>
              <span aria-live="polite" style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{photos.length} / {MAX_ATTACHMENTS}</span>
            </div>
            {photos.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 8, marginBottom: 10 }}>
              {photos.map((src, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: 'var(--color-bg-3)' }}>
                  <button type="button" aria-label={`${t('Открыть фото')} ${i + 1}`} onClick={() => setPhotoIndex(i)} style={{ width: '100%', height: '100%', padding: 0, border: 'none', background: 'none', cursor: 'zoom-in', display: 'block' }}>
                    <img src={src} alt={`${t('Фото')} ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                  <button type="button" disabled={saving || addingPhotos}
                    aria-label={`${t('Удалить фото')} ${i + 1}`}
                    onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                    style={{ position: 'absolute', top: 3, right: 3, width: 28, height: 28, borderRadius: 8, border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  ><X size={15} /></button>
                </div>
              ))}
            </div>}
            {photos.length < MAX_ATTACHMENTS && <button type="button"
              disabled={saving || addingPhotos}
              onClick={() => fileRef.current?.click()}
              style={{ width: '100%', minHeight: 80, padding: 12, borderRadius: 12, border: '1.5px dashed var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, ...dropOverStyle(drop.over) }}
            >
              <ImagePlus size={20} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{t(addingPhotos ? 'Обрабатываем фото…' : drop.over ? 'Отпустите, чтобы добавить фото' : 'Добавить фото')}</span>
              <span style={{ fontSize: 12 }}>{t(isPhone ? 'Выберите до 20 фотографий' : 'Перетащите сюда или выберите файлы · до 20 фото')}</span>
            </button>}
            <input ref={fileRef} type="file" accept="image/*" multiple hidden disabled={saving || addingPhotos} onChange={e => { void addFiles(e.target.files); e.target.value = '' }} />
          </section>

          {error && <Alert tone="danger" text={error} style={{ marginBottom: 12 }} />}


        </>
      )}
    </Modal>
    {photoIndex !== null && <PhotoGallery photos={photos} initialIndex={photoIndex} onClose={() => setPhotoIndex(null)} />}
    </>
  )
}
