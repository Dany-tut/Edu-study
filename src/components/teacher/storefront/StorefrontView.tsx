// «Витрина»: кабинет автора курсов на площадке Искры.
// Заявки на покупку, ученики площадки, карточки курсов в каталоге и их
// модерация (для админа). Сервер: catalog_author_overview, course_listings,
// catalog_decide_order, catalog_revoke. План: docs/analysis/course-marketplace-2026-11-25.md.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../../lib/supabase'
import { getOwnerId } from '../../../lib/owner'
import { useScrollFades } from '../../../lib/useScrollFades'
import { useTeacherAccess } from '../../../lib/teacherAccess'
import { PLATFORM } from '../../../lib/platform'
import {
  CATALOG_CATEGORIES, CATALOG_DEMO, COVER_TONE_IDS, COVER_TONES, catalogHref, decideOrder, fetchAuthorOverview, formatPrice,
  revokeEntitlement, saveListing, slugFromTitle, type AuthorOverview, type Listing, type ListingStatus,
} from '../../../lib/catalog'
import FloatField from '../../FloatField'
import FadeText from '../../FadeText'
import MobileSheet from '../../MobileSheet'
import { Check, ExternalLink, Plus, Users, Wallet, X, Inbox } from '../../icons/appIcons'
import '../../../pages/catalog/catalog.css'

const STATUS_LABEL: Record<ListingStatus, string> = {
  draft: 'Черновик', review: 'На проверке', published: 'В каталоге', rejected: 'Вернули на доработку', archived: 'Снят с витрины',
}
const STATUS_CLASS: Record<ListingStatus, string> = {
  draft: 'cat-badge-mut', review: 'cat-badge-amber', published: 'cat-badge-green', rejected: 'cat-badge-amber', archived: 'cat-badge-mut',
}

type OwnCourse = { id: string; title: string; status: string }

