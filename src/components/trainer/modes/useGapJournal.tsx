// ─────────────────────────────────────────────────────────────────────────────
// Половина «Карточек» — журнал «Не смог сказать»
//
// ЗАЧЕМ. Домашний разговор переводят на изучаемый язык, и он срывается на
// родной ровно там, где не хватило конкретной фразы. Журнал ловит эти места:
// записал по-русски в момент срыва → нашёл, как сказать (сам или «Как
// сказать?») → «В карточки», и фраза уходит в «Мои слова» и в повторение.
// Через пару недель дыр почти не остаётся — набор подстраивается под свою жизнь,
// а не под учебник. Данные — lib/phraseGaps.ts.
//
// УСТРОЕН КАК СЛОВАРЬ. Плитка в витрине наборов рядом с «Моими словами», свой
// ключ в том же поле открытой темы (GAPS_ID), свой адрес `#/trainer/<lang>/gaps`.
// Открыт ли журнал, знает тренажёр — по той же причине, что у словаря.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, MessageCircleQuestion, Sparkles, Trash2 } from 'lucide-react'
import { useT } from '../../../lib/i18n'
import { bindShortWords, proseWrap } from '../../../lib/typography'
import GrowTextarea from '../../GrowTextarea'
import Skeleton from '../../Skeleton'
import { RailCard, RailStat, Toolbar, ToolCount, Tile, TileChip, TileMeter, Empty } from '../TrainerShell'
import { BackToSets } from '../../PhraseDecks'
import { primaryBtn, ghostBtn } from '../blockKit'
import {
  addGap, askPhrase, deleteGap, gapToCards, listGaps, phraseHelpEnabled, saveGap,
  type PhraseGap, type PhraseVariant,
} from '../../../lib/phraseGaps'

/** Ключ журнала в поле открытой темы. Префикс `my-`, как у словаря: с id темы не совпадёт. */
export const GAPS_ID = 'my-gaps'

export interface GapJournalHalf {
  rail: React.ReactNode
  toolbar: React.ReactNode
  content: React.ReactNode
  tile: React.ReactNode
}

const smallBtn: React.CSSProperties = { height: 32, fontSize: 12.5, padding: '0 14px', gap: 5 }

