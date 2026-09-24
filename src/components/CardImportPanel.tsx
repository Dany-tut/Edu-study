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
// РАСКЛАДКА ПО СТОПКАМ. Источник почти всегда разбит на разделы — «Unit 3»,
// «S01E04», дата урока, — и разбор приносит эту метку у каждой карточки. Пока
// панель умела только «всё в набор», сотня слов ложилась одной кучей, и достать
// из неё двадцать слов нужного раздела было нечем. Поэтому, когда меток больше
// одной, появляется выбор: одной кучей или по стопкам — по стопке на метку.
// Выбор виден ДО добавления, вместе с числом стопок: раскладку постфактум не
// отменить, а стопки, созданные не теми, разбирать руками.
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
  cardImportEnabled, groupByEp, importCardsFromLink, importCardsFromPhotos, sourceLabel,
  MAX_PHOTOS, type CardImportResult, type CardImportSource,
} from '../lib/cardImport'
import type { SetCard } from '../lib/cardGroups'

type Mode = 'idle' | 'link'

/** Стопка на выходе раскладки: заголовок пустой у карточек без раздела. */
export interface ImportedGroup { title: string; cards: SetCard[] }

/**
 * Что панель знает об источнике помимо самих карточек. Нужно тому, кто заводит
 * набор с нуля: имя страницы Quizlet — готовое имя набора, и заставлять
 * придумывать его заново там, где оно уже есть, значит просить лишнюю работу.
 */
export interface ImportMeta { title?: string; source: CardImportSource }

/**
 * `row` — строка с двумя таблетками: место в углу заполненного набора.
 * `tiles` — две крупные плиты: пустой набор начинается с вопроса «откуда берём
 * слова», и там импорт не гость в чужой форме, а сам вопрос.
 */
type Variant = 'row' | 'tiles'

