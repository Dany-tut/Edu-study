// ─── Редакторы новых типов заданий ───────────────────────────────────────────
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ. Задание собирается в ДВУХ местах — в редакторе курса и
// на странице «Домашки», — и раньше каждый тип писался в обеих страницах
// заново. Расхождения появлялись молча: в одном месте у пары была картинка, в
// другом нет; в одном подсказка про «не указано» была, в другом её забыли.
// Четыре типа, добавленные последними, живут здесь и подключаются одной
// строкой в обе страницы.
//
// Стили полей нарочно свои, а не пришедшие пропсами: редактор должен выглядеть
// одинаково на обеих страницах, а не подстраиваться под каждую.

import { Check, Plus, X } from 'lucide-react'
import GrowTextarea from '../GrowTextarea'
import { alertDialog } from '../ConfirmHost'
import {
  gapTextParts,
  type GapChoice, type SortItem, type TfStatement, type TfVerdict,
} from '../../data/taskTypes'

/**
 * Поля, которые правит этот редактор.
 *
 * ЗАЧЕМ СВОЙ ИНТЕРФЕЙС, А НЕ TaskPayload. Две страницы держат задание разными
 * типами: у редактора курса это HWTask с обязательными label и isHard, у
 * «Домашек» — своя запись без них. Общего типа нет, а нужны отсюда ровно эти
 * поля — их и требуем.
 */
export interface ExtraTaskFields {
  type: string
  passage?: string
  statements?: TfStatement[]
  gapText?: string
  gapChoices?: GapChoice[]
  columns?: string[]
  sortItems?: SortItem[]
  embedUrl?: string
}
import { parseEmbed, EMBED_HOST_LABELS } from '../../lib/embed'
import { useT } from '../../lib/i18n'

/** Цвета типа (из реестра): по ним красятся выбранный вердикт и корзина. */
export interface EditorAccent { color: string; bg: string; fill: string }

const fieldSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '8px 11px', borderRadius: 10,
  border: '1.5px solid var(--color-border-soft)', background: 'var(--color-bg-input)',
  fontSize: 13, lineHeight: 1.45, color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit',
}

function AutoTextarea({ style, ...rest }: React.ComponentProps<typeof GrowTextarea>) {
  return <GrowTextarea {...rest} style={{ ...fieldSt, ...style }} />
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--color-text-3)' }}>
      {children}
    </div>
  )
}

/**
 * Редакторы «верно/неверно», пропусков со списками, раскладки по столбцам и
 * внешнего упражнения. Для остальных типов рисует пустоту — вызывать можно
 * безусловно.
 */