export function useGapJournal({
  lang, subjectId, owner, accent, soft, open, onOpen, onClose, onCarded,
}: {
  lang: string
  subjectId: string
  owner: { studentId?: string; anonName?: string }
  accent: string
  soft: string
  open: boolean
  onOpen: () => void
  onClose: () => void
  /** Фраза ушла в колоду — словарю пора перечитаться. */
  onCarded: () => void
}): GapJournalHalf {
  const t = useT()
  const studentId = owner.studentId

  const [gaps, setGaps] = useState<PhraseGap[]>([])
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [missing, setMissing] = useState(false)
  const [helpOn, setHelpOn] = useState(false)

  useEffect(() => {
    if (!studentId) { setReady(true); return }
    let alive = true
    listGaps(studentId, lang)
      .then(g => { if (alive) { setGaps(g); setReady(true) } })
      .catch((e: { code?: string }) => {
        if (!alive) return
        // Таблицы ещё нет (миграция 0100 не применена): журнала нет вовсе —
        // плитка прячется, а не обещает то, что не сохранится.
        if (e?.code === '42P01' || e?.code === 'PGRST205') setMissing(true)
        setFailed(true); setReady(true)
      })
    return () => { alive = false }
  }, [studentId, lang])

  useEffect(() => {
    if (!studentId) return
    let alive = true
    phraseHelpEnabled().then(on => { if (alive) setHelpOn(on) }).catch(() => {})
    return () => { alive = false }
  }, [studentId])

  const openGaps = useMemo(() => gaps.filter(g => !g.doneAt), [gaps])
  const doneGaps = useMemo(() => gaps.filter(g => g.doneAt), [gaps])

  const patch = useCallback((id: string, p: Partial<PhraseGap>) => {
    setGaps(prev => prev.map(g => (g.id === id ? { ...g, ...p } : g)))
  }, [])

  const add = useCallback(async (ru: string) => {
    if (!studentId || !ru.trim()) return false
    const g = await addGap(studentId, lang, ru)
    if (!g) return false
    setGaps(prev => [g, ...prev])
    return true
  }, [studentId, lang])

  const remove = useCallback(async (g: PhraseGap) => {
    setGaps(prev => prev.filter(x => x.id !== g.id))
    if (!(await deleteGap(g.id))) setGaps(prev => [g, ...prev])
  }, [])

  const toCards = useCallback(async (g: PhraseGap) => {
    const ok = await gapToCards(g, owner, subjectId)
    if (ok) { patch(g.id, { doneAt: new Date().toISOString() }); onCarded() }
    return ok
  }, [owner, subjectId, patch, onCarded])

  const pct = gaps.length ? Math.round((doneGaps.length / gaps.length) * 100) : 0

  const tile = missing ? null : (
    <Tile accent={accent} stack tint={{ surface: `${accent}14`, border: `${accent}4d` }} onClick={onOpen}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <TileChip tone="solid" accent={accent} soft={soft}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <MessageCircleQuestion size={11} aria-hidden /> {t('Журнал')}
          </span>
        </TileChip>
        {ready && openGaps.length > 0 && <TileChip>{openGaps.length} {t('ждут')}</TileChip>}
      </span>
      <span style={{ fontSize: 14.5, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.3 }}>
        {t('Не смог сказать')}
      </span>
      <span style={{
        flex: 1, fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.45,
        overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
      }}>
        {!ready ? '' : openGaps.length > 0
          ? openGaps.slice(0, 3).map(g => g.ru).join(' · ')
          : t('Перешёл на русский, потому что не знал, как сказать? Запиши фразу — разберём и отправим в карточки.')}
      </span>
      <TileMeter value={pct} />
      <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
        {!ready ? '…' : gaps.length === 0
          ? t('пока пусто')
          : `${doneGaps.length} ${t('из')} ${gaps.length} ${t('в карточках')}`}
      </span>
    </Tile>
  )

  const rail = !open ? null : (
    <RailCard title="Журнал" accent={accent} icon={<MessageCircleQuestion size={15} />}>
      <RailStat label="Записано" value={gaps.length} />
      <RailStat label="Ждут разбора" value={openGaps.length} tone={openGaps.length > 0 ? 'warn' : undefined} />
      <RailStat label="В карточках" value={doneGaps.length} tone={doneGaps.length > 0 ? 'good' : undefined} />
      <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5, ...proseWrap }}>
        {bindShortWords(t('Каждый раз, когда разговор сорвался на русский, запиши фразу. Вечером разбери: найди, как сказать, и отправь в карточки.'))}
      </div>
    </RailCard>
  )

  const toolbar = !open ? null : (
    <Toolbar>
      <BackToSets onBack={onClose} />
      <ToolCount>{openGaps.length} {t('ждут разбора')}</ToolCount>
    </Toolbar>
  )

  const content = !open ? null : !studentId ? (
    <Empty text={'Журнал хранится в аккаунте, чтобы записи были и на телефоне, и на ноутбуке.\nВойдите, чтобы записывать фразы.'} />
  ) : !ready ? (
    <Skeleton.Text lines={4} style={{ maxWidth: 420 }} />
  ) : failed ? (
    <Empty text={'Журнал не загрузился. Проверьте связь и обновите страницу.'} />
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
      <Composer accent={accent} onAdd={add} />
      {openGaps.length === 0 && doneGaps.length === 0 && (
        <Empty text={'Здесь пока пусто.\nЗаписывайте сюда реплики, на которых разговор ушёл на русский: «я пошёл работать», «передай соль».'} />
      )}
      {openGaps.map(g => (
        <GapRow key={g.id} gap={g} lang={lang} accent={accent} helpOn={helpOn}
          onPatch={p => patch(g.id, p)} onRemove={() => remove(g)} onCards={() => toCards(g)} />
      ))}
      {doneGaps.length > 0 && <DoneList gaps={doneGaps} />}
    </div>
  )

  return { rail, toolbar, content, tile }
}

