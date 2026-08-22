// ─────────────────────────────────────────────────────────────────────────────
// Правила: витрина и разворот одной конструкции
//
// ПОЧЕМУ РАЗВОРОТ, А НЕ СТАТЬЯ. Правило читают не подряд, а выборочно: сегодня
// нужно «как образуется», через неделю — «чем отличается от соседнего». В
// сплошном тексте оба ответа приходится искать заново каждый раз. Здесь блоки
// стоят в жёстком порядке и всегда на своих местах — значение, образование,
// формы, когда так говорят, примеры, ловушки, сравнение, что запомнить, — и
// глаз находит нужный, не читая остального.
//
// ОШИБКА РИСУЕТСЯ ПЕРЕЧЁРКНУТОЙ. Неверная форма, набранная тем же кеглем, что
// и верная, запоминается наравне с ней: через месяц человек помнит, что «где-то
// было 살는 동안에», и не помнит, что это было в графе «так нельзя». Поэтому
// ошибка идёт зачёркнутой, приглушённой и всегда рядом с верной формой.
//
// СРАВНЕНИЕ — ТАБЛИЦА, А НЕ АБЗАЦ. Две конструкции сравнивают по признакам, и
// признаки должны стоять друг под другом: «у этой подлежащие разные, у той
// одно». Тот же текст прозой перечитывают трижды и всё равно путают, где чьё.
// ─────────────────────────────────────────────────────────────────────────────

import { AlertTriangle, Check, X } from 'lucide-react'
import type { GrammarRule } from '../../data/grammarNotes'
import { survivalLevelLabel } from '../../data/survivalPhrases'
import AudioPlayer from '../AudioPlayer'
import { useT } from '../../lib/i18n'
import { proseWrap, bindShortWords } from '../../lib/typography'
import { Tile, TileGrid, TileChip } from './TrainerShell'

/** Витрина правил. */
export function RuleGrid({ rules, subject, accent, soft, seen, onOpen }: {
  rules: GrammarRule[]
  /** Русское название предмета — ступень подписывается в его шкале. */
  subject: string
  accent: string
  soft: string
  /** Правило уже открывали. */
  seen: (id: string) => boolean
  onOpen: (id: string) => void
}) {
  const t = useT()
  return (
    <TileGrid min={250}>
      {rules.map(rule => (
        <Tile key={rule.id} accent={accent} onClick={() => onOpen(rule.id)}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <TileChip tone="accent" accent={accent} soft={soft}>
              {survivalLevelLabel(rule.level, subject)}
            </TileChip>
            {rule.versus && <TileChip>{t('с разбором пары')}</TileChip>}
            {seen(rule.id) && (
              <TileChip tone="accent" accent="var(--color-green-text)" soft="var(--color-green-soft)">
                {t('читал')}
              </TileChip>
            )}
          </span>
          {/* Сама конструкция крупно и первой: правило ищут по ней, а не по
              русскому названию. */}
          <span style={{ fontSize: 20, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.25 }}>
            {rule.form}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: accent, lineHeight: 1.35 }}>
            {t(rule.title)}
          </span>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.5, ...proseWrap }}>
            {bindShortWords(t(rule.meaning))}
          </span>
        </Tile>
      ))}
    </TileGrid>
  )
}

// ─── Разворот ────────────────────────────────────────────────────────────────

