import { useEffect, useState } from 'react'
import { Ghost } from 'lucide-react'
import Switch from '../Switch'
import Checkbox from '../Checkbox'
import TeacherSaveButton from './TeacherSaveButton'
import { Alert } from '../Alert'
import { useT } from '../../lib/i18n'
import {
  loadSeason, saveSeason, setSeasonPreview, statusOf, useSeason, seasonImg,
  VARIANTS, PARTS, type Season, type SeasonVariant,
} from '../../lib/season'

/*
 * Админка → «Праздничная тема». Строка app_seasons: включена ли, даты с/по,
 * вариант оформления и части. «Показать у меня» — предпросмотр только в этом
 * браузере: ученики видят тему лишь между датами.
 */

const VARIANT_IMG: Record<SeasonVariant, string> = { lanterns: 'lantern', candy: 'candy-bucket', potions: 'potions' }
const VARIANT_BG: Record<SeasonVariant, string> = {
  lanterns: 'linear-gradient(180deg, #120C2A, #2A1F5C)',
  candy: 'linear-gradient(135deg, #FFF4EA, #F3EEFF)',
  potions: 'linear-gradient(180deg, #24184F, #7A5FC8)',
}

/** ISO → значение для <input type="datetime-local"> в часовом поясе браузера. */
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const fieldStyle: React.CSSProperties = {
  width: '100%', height: 40, padding: '0 12px', borderRadius: 12,
  border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-input)',
  color: 'var(--color-text)', fontSize: 13.5, fontFamily: 'inherit',
}

export default function SeasonAdmin() {
  const t = useT()
  const view = useSeason()
  const [draft, setDraft] = useState<Season | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    loadSeason()
      .then(s => { if (alive) { setDraft(s); setLoading(false) } })
      .catch(e => { if (alive) { setError(String(e.message ?? e)); setLoading(false) } })
    return () => { alive = false }
  }, [])

  if (loading) return null
  if (!draft) return (
    <div style={{ marginBottom: 24 }}>
      <Alert tone="warning" title={t('Праздничная тема недоступна')} text={error ?? t('В базе нет строки app_seasons — примени миграцию 0110.')} />
    </div>
  )

  const patch = (p: Partial<Season>) => { setDraft(d => (d ? { ...d, ...p } : d)); setSaved(false) }
  const status = statusOf(draft)
  const until = new Date(Date.parse(draft.endsAt) - 1).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' })
  const statusText = !draft.enabled ? t('Выключена')
    : status === 'live' ? `${t('Идёт')} · ${t('до')} ${until}`
    : status === 'soon' ? t('Ещё не началась') : t('Закончилась')
  const statusLive = draft.enabled && status === 'live'

  async function save() {
    if (!draft) return
    if (Date.parse(draft.endsAt) <= Date.parse(draft.startsAt)) { setError(t('Конец темы раньше начала')); return }
    setSaving(true); setError(null)
    const err = await saveSeason(draft)
    setSaving(false)
    if (err) setError(err)
    else setSaved(true)
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <Ghost size={13} strokeWidth={2.5} style={{ color: 'var(--color-purple)' }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {t('Праздничная тема')}
        </div>
      </div>
      <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 16, overflow: 'hidden' }}>
        {/* Главный рубильник */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'var(--color-bg-3)' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text)' }}>{t('Хэллоуин')}</div>
            <div style={{ fontSize: 11.5, marginTop: 3, fontWeight: 600, color: statusLive ? 'var(--color-green-text)' : 'var(--color-text-3)' }}>{statusText}</div>
          </div>
          <Switch checked={draft.enabled} onChange={v => patch({ enabled: v })} label={t('Хэллоуин')} />
        </div>

        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--color-border)', opacity: draft.enabled ? 1 : 0.45, transition: 'opacity 0.15s' }}>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', marginBottom: 6 }}>{t('Даты: включается и выключается сама')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input type="datetime-local" aria-label={t('Начало')} style={fieldStyle}
              value={toLocalInput(draft.startsAt)} onChange={e => e.target.value && patch({ startsAt: new Date(e.target.value).toISOString() })} />
            <input type="datetime-local" aria-label={t('Конец')} style={fieldStyle}
              value={toLocalInput(draft.endsAt)} onChange={e => e.target.value && patch({ endsAt: new Date(e.target.value).toISOString() })} />
          </div>

          <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', margin: '16px 0 6px' }}>{t('Вариант оформления')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            {VARIANTS.map(v => {
              const on = draft.variant === v.key
              return (
                <button
                  key={v.key}
                  onClick={() => patch({ variant: v.key })}
                  aria-pressed={on}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: 10, textAlign: 'left', cursor: 'pointer',
                    borderRadius: 14, background: 'var(--color-bg)', fontFamily: 'inherit',
                    border: on ? '2px solid var(--color-control-accent)' : '1px solid var(--color-border-medium)',
                    margin: on ? 0 : 1,
                  }}
                >
                  <span style={{ width: 48, height: 52, borderRadius: 10, background: VARIANT_BG[v.key], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <img src={seasonImg(VARIANT_IMG[v.key])} alt="" style={{ height: 40, width: 'auto' }} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 650, color: 'var(--color-text)' }}>{t(v.title)}</span>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-3)', marginTop: 2, lineHeight: 1.3 }}>{t(v.about)}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', margin: '16px 0 8px' }}>{t('Что включать')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
            {PARTS.map(p => (
              <Checkbox key={p.key} checked={draft.parts[p.key]} onChange={v => patch({ parts: { ...draft.parts, [p.key]: v } })}>
                <span style={{ fontSize: 13, color: 'var(--color-text)' }}>{t(p.title)}</span>
              </Checkbox>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <Switch checked={view.preview} onChange={setSeasonPreview} label={t('Показать у меня')} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{t('Показать у меня')}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{t('Только в этом браузере, ученики не видят')}</div>
            </div>
          </div>
          <TeacherSaveButton label={t('Сохранить')} onClick={save} saving={saving} saved={saved} />
        </div>
      </div>
      {error && <Alert tone="danger" title={t('Не сохранилось')} text={error} style={{ marginTop: 10 }} />}
      <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', marginTop: 8, lineHeight: 1.5 }}>
        {t('Ученик может выключить тему у себя: в меню и в профиле появляется переключатель, пока сезон идёт.')}
      </div>
    </div>
  )
}