// ─── Запись ──────────────────────────────────────────────────────────────────
//
// Enter — записать, Shift+Enter — перенос: фразу ловят на бегу, с телефона,
// и лишний тап до кнопки здесь стоит дороже, чем в любой форме.

function Composer({ accent, onAdd }: { accent: string; onAdd: (ru: string) => Promise<boolean> }) {
  const t = useT()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const submit = async () => {
    if (!text.trim() || busy) return
    setBusy(true); setError(false)
    const ok = await onAdd(text)
    setBusy(false)
    if (ok) setText(''); else setError(true)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 18,
      border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-2)',
    }}>
      <GrowTextarea
        value={text}
        onChange={setText}
        rows={1}
        placeholder={t('Что хотел сказать? Например: я пошёл работать')}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit() } }}
        style={{
          width: '100%', boxSizing: 'border-box', resize: 'none', border: 'none', outline: 'none',
          background: 'transparent', fontFamily: 'inherit', fontSize: 15, lineHeight: 1.35,
          color: 'var(--color-text)', padding: 0,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => void submit()} disabled={!text.trim() || busy}
          style={{ ...primaryBtn(accent), ...smallBtn, opacity: !text.trim() || busy ? 0.5 : 1 }}>
          {busy ? t('Записываю…') : t('Записать')}
        </button>
        {error && <span style={{ fontSize: 12.5, color: 'var(--color-danger, #d9534f)' }}>{t('Не сохранилось — попробуйте ещё раз')}</span>}
      </div>
    </div>
  )
}

// ─── Строка журнала ──────────────────────────────────────────────────────────