export default function CardImportPanel({
  lang, ep, accent = 'var(--color-purple-text)', variant = 'row', onAdd, onAddGrouped, groupedNote,
  caption, addLabel,
}: {
  /** Код изучаемого языка: модели надо знать, что считать словом, а что переводом. */
  lang: string
  /** Метка серии/урока — запасная: раздел из самого источника сильнее. */
  ep?: string
  accent?: string
  variant?: Variant
  onAdd: (cards: SetCard[], meta?: ImportMeta) => void
  /**
   * Разложить по стопкам. Есть только там, где стопки вообще бывают, — у
   * набора; внутри стопки и в ученическом редакторе их нет, и выбора там не
   * показываем, чтобы не обещать того, чего некуда положить.
   */
  onAddGrouped?: (groups: ImportedGroup[], meta?: ImportMeta) => void
  /** Предупреждение под выбором: что раскладка сделает с тем, что уже в наборе. */
  groupedNote?: string
  /** Подпись ряда и надпись на кнопке добавления: на витрине импорт заводит
   *  набор, а не пополняет открытый, и обещать «в набор» там нечестно. */
  caption?: string
  addLabel?: string
}) {
  const t = useT()
  const [on, setOn] = useState(false)
  const [mode, setMode] = useState<Mode>('idle')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState<'photo' | 'link' | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [err, setErr] = useState('')
  const [found, setFound] = useState<CardImportResult | null>(null)
  const [rows, setRows] = useState<Array<SetCard & { keep: boolean }>>([])
  const [split, setSplit] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { cardImportEnabled().then(setOn) }, [])

  if (!on) return null

  function take(res: CardImportResult) {
    setFound(res)
    setRows(res.cards.map(c => ({ ...c, keep: true })))
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setErr(''); setBusy('photo'); setProgress({ done: 0, total: Math.min(files.length, MAX_PHOTOS) })
    try {
      const res = await importCardsFromPhotos([...files], {
        lang, ep, onProgress: (done, total) => setProgress({ done, total }),
      })
      take(res)
      if (files.length > MAX_PHOTOS) setErr(t('Снимков больше, чем берётся за раз, — лишние остались непрочитанными.'))
      else if (res.failed) setErr(t('Часть снимков прочитать не удалось — повторите их отдельно.'))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null); setProgress(null)
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
    if (picked.length === 0 || !found) return
    const meta: ImportMeta = { title: found.title, source: found.source }
    if (asGroups) onAddGrouped!(groupByEp(picked), meta)
    else onAdd(picked, meta)
    reset()
  }

  function reset() {
    setFound(null); setRows([]); setUrl(''); setMode('idle'); setErr(''); setSplit(true)
  }

  // Отмеченные строки в том виде, в каком они уедут: правки в полях превью
  // учтены, пробелы сняты, пустые поля стали undefined.
  const picked: SetCard[] = rows
    .filter(r => r.keep && r.term.trim() && r.ru.trim())
    .map(({ keep: _keep, ...c }) => ({
      term: c.term.trim(),
      ru: c.ru.trim(),
      note: c.note?.trim() || undefined,
      ep: c.ep?.trim() || undefined,
    }))

  const kept = picked.length
  const loading = busy !== null
  // Партий бывает несколько, и молчащая кнопка на третьей минуте выглядит как
  // зависшая: показываем, сколько страниц уже прочитано.
  const reading = progress && progress.total > 1
    ? `${t('Читаю снимки…')} ${progress.done}/${progress.total}`
    : t('Читаю снимок…')
  // Раскладка предлагается только когда есть что раскладывать: одна метка на
  // всю пачку (или ни одной) дала бы одну стопку — то же, что и куча, но с
  // лишним уровнем, в который потом проваливаться.
  const groups = groupByEp(picked)
  const canSplit = !!onAddGrouped && groups.length > 1
  const asGroups = canSplit && split
  // Колонку метки показываем и там, где стопок нет: она объясняет, откуда
  // карточка, и её правят руками, когда модель прочитала заголовок криво.
  const showEp = !!onAddGrouped || rows.some(r => r.ep?.trim())

  return (
    <div style={{
      borderRadius: 14, padding: variant === 'tiles' ? 0 : 12,
      border: variant === 'tiles' ? 'none' : `1px dashed ${accent}55`,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {!found && (
        <>
          {variant === 'tiles' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => fileRef.current?.click()} disabled={loading} style={tile(accent, busy === 'photo')}>
                {busy === 'photo' ? <Spin size={20} /> : <Camera size={20} />}
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {busy === 'photo' ? reading : t('Снимок списка')}
                </div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>{t('можно пачкой страниц')}</div>
              </button>
              <button onClick={() => setMode(m => (m === 'link' ? 'idle' : 'link'))} disabled={loading} style={tile(accent, mode === 'link')}>
                <Link2 size={20} />
                <div style={{ fontSize: 13, fontWeight: 700 }}>{t('Ссылка')}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>{t('таблица, набор, страница')}</div>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Sparkles size={13} style={{ color: accent, flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginRight: 'auto' }}>
                {caption ?? t('Собрать карточки за меня')}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                title={t('Снимки списка слов из тетради или учебника — можно сразу пачкой, до двух десятков страниц.')}
                style={pill(accent, busy === 'photo')}
              >
                {busy === 'photo' ? <Spin /> : <Camera size={14} />}
                {busy === 'photo' ? reading : t('Фото')}
              </button>
              <button
                onClick={() => setMode(m => (m === 'link' ? 'idle' : 'link'))}
                disabled={loading}
                style={pill(accent, mode === 'link')}
              >
                <Link2 size={14} /> {t('Ссылка')}
              </button>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={e => onFiles(e.target.files)}
            style={{ display: 'none' }}
          />
        </>
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
              border: 'none', background: 'var(--color-bg-input)',
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

      {/* Объяснение — ТОЛЬКО ПОСЛЕ ВЫБОРА СПОСОБА. На покое оно лежало абзацем
          поперёк витрины и рассказывало про импорт тому, кто пришёл за своими
          наборами: четыре строки текста выше первой карточки. Нажал «Фото» или
          «Ссылка» — вопрос возник, тогда и отвечаем. */}
      {!found && !loading && mode !== 'idle' && (
        <div style={{ fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.45 }}>
          {t('Снимки списка слов из тетради или учебника — можно сразу пачкой, до двух десятков страниц.')}{' '}
          {t('Разделы источника («Unit 3», «S01E04») импорт замечает и предлагает разложить по стопкам.')}{' '}
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
                    style={bare(accent, { width: showEp ? '32%' : '42%', color: 'var(--color-text-2)' })}
                  />
                  {showEp && (
                    <input
                      value={r.ep ?? ''}
                      onChange={e => patch({ ep: e.target.value })}
                      onFocus={underline(accent)}
                      onBlur={underline(null)}
                      placeholder={t('Раздел')}
                      title={t('Из этой метки собирается стопка')}
                      style={bare(accent, { width: '16%', fontSize: 11.5, color: 'var(--color-text-3)' })}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {canSplit && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', marginRight: 'auto' }}>
                  {t('Куда положить')}
                </div>
                <button onClick={() => setSplit(true)} style={pill(accent, split)}>
                  {t('По стопкам')} · {groups.length}
                </button>
                <button onClick={() => setSplit(false)} style={pill(accent, !split)}>
                  {t('Одной кучей')}
                </button>
              </div>
              {split && (
                <div style={{ fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.45 }}>
                  {groups.map(g => `${g.title || t('Без раздела')} · ${g.cards.length}`).join('  ·  ')}
                </div>
              )}
              {split && groupedNote && (
                <div style={{ fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.45 }}>{groupedNote}</div>
              )}
            </div>
          )}

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
              {asGroups ? t('Разложить по стопкам') : (addLabel ?? t('Добавить в набор'))} · {kept}
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

function Spin({ size = 13 }: { size?: number }) {
  return <Loader2 size={size} style={{ animation: 'spin 1s linear infinite' }} />
}

/** Плита выбора источника: крупная цель, когда набор ещё пуст. */
const tile = (accent: string, active: boolean): React.CSSProperties => ({
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
  padding: '16px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
  background: active ? `${accent}2e` : `${accent}1a`, color: accent,
  fontFamily: 'inherit', textAlign: 'center',
})

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