/** Блок разворота: заголовок и содержимое. */
function Block({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  const t = useT()
  return (
    <section style={{
      display: 'flex', flexDirection: 'column', gap: 10,
      padding: 18, borderRadius: 16,
      background: 'rgba(var(--glass-rgb), 0.94)',
      border: '1px solid var(--color-border-soft)',
    }}>
      <h4 style={{
        margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.07em',
        textTransform: 'uppercase', color: accent,
      }}>
        {t(title)}
      </h4>
      {children}
    </section>
  )
}

/** Строка списка с точкой. */
function Bullet({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', alignItems: 'baseline', gap: 9, fontSize: 13.5, lineHeight: 1.55, color: 'var(--color-text-2)' }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: accent, flexShrink: 0, transform: 'translateY(-2px)' }} />
      <span style={proseWrap}>{children}</span>
    </li>
  )
}

export function RulePage({ rule, subject, lang, accent, soft }: {
  rule: GrammarRule
  subject: string
  /** Код языка — для озвучки примеров. */
  lang: string
  accent: string
  soft: string
}) {
  const t = useT()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 760, margin: '0 auto', width: '100%' }}>
      {/* Шапка: конструкция, название, значение. */}
      <header style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: '20px 22px', borderRadius: 18, background: soft,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TileChip tone="accent" accent={accent} soft="rgba(var(--glass-rgb), 0.7)">
            {survivalLevelLabel(rule.level, subject)}
          </TileChip>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text-2)' }}>{t(rule.title)}</span>
        </span>
        <h2 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text)', lineHeight: 1.15 }}>
          {rule.form}
        </h2>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'var(--color-text)', ...proseWrap }}>
          {bindShortWords(t(rule.meaning))}
        </p>
      </header>

      <Block title="Как образуется" accent={accent}>
        <div style={{
          fontSize: 14.5, fontWeight: 700, lineHeight: 1.5, color: 'var(--color-text)',
          padding: '11px 14px', borderRadius: 12, background: 'var(--color-bg-3)',
        }}>
          {rule.build}
        </div>
        {rule.forms && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
            {rule.forms.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap', fontSize: 14 }}>
                <span style={{ color: 'var(--color-text-3)' }}>{f.from}</span>
                <span style={{ color: 'var(--color-text-3)' }}>→</span>
                <span style={{ fontWeight: 750, color: 'var(--color-text)' }}>{f.to}</span>
                {f.wrong && (
                  <span style={{ fontSize: 12.5, color: 'var(--color-red-text, #d9534f)', opacity: 0.85 }}>
                    {t('не')} <s style={{ textDecorationThickness: 1.5 }}>{f.wrong}</s>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Block>

      <Block title="Когда так говорят" accent={accent}>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rule.use.map((u, i) => <Bullet key={i} accent={accent}>{bindShortWords(t(u))}</Bullet>)}
        </ul>
      </Block>

      <Block title="Примеры" accent={accent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rule.examples.map((ex, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              {/* Озвучка у каждого примера: конструкция запоминается ритмом
                  фразы, а не её видом на бумаге. */}
              <AudioPlayer ttsText={ex.term} lang={lang} compact />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 15.5, fontWeight: 650, color: 'var(--color-text)', lineHeight: 1.45 }}>
                  {ex.term}
                </span>
                {ex.reading && (
                  <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontStyle: 'italic' }}>{ex.reading}</span>
                )}
                <span style={{ fontSize: 13.5, color: 'var(--color-text-2)', lineHeight: 1.45 }}>{t(ex.ru)}</span>
              </div>
            </div>
          ))}
        </div>
      </Block>

      {rule.traps && rule.traps.length > 0 && (
        <Block title="Так нельзя" accent={accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rule.traps.map((tr, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14.5 }}>
                  <X size={14} style={{ color: '#d9534f', flexShrink: 0 }} />
                  <s style={{ color: 'var(--color-text-3)', textDecorationThickness: 1.5 }}>{tr.wrong}</s>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14.5 }}>
                  <Check size={14} style={{ color: 'var(--color-green-text)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{tr.right}</span>
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--color-text-3)', lineHeight: 1.5, paddingLeft: 21, ...proseWrap }}>
                  {bindShortWords(t(tr.why))}
                </span>
              </div>
            ))}
          </div>
        </Block>
      )}

      {rule.versus && (
        <Block title={`Чем отличается от ${rule.versus.other}`} accent={accent}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-3)', lineHeight: 1.5, ...proseWrap }}>
            {rule.versus.other} — {bindShortWords(t(rule.versus.otherAbout))}
          </p>
          {/* Таблица едет по горизонтали внутри себя: на узком экране три
              колонки не сжимаются до читаемого, а страница не должна ездить. */}
          <div style={{ overflowX: 'auto', marginTop: 4 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 420, fontSize: 13 }}>
              <thead>
                <tr>
                  {['', rule.form, rule.versus.other].map((h, i) => (
                    <th key={i} style={{
                      textAlign: 'left', padding: '7px 10px', fontSize: 11.5, fontWeight: 800,
                      color: i === 1 ? accent : 'var(--color-muted)',
                      borderBottom: '1px solid var(--color-border-soft)', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rule.versus.rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px 10px', color: 'var(--color-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {t(r.point)}
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--color-text)', background: soft }}>{t(r.this)}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--color-text-2)' }}>{t(r.that)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Block>
      )}

      <section style={{
        display: 'flex', flexDirection: 'column', gap: 9,
        padding: 18, borderRadius: 16, background: soft,
      }}>
        <h4 style={{
          margin: 0, display: 'flex', alignItems: 'center', gap: 7,
          fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: accent,
        }}>
          <AlertTriangle size={13} /> {t('Запомнить')}
        </h4>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {rule.remember.map((r, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 9, fontSize: 14, fontWeight: 650, lineHeight: 1.5, color: 'var(--color-text)' }}>
              <Check size={13} style={{ color: accent, flexShrink: 0, transform: 'translateY(2px)' }} />
              <span style={proseWrap}>{bindShortWords(t(r))}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