function GapRow({ gap, lang, accent, helpOn, onPatch, onRemove, onCards }: {
  gap: PhraseGap
  lang: string
  accent: string
  helpOn: boolean
  onPatch: (p: Partial<PhraseGap>) => void
  onRemove: () => void
  onCards: () => Promise<boolean>
}) {
  const t = useT()
  const [en, setEn] = useState(gap.en ?? '')
  const [variants, setVariants] = useState<PhraseVariant[] | null>(null)
  const [asking, setAsking] = useState(false)
  const [askError, setAskError] = useState('')
  const [carding, setCarding] = useState(false)

  // Запись могла прийти с другого устройства — подтягиваем, если поле не трогали.
  useEffect(() => { setEn(gap.en ?? '') }, [gap.en])

  const commit = async (value: string, note?: string) => {
    const v = value.trim()
    if (v === (gap.en ?? '') && note === undefined) return
    onPatch({ en: v || undefined, ...(note !== undefined ? { note: note || undefined } : {}) })
    await saveGap(gap.id, { en: v || null, ...(note !== undefined ? { note: note || null } : {}) })
  }

  const ask = async () => {
    setAsking(true); setAskError('')
    try { setVariants(await askPhrase(lang, gap.ru)) }
    catch (e) { setAskError(e instanceof Error ? e.message : String(e)) }
    finally { setAsking(false) }
  }

  const pick = (v: PhraseVariant) => {
    setEn(v.term)
    void commit(v.term, v.note ?? '')
  }

  const cards = async () => {
    setCarding(true)
    if (en.trim() !== (gap.en ?? '')) await commit(en)
    await onCards()
    setCarding(false)
  }

  const canCard = !!en.trim() && !carding

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', borderRadius: 18,
      border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, fontSize: 15, fontWeight: 650, color: 'var(--color-text)', lineHeight: 1.35, ...proseWrap }}>
          {gap.ru}
        </div>
        <button onClick={onRemove} aria-label={t('Удалить')} title={t('Удалить')} style={{
          border: 'none', background: 'transparent', cursor: 'pointer', padding: 4,
          color: 'var(--color-text-3)', display: 'inline-flex', flexShrink: 0,
        }}>
          <Trash2 size={15} />
        </button>
      </div>

      {/* Правка на месте — подчёркиванием, не рамкой (см. feedback-inline-edit-underline). */}
      <input
        value={en}
        onChange={e => setEn(e.target.value)}
        onBlur={() => void commit(en)}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        placeholder={t('Как это сказать? Впишите сами или спросите подсказку')}
        lang={lang}
        style={{
          width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none',
          borderBottom: `1.5px solid ${en.trim() ? accent : 'var(--color-border-medium)'}`,
          background: 'transparent', fontFamily: 'inherit', fontSize: 15, lineHeight: 1.35,
          padding: '4px 0 6px', color: 'var(--color-text)', borderRadius: 0,
        }}
      />
      {gap.note && en.trim() === (gap.en ?? '') && (
        <div style={{ fontSize: 12.5, color: 'var(--color-text-3)', lineHeight: 1.45, ...proseWrap }}>{gap.note}</div>
      )}

      {variants && variants.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {variants.map(v => {
            const on = en.trim() === v.term
            return (
              <button key={v.term} onClick={() => pick(v)} style={{
                textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', padding: '9px 12px',
                borderRadius: 12, border: `1px solid ${on ? accent : 'var(--color-border-soft)'}`,
                background: on ? `${accent}14` : 'var(--color-bg)', display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <span style={{ width: 16, flexShrink: 0, color: accent, paddingTop: 1 }}>{on && <Check size={14} />}</span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 650, color: 'var(--color-text)' }} lang={lang}>{v.term}</span>
                  {v.note && <span style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.4 }}>{v.note}</span>}
                </span>
              </button>
            )
          })}
        </div>
      )}
      {variants && variants.length === 0 && (
        <div style={{ fontSize: 12.5, color: 'var(--color-text-3)' }}>{t('Подсказка ничего не предложила — впишите вариант сами.')}</div>
      )}
      {askError && <div style={{ fontSize: 12.5, color: 'var(--color-danger, #d9534f)' }}>{askError}</div>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {helpOn && (
          <button onClick={() => void ask()} disabled={asking} style={{ ...ghostBtn(accent), ...smallBtn, opacity: asking ? 0.6 : 1 }}>
            <Sparkles size={14} /> {asking ? t('Думаю…') : variants ? t('Ещё варианты') : t('Как сказать?')}
          </button>
        )}
        <button onClick={() => void cards()} disabled={!canCard}
          style={{ ...primaryBtn(accent), ...smallBtn, opacity: canCard ? 1 : 0.45, cursor: canCard ? 'pointer' : 'default' }}>
          {carding ? t('Добавляю…') : t('В карточки')}
        </button>
      </div>
    </div>
  )
}

// ─── Разобранное ─────────────────────────────────────────────────────────────

function DoneList({ gaps }: { gaps: PhraseGap[] }) {
  const t = useT()
  const [shown, setShown] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
      <button onClick={() => setShown(s => !s)} style={{
        alignSelf: 'flex-start', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
        fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)',
      }}>
        {shown ? '▾' : '▸'} {t('Уже в карточках')} · {gaps.length}
      </button>
      {shown && gaps.map(g => (
        <div key={g.id} style={{
          display: 'flex', gap: 10, alignItems: 'baseline', padding: '8px 12px', borderRadius: 12,
          background: 'var(--color-bg-2)', fontSize: 13.5, lineHeight: 1.35,
        }}>
          <Check size={13} style={{ color: 'var(--color-success, #3aa76d)', flexShrink: 0, alignSelf: 'center' }} />
          <span style={{ fontWeight: 650, color: 'var(--color-text)' }}>{g.en}</span>
          <span style={{ color: 'var(--color-text-3)' }}>{g.ru}</span>
        </div>
      ))}
    </div>
  )
}
