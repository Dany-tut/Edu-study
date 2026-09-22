// ─────────────────────────────────────────────────────────────────────────────
// Импорт карточек: снимок или ссылка → превью → в набор
//
// ЗАЧЕМ ОН ОБЩИЙ. Редакторов карточек два — учительский (CardGroupsManager) и
// ученический (MySetEditor), — и формы у них разные нарочно. А вот этот кусок у
// них одинаков до кнопки: выбрал источник, посмотрел, что нашлось, поправил,
// добавил. Две копии разошлись бы на первой же правке разбора.
//
// ПОЧЕМУ ПРЕВЬЮ ОБЯЗАТЕЛЬНО. Модель ошибается на именах, на редких словах и на
// плохо снятом листе, а карточка с неверным переводом учит неверному — и учит
// молча, неделями. Поэтому импорт ничего не добавляет сам: он показывает
// список, где каждую строку можно поправить прямо здесь и любую снять галочкой.
// В набор уезжает ровно то, что человек оставил.
//
// ПОЛЯ ПРАВЯТСЯ НА МЕСТЕ, А НЕ В РАМКАХ. Строк на экране бывает полсотни, и
// пятьдесят полей с рамками — это стена коробок. Подчёркивание появляется под
// тем полем, в котором стоит курсор (см. правило про правку-на-месте).
//
// КНОПОК НЕТ, ПОКА ВЫКЛЮЧЕН РУБИЛЬНИК. Разбор платный: `ai_enabled` +
// `ai_card_import` в Админке → Обзор → «Расход на ИИ». Выключено — блока нет
// вовсе, ручной ввод и «Вставить списком» работают как работали.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { Camera, Link2, Loader2, Sparkles, X } from 'lucide-react'
import { useT } from '../lib/i18n'
import Checkbox from './Checkbox'
import {
  cardImportEnabled, importCardsFromLink, importCardsFromPhotos, sourceLabel,
  type CardImportResult,
} from '../lib/cardImport'
import type { SetCard } from '../lib/cardGroups'

type Mode = 'idle' | 'link'