export default function ExtraTaskEditors<T extends ExtraTaskFields>({ task, onUpdate, accent, withPassage = false }: {
  // Обобщённый тип, а не TaskPayload: страницы держат задание своими типами
  // (HWTask у редактора курса), и обновление обязано возвращать ровно его —
  // иначе поля, которых нет в TaskPayload, потерялись бы на первой же правке.
  task: T
  onUpdate: (next: T) => void
  accent: EditorAccent
  /**
   * Показывать ли поле отрывка прямо здесь.
   *
   * В редакторе курса отрывок для чтения — общее поле задания (оно нужно и
   * вопросам по тексту), и второе такое же было бы дублем. На странице
   * «Домашки» этого поля нет вовсе, и без него утверждения не с чем сверять.
   */
  withPassage?: boolean
}) {
  const t = useT()
  return (
    <>
              {/* trueFalse — утверждения к тексту. Сам текст берётся из
                  «отрывка для чтения» ниже: это то же поле passage, что у
                  вопросов по тексту, — второго места для текста заводить не
                  надо. */}
              {task.type === 'trueFalse' && (() => {
                const rows = task.statements ?? []
                const setRows = (next: typeof rows) => onUpdate({ ...task, statements: next })
                const CAPS: Array<{ v: TfVerdict; label: string }> = [
                  { v: 'T', label: 'Верно' },
                  { v: 'F', label: 'Неверно' },
                  { v: 'NG', label: 'Не указано' },
                ]
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {withPassage && (
                      <>
                        <Label>{t('Отрывок для чтения')}</Label>
                        <AutoTextarea
                          value={task.passage ?? ''}
                          onChange={v => onUpdate({ ...task, passage: v })}
                          placeholder={t('Текст, по которому проверяются утверждения')}
                          style={{ minHeight: 80 }}
                        />
                      </>
                    )}
                    <Label>{t('Утверждения и верный вердикт каждого')}</Label>
                    {rows.map((row, ri) => {
                      const patch = (next: Partial<typeof row>) =>
                        setRows(rows.map((x, k) => k === ri ? { ...x, ...next } : x))
                      return (
                        <div key={ri} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ width: 24, height: 24, marginTop: 5, borderRadius: 8, flexShrink: 0, background: accent.bg, color: accent.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{ri + 1}</span>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <AutoTextarea
                              value={row.text}
                              onChange={v => patch({ text: v })}
                              placeholder={t('Утверждение по тексту')}
                              style={fieldSt}
                            />
                            <div style={{ display: 'flex', gap: 5 }}>
                              {CAPS.map(c => (
                                <button
                                  key={c.v}
                                  onClick={() => patch({ verdict: c.v })}
                                  style={{
                                    padding: '5px 11px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                                    fontSize: 11.5, fontWeight: 700,
                                    border: `1.5px solid ${row.verdict === c.v ? accent.color : 'var(--color-border-medium)'}`,
                                    background: row.verdict === c.v ? accent.bg : 'var(--color-bg-2)',
                                    color: row.verdict === c.v ? accent.color : 'var(--color-text-3)',
                                  }}
                                >
                                  {t(c.label)}
                                </button>
                              ))}
                            </div>
                          </div>
                          {rows.length > 1 && (
                            <button
                              onClick={() => setRows(rows.filter((_, k) => k !== ri))}
                              style={{ width: 24, height: 24, marginTop: 5, borderRadius: 6, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}
                            >
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                    <button
                      onClick={() => setRows([...rows, { text: '', verdict: 'T' }])}
                      style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', fontSize: 12, color: 'var(--color-muted)', fontFamily: 'inherit' }}
                    >
                      <Plus size={12} /> {t('Добавить утверждение')}
                    </button>
                    <div style={{ fontSize: 11, color: (task.passage ?? '').trim() ? 'var(--color-text-3)' : 'var(--color-red-text)' }}>
                      {(task.passage ?? '').trim()
                        ? t('«Не указано» — про то, чего в тексте нет. Пусть хотя бы одно утверждение будет таким: иначе это выбор из двух, то есть монетка.')
                        : t('Текст не задан — добавьте отрывок для чтения, иначе утверждения не с чем сверять.')}
                    </div>
                  </div>
                )
              })()}

              {/* dropdownGap — предложение с «____» и свой список на каждый пропуск. */}
              {task.type === 'dropdownGap' && (() => {
                const text = task.gapText ?? ''
                const gaps = task.gapChoices ?? []
                const holes = Math.max(0, gapTextParts(text).length - 1)
                const setGaps = (next: typeof gaps) => onUpdate({ ...task, gapChoices: next })
                // Списков ровно столько, сколько «____» в строке: лишние молча
                // не показались бы ученику, недостающие оставили бы пропуск без
                // вариантов. Поэтому длину подгоняем сразу при правке текста.
                const fit = (n: number) => {
                  const next = [...gaps]
                  while (next.length < n) next.push({ options: ['', ''], correct: 0 })
                  return next.slice(0, n)
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Label>{t('Предложение — места пропусков отметьте «____»')}</Label>
                    <AutoTextarea
                      value={text}
                      onChange={v => onUpdate({ ...task, gapText: v, gapChoices: fit(Math.max(0, gapTextParts(v).length - 1)) })}
                      placeholder={t('She ____ to school and ____ English.')}
                      style={fieldSt}
                    />
                    {gaps.map((gap, gi) => {
                      const patch = (next: Partial<typeof gap>) =>
                        setGaps(gaps.map((x, k) => k === gi ? { ...x, ...next } : x))
                      return (
                        <div key={gi} style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '8px 10px', borderRadius: 12, background: 'var(--color-bg-2)' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)' }}>
                            {t('Пропуск')} {gi + 1}
                          </div>
                          {gap.options.map((opt, oi) => (
                            <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button
                                onClick={() => patch({ correct: oi })}
                                title={t('Верный вариант')}
                                style={{
                                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                                  border: `1.5px solid ${gap.correct === oi ? accent.color : 'var(--color-border-medium)'}`,
                                  background: gap.correct === oi ? accent.fill : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                                }}
                              >
                                {gap.correct === oi && <Check size={11} />}
                              </button>
                              <AutoTextarea
                                value={opt}
                                onChange={v => patch({ options: gap.options.map((x, k) => k === oi ? v : x) })}
                                placeholder={`${t('Вариант')} ${oi + 1}`}
                                style={{ ...fieldSt, flex: 1 }}
                              />
                              {gap.options.length > 2 && (
                                <button
                                  onClick={() => patch({
                                    options: gap.options.filter((_, k) => k !== oi),
                                    correct: gap.correct > oi ? gap.correct - 1 : Math.min(gap.correct, gap.options.length - 2),
                                  })}
                                  style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}
                                >
                                  <X size={11} />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => patch({ options: [...gap.options, ''] })}
                            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 8, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', fontSize: 11.5, color: 'var(--color-muted)', fontFamily: 'inherit' }}
                          >
                            <Plus size={11} /> {t('Вариант')}
                          </button>
                        </div>
                      )
                    })}
                    <div style={{ fontSize: 11, color: holes > 0 ? 'var(--color-text-3)' : 'var(--color-red-text)' }}>
                      {holes > 0
                        ? t('Обманки берите из соседних форм: список, где верен единственный похожий вариант, ученик проходит не читая.')
                        : t('В предложении нет «____» — отметьте хотя бы один пропуск.')}
                    </div>
                  </div>
                )
              })()}

              {/* columnSort — корзины и то, что по ним раскладывают. */}
              {task.type === 'columnSort' && (() => {
                const cols = task.columns ?? []
                const items = task.sortItems ?? []
                const named = cols.filter(c => c.trim())
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Label>{t('Столбцы — по какому признаку раскладываем')}</Label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {cols.map((col, ci) => (
                        <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AutoTextarea
                            value={col}
                            onChange={v => onUpdate({ ...task, columns: cols.map((x, k) => k === ci ? v : x) })}
                            placeholder={`${t('Столбец')} ${ci + 1}`}
                            style={{ ...fieldSt, width: 116 }}
                          />
                          {cols.length > 2 && (
                            <button
                              onClick={() => onUpdate({
                                ...task,
                                columns: cols.filter((_, k) => k !== ci),
                                // Предметы из удалённого столбца переезжают в первый:
                                // ссылка на несуществующую корзину сделала бы задание
                                // непроходимым, а молча потерять предмет ещё хуже.
                                sortItems: items.map(it => ({
                                  ...it,
                                  column: it.column === ci ? 0 : it.column > ci ? it.column - 1 : it.column,
                                })),
                              })}
                              style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}
                            >
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      ))}
                      {cols.length < 4 && (
                        <button
                          onClick={() => onUpdate({ ...task, columns: [...cols, ''] })}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', fontSize: 12, color: 'var(--color-muted)', fontFamily: 'inherit' }}
                        >
                          <Plus size={12} /> {t('Столбец')}
                        </button>
                      )}
                    </div>

                    <Label>{t('Что раскладываем')}</Label>
                    {items.map((item, ii) => (
                      <div key={ii} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <AutoTextarea
                          value={item.text}
                          onChange={v => onUpdate({ ...task, sortItems: items.map((x, k) => k === ii ? { ...x, text: v } : x) })}
                          placeholder={t('Слово или пример')}
                          style={{ ...fieldSt, flex: 1 }}
                        />
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          {cols.map((col, ci) => (
                            <button
                              key={ci}
                              onClick={() => onUpdate({ ...task, sortItems: items.map((x, k) => k === ii ? { ...x, column: ci } : x) })}
                              style={{
                                padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                                fontSize: 11.5, fontWeight: 700, maxWidth: 92, overflow: 'hidden',
                                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                border: `1.5px solid ${item.column === ci ? accent.color : 'var(--color-border-medium)'}`,
                                background: item.column === ci ? accent.bg : 'var(--color-bg-2)',
                                color: item.column === ci ? accent.color : 'var(--color-text-3)',
                              }}
                            >
                              {col.trim() || ci + 1}
                            </button>
                          ))}
                        </div>
                        {items.length > 1 && (
                          <button
                            onClick={() => onUpdate({ ...task, sortItems: items.filter((_, k) => k !== ii) })}
                            style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => onUpdate({ ...task, sortItems: [...items, { text: '', column: 0 }] })}
                      style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', fontSize: 12, color: 'var(--color-muted)', fontFamily: 'inherit' }}
                    >
                      <Plus size={12} /> {t('Добавить предмет')}
                    </button>
                    <div style={{ fontSize: 11, color: named.length >= 2 ? 'var(--color-text-3)' : 'var(--color-red-text)' }}>
                      {named.length >= 2
                        ? t('Признак читается по корзинам: подписывайте их так, как ученик о них думает, — «der», а не «мужской род 1».')
                        : t('Нужно хотя бы два подписанных столбца — иначе раскладывать не по чему.')}
                    </div>
                  </div>
                )
              })()}

              {/* embed — чужое упражнение. */}
              {task.type === 'embed' && (() => {
                const target = parseEmbed(task.embedUrl)
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Label>{t('Ссылка на упражнение')}</Label>
                    <AutoTextarea
                      value={task.embedUrl ?? ''}
                      onChange={v => onUpdate({ ...task, embedUrl: v.trim() })}
                      placeholder={t('https://wordwall.net/resource/…')}
                      style={fieldSt}
                    />
                    <div style={{ fontSize: 11, lineHeight: 1.45, color: target ? 'var(--color-text-3)' : 'var(--color-red-text)' }}>
                      {!task.embedUrl?.trim()
                        ? t('Вставьте ссылку — без неё ученику нечего открыть.')
                        : !target
                          ? t('Это не похоже на адрес. Нужна полная ссылка, начиная с https://')
                          : target.kind === 'frame'
                            ? `${t('Откроется прямо в задании')} · ${target.label}`
                            : `${t('Площадка не из списка встраиваемых — откроется кнопкой в новой вкладке')} · ${target.label}`}
                    </div>
                    <div style={{ fontSize: 11, lineHeight: 1.45, color: 'var(--color-text-3)' }}>
                      {t('В рамке открываются')}: {EMBED_HOST_LABELS.join(', ')}. {t('Результат с чужой площадки к нам не приходит — задание засчитывается по отметке ученика, как просмотр видео.')}
                    </div>
                  </div>
                )
              })()}

    </>
  )
}