export default function StorefrontView({ compact = false }: { compact?: boolean }) {
  const isAdmin = useTeacherAccess(s => s.isAdmin)
  const [data, setData] = useState<AuthorOverview | null>(null)
  const [own, setOwn] = useState<OwnCourse[]>([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<{ courseId: string; title: string } | null>(null)
  const [picking, setPicking] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  useScrollFades(rootRef, true, '.cat-chips')

  const load = useCallback(async () => {
    setError('')
    try {
      const uid = CATALOG_DEMO ? null : await getOwnerId()
      const [overview, courses] = await Promise.all([
        fetchAuthorOverview(),
        uid ? supabase.from('courses').select('id,title,status').eq('created_by', uid).order('created_at', { ascending: false }) : Promise.resolve({ data: [] as OwnCourse[] }),
      ])
      setData(overview)
      setOwn(((courses as { data: OwnCourse[] | null }).data ?? []).filter(c => c.title))
    } catch {
      setError('Витрина не загрузилась.\nОбновите страницу или попробуйте позже.')
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const listed = useMemo(() => new Set((data?.listings ?? []).filter(l => l.listing).map(l => l.course_id)), [data])
  const unlisted = own.filter(c => !listed.has(c.id))
  const titleOf = (id: string) => data?.listings.find(l => l.course_id === id)?.title ?? own.find(c => c.id === id)?.title ?? 'Курс'
  const openOrders = (data?.orders ?? []).filter(o => o.status === 'requested' || o.status === 'pending')
  const totals = (data?.listings ?? []).reduce((a, l) => ({ learners: a.learners + l.learners_full, preview: a.preview + l.learners_preview, paid: a.paid + l.paid_total_kopecks }), { learners: 0, preview: 0, paid: 0 })

  async function act(id: string, fn: () => Promise<void>) {
    setBusy(id); setError('')
    try { await fn(); await load() } catch (e) { setError(e instanceof Error ? e.message : 'Не получилось.') } finally { setBusy(null) }
  }

  return (
    <div ref={rootRef} className="cat-root" data-layout={compact ? 'mobile' : 'desktop'} data-shell={PLATFORM} style={{ minHeight: 0, background: 'transparent' }}>
      <div className="cat-wrap" style={{ padding: compact ? '0 0 40px' : '24px 32px 80px', maxWidth: 1120, margin: 0 }}>
        {!compact && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 className="cat-h1" style={{ flex: 1, fontSize: 30 }}>Витрина</h1>
            <a className="cat-btn cat-btn-sec cat-btn-s" href={catalogHref()} target="_blank" rel="noopener"><ExternalLink size={16} />Открыть каталог</a>
            <button type="button" className="cat-btn cat-btn-pri cat-btn-s" onClick={() => setPicking(true)}><Plus size={16} />Выставить курс</button>
          </div>
        )}
        <p className="cat-sub" style={{ margin: 0 }}>Выставьте свой курс в каталог Искры: его найдут, купят и пройдут люди не из ваших групп. Курс публикует модератор после проверки.</p>
        {error && <p className="cat-error" style={{ whiteSpace: 'pre-line', margin: 0 }}>{error}</p>}
        {!data && !error && <div className="cat-skel" style={{ height: 160 }} />}
        {data && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 12 }}>
              <Kpi icon={<Users size={18} />} label="Ученики с доступом" value={String(totals.learners)} sub={totals.preview ? `ещё ${totals.preview} на пробном` : undefined} />
              <Kpi icon={<Inbox size={18} />} label="Заявки ждут" value={String(openOrders.length)} />
              <Kpi icon={<Wallet size={18} />} label="Подтверждено оплат" value={formatPrice(totals.paid).replace('Бесплатно', '0 ₽')} wide={compact} />
            </div>

            {openOrders.length > 0 && (
              <section className="cat-panel">
                <h2 className="cat-h2" style={{ fontSize: 17 }}>Заявки на покупку</h2>
                <p className="cat-muted" style={{ margin: 0 }}>Онлайн-оплата ещё не подключена. Свяжитесь с покупателем, примите оплату и подтвердите: курс откроется сразу.</p>
                {openOrders.map(o => (
                  <div key={o.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                      <FadeText style={{ fontWeight: 650 }}>{o.buyer_name || 'Покупатель'} · {titleOf(o.course_id)}</FadeText>
                      <div className="cat-muted" style={{ userSelect: 'text' }}>{o.contact_email ?? 'почта не указана'} · {formatPrice(o.amount_kopecks)} · {new Date(o.created_at).toLocaleDateString('ru-RU')}</div>
                      {o.buyer_note && <div className="cat-muted" style={{ marginTop: 4 }}>«{o.buyer_note}»</div>}
                    </div>
                    <button type="button" className="cat-btn cat-btn-pri cat-btn-s" disabled={busy === o.id} onClick={() => void act(o.id, () => decideOrder(o.id, 'paid'))}><Check size={16} />Оплата получена</button>
                    <button type="button" className="cat-btn cat-btn-sec cat-btn-s" disabled={busy === o.id} onClick={() => void act(o.id, () => decideOrder(o.id, 'canceled'))}>Отклонить</button>
                  </div>
                ))}
              </section>
            )}

            <section className="cat-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 className="cat-h2" style={{ fontSize: 17, flex: 1 }}>Курсы на витрине</h2>
                {compact && <button type="button" className="cat-btn cat-btn-pri cat-btn-s" onClick={() => setPicking(true)}><Plus size={16} />Выставить</button>}
              </div>
              {data.listings.filter(l => l.listing).length === 0 && <p className="cat-muted" style={{ margin: 0 }}>Пока ни одного. Нажмите «Выставить курс» и выберите курс из Конструктора.</p>}
              {data.listings.filter(l => l.listing).map(l => {
                const st = l.listing!.status
                return (
                  <div key={l.course_id} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: COVER_TONES[l.listing!.cover_tone] ?? COVER_TONES.violet }} aria-hidden />
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                      <FadeText style={{ fontWeight: 650 }}>{l.title}</FadeText>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
                        <span className={`cat-badge ${STATUS_CLASS[st]}`}>{STATUS_LABEL[st]}</span>
                        <span className="cat-muted">{formatPrice(l.listing!.price_kopecks)} · {l.learners_full} с доступом{l.orders_open ? ` · ${l.orders_open} заявок` : ''}</span>
                      </div>
                      {st === 'rejected' && l.listing!.reject_reason && <div className="cat-muted" style={{ marginTop: 4 }}>Модератор: {l.listing!.reject_reason}</div>}
                      {l.course_status !== 'published' && <div className="cat-muted" style={{ marginTop: 4 }}>Курс в Конструкторе не опубликован: в каталоге его не видно.</div>}
                    </div>
                    <a className="cat-btn cat-btn-sec cat-btn-s" href={catalogHref(l.listing!.slug)} target="_blank" rel="noopener">Карточка</a>
                    <button type="button" className="cat-btn cat-btn-sec cat-btn-s" onClick={() => setEditing({ courseId: l.course_id, title: l.title })}>Настроить</button>
                    {isAdmin && st === 'review' && (
                      <button type="button" className="cat-btn cat-btn-pri cat-btn-s" disabled={busy === l.course_id}
                        onClick={() => void act(l.course_id, async () => { await saveListing({ course_id: l.course_id, status: 'published' }) })}>Опубликовать</button>
                    )}
                  </div>
                )
              })}
            </section>

            {data.learners.length > 0 && (
              <section className="cat-panel">
                <h2 className="cat-h2" style={{ fontSize: 17 }}>Ученики площадки</h2>
                <p className="cat-muted" style={{ margin: 0 }}>Их прогресс и работы видны в журнале курса, как у ваших учеников. В список учеников они не попадают и лимит тарифа не тратят.</p>
                {data.learners.slice(0, 50).map(x => (
                  <div key={x.entitlement_id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <FadeText style={{ fontWeight: 600 }}>{x.name || 'Ученик'}</FadeText>
                      <FadeText className="cat-muted">{titleOf(x.course_id)} · {x.access === 'full' ? 'полный доступ' : 'пробный модуль'} · с {new Date(x.granted_at).toLocaleDateString('ru-RU')}</FadeText>
                    </div>
                    <RevokeButton busy={busy === x.entitlement_id} onConfirm={() => void act(x.entitlement_id, () => revokeEntitlement(x.entitlement_id))} />
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>

      {picking && (
        <Overlay compact={compact} title="Какой курс выставить" onClose={() => setPicking(false)}>
          {unlisted.length === 0 && <p className="cat-sub">Все ваши курсы уже на витрине. Новый курс создаётся в Конструкторе.</p>}
          {unlisted.map(c => (
            <button key={c.id} type="button" className="cat-module-head" style={{ borderTop: '1px solid var(--color-border)' }} onClick={() => { setPicking(false); setEditing({ courseId: c.id, title: c.title }) }}>
              <FadeText className="cat-module-title">{c.title}</FadeText>
              {c.status !== 'published' && <span className="cat-badge cat-badge-mut" style={{ flexShrink: 0 }}>не опубликован</span>}
            </button>
          ))}
        </Overlay>
      )}
      {editing && (
        <ListingEditor compact={compact} isAdmin={isAdmin} courseId={editing.courseId} title={editing.title}
          current={data?.listings.find(l => l.course_id === editing.courseId)?.listing ?? null}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load() }} />
      )}
    </div>
  )
}

function Kpi({ icon, label, value, sub, wide }: { icon: React.ReactNode; label: string; value: string; sub?: string; wide?: boolean }) {
  return (
    <div className="cat-panel" style={{ gap: 4, padding: '14px 16px', gridColumn: wide ? 'span 2' : undefined }}>
      <span className="cat-muted" style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 600 }}>{icon}{label}</span>
      <span style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      {sub && <span className="cat-muted">{sub}</span>}
    </div>
  )
}

function RevokeButton({ busy, onConfirm }: { busy: boolean; onConfirm: () => void }) {
  const [ask, setAsk] = useState(false)
  if (!ask) return <button type="button" className="cat-btn cat-btn-sec cat-btn-s" onClick={() => setAsk(true)}>Снять доступ</button>
  return (
    <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
      <span className="cat-muted">Прогресс сохранится</span>
      <button type="button" className="cat-btn cat-btn-sec cat-btn-s" style={{ color: 'var(--color-red-text)' }} disabled={busy} onClick={onConfirm}>Снять</button>
      <button type="button" className="cat-x" onClick={() => setAsk(false)} aria-label="Отмена"><X size={16} /></button>
    </span>
  )
}

function Overlay({ compact, title, onClose, children, footer }: { compact: boolean; title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  if (compact) return <MobileSheet open onClose={onClose} title={title} footer={footer}><div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div></MobileSheet>
  // Портал: страница учителя лежит в анимированном контейнере (transform),
  // и fixed-окно внутри него уезжало под шапку кабинета.
  return createPortal(
    <div className="cat-scrim" data-shell={PLATFORM} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="cat-dialog" role="dialog" aria-modal="true" aria-label={title} style={{ width: 'min(620px, 100%)' }}>
        <div className="cat-dialog-head"><h2 className="cat-h2" style={{ flex: 1 }}>{title}</h2><button type="button" className="cat-x" onClick={onClose} aria-label="Закрыть"><X size={18} /></button></div>
        {children}
        {footer}
      </div>
    </div>,
    document.body,
  )
}

function ListingEditor({ compact, isAdmin, courseId, title, current, onClose, onSaved }: {
  compact: boolean; isAdmin: boolean; courseId: string; title: string; current: Listing | null; onClose: () => void; onSaved: () => void
}) {
  const [slug, setSlug] = useState(current?.slug ?? slugFromTitle(title))
  const [category, setCategory] = useState(current?.category ?? 'other')
  const [price, setPrice] = useState(current ? String(current.price_kopecks / 100) : '0')
  const [subtitle, setSubtitle] = useState(current?.subtitle ?? '')
  const [description, setDescription] = useState(current?.description ?? '')
  const [outcomes, setOutcomes] = useState((current?.outcomes ?? []).join('\n'))
  const [audience, setAudience] = useState(current?.audience ?? '')
  const [level, setLevel] = useState(current?.level_label ?? '')
  const [duration, setDuration] = useState(current?.duration_label ?? '')
  const [tone, setTone] = useState(current?.cover_tone || 'violet')
  const [glyph, setGlyph] = useState(current?.cover_glyph ?? '')
  const [cert, setCert] = useState(current?.certificate_note ?? 'Сертификат Искры о прохождении. Не документ об образовании.')
  const [preview, setPreview] = useState<string[]>(current?.preview_module_ids ?? [])
  const [checkedOn, setCheckedOn] = useState(current?.content_checked_on ?? '')
  const [reason, setReason] = useState('')
  const [modules, setModules] = useState<{ id: string; label: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const chipsRef = useRef<HTMLDivElement>(null)
  useScrollFades(chipsRef, true, '.cat-chips')

  useEffect(() => {
    if (CATALOG_DEMO) { setModules(['Основы Excel и очистка данных', 'Формулы и сверки', 'Отчётность'].map((label, i) => ({ id: 'm' + i, label }))); return }
    void supabase.from('course_modules').select('id,label,position').eq('course_id', courseId).order('position').then(({ data }) => setModules((data ?? []) as { id: string; label: string }[]))
  }, [courseId])

  const priceKopecks = Math.round(Math.max(0, Number(price.replace(',', '.')) || 0) * 100)
  const status = current?.status ?? 'draft'

  async function save(next?: ListingStatus) {
    setBusy(true); setError('')
    try {
      await saveListing({
        course_id: courseId, slug: slug.trim().toLowerCase(), category, price_kopecks: priceKopecks,
        subtitle: subtitle.trim(), description: description.trim(),
        outcomes: outcomes.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 12),
        audience: audience.trim(), level_label: level.trim(), duration_label: duration.trim(),
        cover_tone: tone, cover_glyph: glyph.trim().slice(0, 12), certificate_note: cert.trim(),
        preview_module_ids: preview,
        content_checked_on: /^\d{4}-\d{2}-\d{2}$/.test(checkedOn) ? checkedOn : null,
        ...(next ? { status: next } : {}),
        ...(next === 'rejected' ? { reject_reason: reason.trim() || 'Нужна доработка' } : {}),
      })
      onSaved()
    } catch (e) { setError(e instanceof Error ? e.message : 'Не получилось сохранить.') } finally { setBusy(false) }
  }

  const footer = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: compact ? 0 : 6 }}>
      {error && <p className="cat-error" style={{ width: '100%', margin: 0, whiteSpace: 'pre-line' }}>{error}</p>}
      {isAdmin ? (
        <>
          <button type="button" className="cat-btn cat-btn-pri" disabled={busy} onClick={() => void save('published')}>{status === 'published' ? 'Сохранить в каталоге' : 'Опубликовать'}</button>
          <button type="button" className="cat-btn cat-btn-sec" disabled={busy} onClick={() => void save()}>Сохранить</button>
          {status !== 'draft' && status !== 'archived' && <button type="button" className="cat-btn cat-btn-sec" disabled={busy} onClick={() => void save('rejected')}>Вернуть на доработку</button>}
        </>
      ) : (
        <>
          <button type="button" className="cat-btn cat-btn-pri" disabled={busy} onClick={() => void save('review')}>{status === 'published' ? 'Сохранить и отправить на проверку' : 'Отправить на проверку'}</button>
          {status !== 'published' && <button type="button" className="cat-btn cat-btn-sec" disabled={busy} onClick={() => void save('draft')}>Сохранить черновик</button>}
        </>
      )}
      {status === 'published' && <button type="button" className="cat-btn cat-btn-sec" disabled={busy} onClick={() => void save('archived')}>Снять с витрины</button>}
    </div>
  )

  return (
    <Overlay compact={compact} title={current ? 'Карточка курса' : 'Выставить курс'} onClose={onClose} footer={footer}>
      <FadeText style={{ fontWeight: 700 }}>{title}</FadeText>
      {!isAdmin && status === 'published' && <div className="cat-banner">Курс в каталоге. Изменения уйдут на проверку, а пока покупатели видят прежнюю карточку.</div>}
      <FloatField label="Адрес в каталоге (латиница)" value={slug} onChange={setSlug} hint={`iskra-study.ru/${catalogHref(slug || '…')}`} autoCapitalize="off" />
      <FloatField label="Цена, ₽ (0 — бесплатно)" value={price} onChange={setPrice} inputMode="decimal" />
      <div ref={chipsRef} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="cat-muted" style={{ fontWeight: 600 }}>Категория</span>
        <div className="cat-chips" role="radiogroup" aria-label="Категория" style={{ margin: 0, padding: '4px 0', flexWrap: compact ? undefined : 'wrap' }}>
          {CATALOG_CATEGORIES.map(c => <button key={c.id} type="button" role="radio" aria-checked={category === c.id} aria-pressed={category === c.id} className="cat-chip" onClick={() => setCategory(c.id)}>{c.label}</button>)}
        </div>
      </div>
      <FloatField label="Подзаголовок: одна строка о пользе" value={subtitle} onChange={setSubtitle} maxLength={300} />
      <FloatField label="Чему научится ученик — по пункту в строке" multiline rows={4} value={outcomes} onChange={setOutcomes} />
      <FloatField label="О курсе" multiline rows={4} value={description} onChange={setDescription} maxLength={8000} />
      <FloatField label="Для кого курс" multiline rows={2} value={audience} onChange={setAudience} maxLength={1000} />
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 10 }}>
        <FloatField label="Уровень (например, с нуля)" value={level} onChange={setLevel} />
        <FloatField label="Длительность (например, ~17 часов)" value={duration} onChange={setDuration} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="cat-muted" style={{ fontWeight: 600 }}>Обложка</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {COVER_TONE_IDS.map(id => (
            <button key={id} type="button" aria-label={`Цвет ${id}`} aria-pressed={tone === id} onClick={() => setTone(id)}
              style={{ width: 44, height: 44, borderRadius: 14, border: 0, cursor: 'pointer', background: COVER_TONES[id], boxShadow: tone === id ? '0 0 0 3px var(--color-bg-2), 0 0 0 5px var(--loop-ink)' : 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              {tone === id && <Check size={18} />}
            </button>
          ))}
          <div style={{ flex: '1 1 160px' }}><FloatField label="Знак на обложке (до 12 символов)" value={glyph} onChange={setGlyph} maxLength={12} /></div>
        </div>
      </div>
      {modules.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="cat-muted" style={{ fontWeight: 600 }}>Пробные модули — открыты бесплатно до покупки</span>
          {modules.map((m, i) => {
            const on = preview.includes(m.id)
            return (
              <button key={m.id} type="button" className="cat-module-head" aria-pressed={on} onClick={() => setPreview(on ? preview.filter(x => x !== m.id) : [...preview, m.id])}
                style={{ borderTop: i ? '1px solid var(--color-border)' : 0, padding: '10px 0' }}>
                <span style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: on ? 'var(--grad-purple)' : 'var(--color-bg-3)', color: '#fff' }}>{on && <Check size={16} />}</span>
                <FadeText className="cat-module-title">{m.label || `Модуль ${i + 1}`}</FadeText>
              </button>
            )
          })}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px' }}><FloatField label="Материал сверен с нормами на дату (ГГГГ-ММ-ДД)" value={checkedOn} onChange={setCheckedOn} inputMode="numeric" maxLength={10} hint="Видно покупателям на карточке. Для курсов, где меняются законы и формы" /></div>
        <button type="button" className="cat-btn cat-btn-sec cat-btn-s" style={{ marginTop: 6 }} onClick={() => setCheckedOn(new Date().toISOString().slice(0, 10))}>Сверено сегодня</button>
      </div>
      <FloatField label="Сертификат" value={cert} onChange={setCert} hint="Без лицензии нельзя называть его документом об образовании" />
      {isAdmin && status !== 'draft' && <FloatField label="Причина возврата на доработку" value={reason} onChange={setReason} />}
    </Overlay>
  )
}