export default function CardImportPanel({ lang, ep, accent = 'var(--color-purple-text)', onAdd }: {
  /** Код изучаемого языка: модели надо знать, что считать словом, а что переводом. */
  lang: string
  /** Метка серии/урока — проставится всем импортированным карточкам сразу. */
  ep?: string
  accent?: string
  onAdd: (cards: SetCard[]) => void
}) {
  const t = useT()
  const [on, setOn] = useState(false)
  const [mode, setMode] = useState<Mode>('idle')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState<'photo' | 'link' | null>(null)
  const [err, setErr] = useState('')
  const [found, setFound] = useState<CardImportResult | null>(null)
  const [rows, setRows] = useState<Array<SetCard & { keep: boolean }>>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { cardImportEnabled().then(setOn) }, [])

  if (!on) return null

  function take(res: CardImportResult) {
    setFound(res)
    setRows(res.cards.map(c => ({ ...c, keep: true })))
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setErr(''); setBusy('photo')
    try {
      take(await importCardsFromPhotos([...files], { lang, ep }))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
      // Тот же файл повторно не выбирается, пока значение инпута не сброшено.
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function onLink() {
    if (!url.trim()) return
    setErr(''); setBusy('link')
    try {
      take(await importCardsFromLink(url, { lang, ep }))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  function add() {
    const keep = rows.filter(r => r.keep && r.term.trim() && r.ru.trim())
    if (keep.length === 0) return
    onAdd(keep.map(({ keep: _keep, ...c }) => ({
      term: c.term.trim(),
      ru: c.ru.trim(),
      note: c.note?.trim() || undefined,
      ep: c.ep?.trim() || undefined,
    })))
    reset()
  }

  function reset() {
    setFound(null); setRows([]); setUrl(''); setMode('idle'); setErr('')
  }

  const kept = rows.filter(r => r.keep && r.term.trim() && r.ru.trim()).length
  const loading = busy !== null

  return (
    <div style={{
      borderRadius: 14, border: `1px dashed ${accent}55`, padding: 12,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {!found && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Sparkles size={13} style={{ color: accent, flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginRight: 'auto' }}>
            {t('Собрать карточки за меня')}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            style={pill(accent, busy === 'photo')}
          >
            {busy === 'photo' ? <Spin /> : <Camera size={14} />}
            {busy === 'photo' ? t('Читаю снимок…') : t('Фото')}
          </button>
          <button
            onClick={() => setMode(m => (m === 'link' ? 'idle' : 'link'))}
            disabled={loading}
            style={pill(accent, mode === 'link')}
          >
            <Link2 size={14} /> {t('Ссылка')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={e => onFiles(e.target.files)}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {!found && mode === 'link' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onLink() }}
            placeholder={t('Ссылка на таблицу, набор или страницу со словами')}
            autoFocus
            style={{
              flex: 1, minWidth: 0, boxSizing: 'border-box', height: 36, borderRadius: 12,
              border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-2)',
              color: 'var(--color-text)', fontFamily: 'inherit', fontSize: 13,
              padding: '0 12px', outline: 'none', caretColor: accent,
            }}
          />
          <button onClick={onLink} disabled={!url.trim() || loading} style={pill(accent, busy === 'link')}>
            {busy === 'link' ? <Spin /> : null}
            {busy === 'link' ? t('Читаю страницу…') : t('Разобрать')}
          </button>
        </div>
      )}

      {!found && !loading && (
        <div style={{ fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.45 }}>
          {t('Снимок списка слов из тетради или учебника — до четырёх за раз.')}{' '}
          {t('Google Таблица и CSV читаются как есть, остальные страницы разбирает модель.')}{' '}
          {t('Если перевода в источнике нет — она переведёт сама, а вы проверите.')}
        </div>
      )}

      {err && <div style={{ fontSize: 12, color: 'var(--color-red-text)', lineHeight: 1.45 }}>{err}</div>}

      {found && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text)' }}>
              {t('Нашлось карточек:')} {rows.length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
              {sourceLabel(found.source)}{found.title ? ` · ${found.title}` : ''}
            </div>
            <button onClick={reset} title={t('Отменить импорт')} style={{
              marginLeft: 'auto', width: 28, height: 28, display: 'flex', alignItems: 'center',
              justifyContent: 'center', borderRadius: 9, border: '1px solid var(--color-border-soft)',
              background: 'transparent', color: 'var(--color-text-2)', cursor: 'pointer',
            }}>
              <X size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 340, overflowY: 'auto' }}>
            {rows.map((r, i) => {
              const patch = (p: Partial<SetCard & { keep: boolean }>) =>
                setRows(list => list.map((x, j) => (j === i ? { ...x, ...p } : x)))
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px',
                    borderRadius: 10, background: r.keep ? 'var(--color-bg-2)' : 'transparent',
                    opacity: r.keep ? 1 : 0.45,
                  }}
                >
                  <Checkbox checked={r.keep} onChange={v => patch({ keep: v })} size={16} />
                  <input
                    value={r.term}
                    onChange={e => patch({ term: e.target.value })}
                    onFocus={underline(accent)}
                    onBlur={underline(null)}
                    placeholder={t('Слово')}
                    style={bare(accent, { flex: 1, fontWeight: 650 })}
                  />
                  <input
                    value={r.ru}
                    onChange={e => patch({ ru: e.target.value })}
                    onFocus={underline(accent)}
                    onBlur={underline(null)}
                    placeholder={t('Перевод')}
                    style={bare(accent, { width: '42%', color: 'var(--color-text-2)' })}
                  />
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={add}
              disabled={kept === 0}
              style={{
                height: 34, padding: '0 16px', borderRadius: 12, border: 'none', fontFamily: 'inherit',
                background: 'var(--grad-purple)', color: '#fff', fontSize: 12.5, fontWeight: 700,
                opacity: kept === 0 ? 0.45 : 1, cursor: kept === 0 ? 'default' : 'pointer',
              }}
            >
              {t('Добавить в набор')} · {kept}
            </button>
            {kept < rows.length && (
              <div style={{ fontSize: 11.5, color: 'var(--color-muted)' }}>
                {t('Снято:')} {rows.length - kept}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Подчёркивание под полем, в котором стоит курсор. Через обработчики, а не
 * `:focus`: стили здесь инлайновые, псевдокласса у них нет, а заводить ради
 * двух полей класс в index.css — прятать правило от того, кто читает строку.
 */
const underline = (accent: string | null) => (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderBottomColor = accent ?? 'transparent'
}

function Spin() {
  return <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
}

const pill = (accent: string, active: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px',
  borderRadius: 11, border: `1px solid ${active ? accent : 'var(--color-border-soft)'}`,
  background: active ? `${accent}1f` : 'transparent',
  color: active ? accent : 'var(--color-text-2)',
  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
})

/**
 * Поле превью: подчёркивание вместо рамки. Нижняя граница стоит всегда, но
 * прозрачная — иначе строка подпрыгивала бы на полтора пикселя при первом
 * клике в поле.
 */
const bare = (accent: string, extra: React.CSSProperties): React.CSSProperties => ({
  minWidth: 0, border: 'none', borderBottom: '1.5px solid transparent', borderRadius: 0,
  padding: '2px 0', background: 'transparent', outline: 'none',
  color: 'var(--color-text)', fontFamily: 'inherit', fontSize: 13, caretColor: accent,
  ...extra,
})
