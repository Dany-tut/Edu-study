import { useState, type ReactNode } from 'react'
import ScratchFoil from '../ScratchFoil'
import { Check, Copy } from '../icons/appIcons'
import { useTheme } from '../../store/themeStore'
import { COMMON, devFakeSticker, openStickerAlbum, unseenGifts, useStickerAlbum, useStickers, type StickerKey } from '../../lib/seasonStickers'
import { haptic } from '../../lib/feedback'
import StickerAlbum from '../season/stickers/StickerAlbum'
import StickerToast from '../season/stickers/StickerToast'
import TeacherGift from '../season/stickers/TeacherGift'

// Стенд ИСК-4 «Стереть монеткой». Показывает НАСТОЯЩИЕ окна продукта —
// подарок учителя, всплывашку «Новый стикер!» и альбом с распаковкой — на
// стикерах, которые devFakeSticker кладёт только во вкладку: в базу стенд не
// пишет ничего. Промокод — пока концепт (нужен бэкенд кодов и решение по цене).
//
// DEV: /#/scratch-stand. Тестовая сборка с VITE_SCRATCH_PREVIEW=1 — сразу при
// запуске (main.tsx); «В приложение» уходит в обычный кабинет.

/** Ученик стенда: правдоподобный uuid, которого нет в базе. */
const STAND_STUDENT = '00000000-0000-4000-8000-00000000ce4a'

let pick = 0
const nextKey = (): StickerKey => COMMON[(pick++ * 5 + 3) % COMMON.length]

export default function ScratchStand({ onExit }: { onExit?: () => void }) {
  const { dark, toggle } = useTheme()
  const { owned, loaded } = useStickers(STAND_STUDENT)
  const album = useStickerAlbum()
  const gifts = unseenGifts(owned)
  const [promoOpen, setPromoOpen] = useState(false)
  const [promoRound, setPromoRound] = useState(0)
  const [copied, setCopied] = useState(false)
  // Сезон на <html> — тот же атрибут, что ставит lib/season.ts. Фольга в режиме
  // 'auto' берёт настроение от него: так видно, что модуль не новогодний.
  const [season, setSeasonAttr] = useState<string | null>(() => document.documentElement.dataset.season ?? null)
  const pickSeason = (v: string | null) => {
    if (v) document.documentElement.dataset.season = v
    else delete document.documentElement.dataset.season
    setSeasonAttr(v)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', color: 'var(--color-text)', padding: 'calc(env(safe-area-inset-top) + 20px) 16px calc(env(safe-area-inset-bottom) + 48px)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={eyebrow}>ИСК-4 · стенд · без базы</div>
            <h1 style={{ margin: '4px 0 0', fontSize: 22 }}>Стереть монеткой</h1>
          </div>
          <button data-hover="layer" onClick={toggle} style={btn}>{dark ? 'Светлая тема' : 'Тёмная тема'}</button>
          {onExit && <button data-hover="layer" onClick={onExit} style={btn}>В приложение</button>}
        </div>

        <div className="flex" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-3)' }}>Настроение от сезона:</span>
          {([[null, 'Вне сезона · Искра'], ['new-year', 'Новый год'], ['halloween', 'Хэллоуин']] as const).map(([v, name]) => (
            <button key={name} data-hover="layer" onClick={() => pickSeason(v)} aria-pressed={season === v}
              style={{ ...btn, minHeight: 36, fontSize: 13, ...(season === v ? { background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)' } : null) }}>
              {name}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 16, alignItems: 'start' }}>
          <Scenario n="1" title="Подарок от учителя" lead="Учитель проверил ДЗ и приложил стикер, ачивку и подпись. На главной ученик стирает фольгу — какой стикер, видно только после.">
            <button data-hover="layer" disabled={!loaded} style={primary}
              onClick={() => devFakeSticker(STAND_STUDENT, nextKey(), 'teacher', { achievement: 'perfect', note: 'ОВР без единой ошибки — так держать!' })}>
              Прислать подарок
            </button>
          </Scenario>

          <Scenario n="2" title="Стикер за ДЗ или видео" lead="Сразу после сдачи — всплывашка «Новый стикер!» с фольгой вместо картинки. В альбоме стикер ждёт под фольгой, пока его не сотрут.">
            <div className="flex" style={{ gap: 8 }}>
              <button data-hover="layer" disabled={!loaded} style={{ ...primary, flex: 1 }} onClick={() => devFakeSticker(STAND_STUDENT, nextKey(), 'hw')}>Сдать ДЗ</button>
              <button data-hover="layer" style={{ ...btn, flex: 1, minHeight: 44 }} onClick={() => openStickerAlbum()}>Альбом</button>
            </div>
          </Scenario>

          <Scenario n="3" title="Промокод · позже" lead="Концепт: за серию 14 дней или приглашённого друга. Настроение задано явно — «золото», сезон его не меняет. Код ненастоящий.">
            <ScratchFoil key={promoRound} mood="gold" revealed={promoOpen} onReveal={() => setPromoOpen(true)} minHeight={150} hint="Подарок за 14 дней подряд" background="var(--color-purple-soft)">
              <div style={{ padding: '22px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-purple-text)' }}>−20 % на следующий месяц</div>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--color-text)' }}>ISKRA-7Q2F</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Действует до 31 января · один раз</div>
              </div>
            </ScratchFoil>
            <div className="flex" style={{ gap: 8 }}>
              {promoOpen && (
                <button data-hover="layer" style={{ ...primary, flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onClick={() => { void navigator.clipboard?.writeText('ISKRA-7Q2F').catch(() => {}); haptic(8); setCopied(true) }}>
                  {copied ? <><Check size={14} /> Скопирован</> : <><Copy size={14} /> Скопировать код</>}
                </button>
              )}
              <button data-hover="layer" style={{ ...btn, minHeight: 44 }} onClick={() => { setCopied(false); setPromoOpen(false); setPromoRound(r => r + 1) }}>Ещё раз</button>
            </div>
          </Scenario>
        </div>
      </div>

      <StickerAlbum studentId={STAND_STUDENT} />
      <StickerToast />
      <TeacherGift studentId={STAND_STUDENT} gifts={gifts} suspended={album.open} />
    </div>
  )
}

function Scenario({ n, title, lead, children }: { n: string; title: string; lead: string; children: ReactNode }) {
  return (
    <section style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={eyebrow}>Вариант {n}</div>
        <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-3)', lineHeight: 1.45, marginTop: 4 }}>{lead}</div>
      </div>
      {children}
    </section>
  )
}

const btn: React.CSSProperties = { minHeight: 40, padding: '0 14px', borderRadius: 12, border: 'none', background: 'var(--color-bg-3)', color: 'var(--color-text)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const primary: React.CSSProperties = { ...btn, minHeight: 44, background: 'var(--btn-green-bg)', color: '#fff' }
const eyebrow: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-3)' }
