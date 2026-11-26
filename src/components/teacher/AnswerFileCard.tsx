import { useEffect, useState, type MouseEvent } from 'react'
import { Browser } from '@capacitor/browser'
import FadeText from '../FadeText'
import { Download, ExternalLink, Loader2, RotateCw, X } from '../icons/appIcons'
import { useT } from '../../lib/i18n'
import { IS_APP, PLATFORM } from '../../lib/platform'
import {
  answerFileChip, answerFileKind, answerFileOpensInline, answerFileUrl, formatAnswerFileSize,
  type AnswerFile,
} from '../../lib/answerFiles'

// Карточка файла в ответе на сложное задание — одна для ученика и учителя,
// черновика и ленты. Значок с расширением (цвета — как у файлов урока), имя в
// две строки с фейдом (без многоточия, TEXT-01), «Таблица · 48 КБ».
//
// Действие — настоящая ссылка <a href>, подписанная ЗАРАНЕЕ: открытие после
// await Safari считает всплывающим окном. PDF/текст — «Открыть» во вкладке,
// таблицы и архивы — «Скачать» с настоящим именем. В приложении (Capacitor)
// WKWebView не умеет скачивать — ссылку открывает системный браузер с
// «Поделиться» / «Открыть в Numbers/Excel».
//
// Касание: на телефоне и айпаде вся карточка — цель ≥ 44, кнопки не прячутся
// за наведением (platforms.md §1).

export type AnswerFileState = 'ready' | 'uploading' | 'error'

const TOUCH = PLATFORM !== 'pc'

export default function AnswerFileCard({ file, state = 'ready', error, onRemove, onRetry }: {
  file: Pick<AnswerFile, 'name' | 'size'> & Partial<AnswerFile>
  state?: AnswerFileState
  /** Текст ошибки загрузки — вместо подписи. */
  error?: string
  /** Черновик: × снимает файл. Без него — карточка в ленте (открыть/скачать). */
  onRemove?: () => void
  onRetry?: () => void
}) {
  const t = useT()
  const chip = answerFileChip(file.name)
  // Расширение уже на значке — в имени его не повторяем, место нужнее самому имени.
  const dot = file.name.lastIndexOf('.')
  const stem = dot > 0 && chip.label === file.name.slice(dot + 1).toUpperCase() ? file.name.slice(0, dot) : file.name
  // Имена из Excel любят «_» вместо пробелов: даём перенос после них, а не
  // посреди слова (иначе на телефоне повисает одна буква).
  const breakable = stem.replace(/([_.])/g, '$1\u200b')
  const inline = answerFileOpensInline(file)
  const viewable = state === 'ready' && !!file.path
  const [href, setHref] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!viewable || !file.path) return
    let alive = true
    void answerFileUrl(file as AnswerFile, !inline).then(url => {
      if (!alive) return
      setHref(url)
      setDenied(!url)
    })
    return () => { alive = false }
  }, [viewable, file.path, file.name, inline]) // eslint-disable-line react-hooks/exhaustive-deps

  const meta = state === 'uploading' ? t('Загружаю…')
    : state === 'error' ? (error || t('Не загрузился'))
    : denied ? t('Файл недоступен')
    : [answerFileKind(file.name), formatAnswerFileSize(file.size)].filter(Boolean).join(' · ')
  const metaColor = state === 'error' || denied ? 'var(--color-red-text)' : 'var(--color-text-3)'

  const openNative = (e: MouseEvent) => {
    if (!IS_APP || !href) return
    e.preventDefault()
    void Browser.open({ url: href })
  }

  const action = TOUCH ? 44 : 36
  const iconBtn: React.CSSProperties = {
    width: action, height: action, borderRadius: action / 2, flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', cursor: 'pointer', background: 'var(--color-bg-3)', color: 'var(--color-text-2)',
    fontFamily: 'inherit', textDecoration: 'none',
  }

  const body = (
    <>
      <span aria-hidden style={{
        width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: chip.background,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: chip.label.length > 3 ? 9.5 : 10.5, fontWeight: 800, letterSpacing: '0.04em',
        opacity: state === 'uploading' ? 0.55 : 1,
      }}>{chip.label}</span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}>
        <FadeText lines={TOUCH ? 3 : 2} style={{ fontSize: TOUCH ? 15 : 14, fontWeight: 600, lineHeight: 1.25, color: 'var(--color-text)', overflowWrap: 'break-word' }}>{breakable}</FadeText>
        <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, color: metaColor, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {state === 'uploading' && <Loader2 size={12} className="animate-spin" />}
          {meta}
        </span>
      </span>
    </>
  )

  const frame: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, minHeight: TOUCH ? 60 : 56,
    padding: TOUCH ? '8px 8px 8px 10px' : '8px 8px 8px 10px', borderRadius: 16,
    border: `1px solid ${state === 'error' ? 'var(--color-red-soft)' : 'var(--color-border-soft)'}`,
    background: 'var(--color-bg-2)', boxSizing: 'border-box', width: '100%', color: 'inherit',
    textDecoration: 'none', fontFamily: 'inherit',
  }

  // Черновик ученика: карточка не ссылка, справа «повторить» / «×».
  if (onRemove) {
    return (
      <div style={frame} data-answer-file>
        {body}
        {state === 'error' && onRetry && (
          <button type="button" data-hover="layer" aria-label={t('Повторить загрузку')} onClick={onRetry} style={iconBtn}><RotateCw size={16} /></button>
        )}
        {state !== 'uploading' && (
          <button type="button" data-hover="layer" aria-label={t('Убрать файл')} onClick={onRemove} style={iconBtn}><X size={16} /></button>
        )}
      </div>
    )
  }

  // Лента и проверка: вся карточка — ссылка на файл.
  const label = inline ? t('Открыть') : t('Скачать')
  return (
    <a
      data-answer-file data-hover={href ? 'layer' : undefined}
      href={href ?? undefined}
      {...(inline ? { target: '_blank', rel: 'noopener noreferrer' } : { download: file.name })}
      onClick={openNative}
      aria-label={`${label}: ${file.name}`}
      aria-disabled={!href}
      style={{ ...frame, cursor: href ? 'pointer' : 'default' }}
    >
      {body}
      <span aria-hidden style={{ ...iconBtn, width: TOUCH ? action : 'auto', padding: TOUCH ? 0 : '0 12px', gap: 6, fontSize: 13, fontWeight: 700, opacity: href ? 1 : 0.5 }}>
        {inline ? <ExternalLink size={16} /> : <Download size={16} />}
        {!TOUCH && <span>{label}</span>}
      </span>
    </a>
  )
}

/** Список карточек с подписью «Файлы» — для ленты решения и превью у учителя. */
export function AnswerFileList({ files, title = true }: { files: AnswerFile[] | undefined; title?: boolean }) {
  const t = useT()
  if (!files?.length) return null
  return (
    <div style={{ marginTop: 12 }}>
      {title && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', display: 'block', marginBottom: 6 }}>{files.length > 1 ? t('Файлы') : t('Файл')}</span>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 8 }}>
        {files.map(f => <AnswerFileCard key={f.path} file={f} />)}
      </div>
    </div>
  )
}
