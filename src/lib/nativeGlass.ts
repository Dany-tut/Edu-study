// ─────────────────────────────────────────────────────────────────────────────
// Системное стекло iOS в приложении
//
// В обёртке Capacitor (ios/) алерты, подтверждения, выпадающие списки и нижняя
// навигация рисуются системой — плагином ios/App/App/NativeGlassPlugin.swift:
// Liquid Glass на iOS 26, системные шрифт, хаптика и жесты. В браузере всё
// остаётся своим (ConfirmHost, TeacherSelect, MobileTeacherNav) — ни Safari,
// ни PWA до UIKit не дотягиваются.
//
// ПОЧЕМУ ВЫБОР В ОДНОМ МЕСТЕ. Веб-контролы уже собраны в узкие горла
// (confirmDialog/alertDialog, TeacherSelect, док), и подмена делается внутри
// них: вызывающему коду всё равно, кто нарисовал коробку.
//
// ТАБ-БАР НАД ВЕБОМ. Нативный бар лежит поверх WebView, и любая веб-шторка
// или окно оказались бы под ним. Поэтому шторки и окна отмечаются здесь
// (useNativeOverlay), и пока открыто хоть одно — или открыта клавиатура — бар
// уезжает вниз.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useId, useRef, useState } from 'react'
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

type AlertButton = { label: string; style?: 'default' | 'cancel' | 'destructive'; preferred?: boolean }
export type GlassMenuItem = { label: string; checked?: boolean; destructive?: boolean; disabled?: boolean; symbol?: string }
export type GlassTab = { id: string; title: string; symbol: string; badge?: number }

/** Пункт стеклянного бара экрана: круг с иконкой или таблетка с подписью.
 *  С `menu` — системное меню от кнопки (выбор приходит в onMenu). */
export type GlassBarItem = {
  id: string
  kind: 'circle' | 'pill'
  title?: string
  symbol?: string
  label?: string
  active?: boolean
  unread?: boolean
  passive?: boolean
  position?: 'leading' | 'center' | 'trailing'
  menuTitle?: string
  menu?: { value: string; title: string; checked?: boolean }[]
}
/** Бар экрана: таблетка по центру сверху и ряд над вкладками. */
export type GlassBar = {
  top?: GlassBarItem | GlassBarItem[]
  bottom?: GlassBarItem[]
  bottomTabBarWidthRatio?: number
  bottomTabBarSideInset?: number
  expandingSections?: { trigger: string; selected: string; items: GlassTab[] }
}

export type GlassHeader = { leading: string; leadingSymbol?: string; trailingText?: string; trailingSymbol?: string; onBack?: () => void; backLabel?: string }

export type GlassSheetRow = {
  id: string
  title: string
  detail?: string
  caption?: string
  checked?: boolean
  unread?: boolean
  disclosure?: boolean
}
export type GlassSheetContent = {
  title: string
  empty?: string
  glass?: boolean
  sections: { title?: string; layout?: 'segments' | 'actions'; rows: GlassSheetRow[] }[]
  footer?: GlassSheetRow
}

interface NativeGlassPlugin {
  alert(o: { title?: string; message?: string; buttons: AlertButton[] }): Promise<{ index: number }>
  menu(o: { x: number; y: number; width: number; height: number; title?: string; items: GlassMenuItem[] }): Promise<{ index: number }>
  tabBarSet(o: { items: GlassTab[]; selected?: string; tint?: string; compact?: boolean }): Promise<void>
  tabBarHidden(o: { hidden: boolean }): Promise<void>
  tabBarRemove(): Promise<void>
  headerSet(o: Omit<GlassHeader, 'onBack'> & { back?: boolean }): Promise<void>
  headerHidden(o: { hidden: boolean }): Promise<void>
  headerRemove(): Promise<void>
  setAppearance(o: { dark: boolean; background: string }): Promise<void>
  barSet(o: GlassBar): Promise<void>
  barHidden(o: { top: boolean; bottom: boolean }): Promise<void>
  barRemove(): Promise<void>
  lockMfaScroll(o: { locked: boolean }): Promise<void>
  documentScrollEdges(o: { enabled: boolean }): Promise<{ enabled: boolean }>
  sheetShow(o: GlassSheetContent & { id: string }): Promise<void>
  sheetClose(o: { id: string }): Promise<void>
  addListener(e: 'sheetAction', fn: (d: { id: string; action: string }) => void): Promise<PluginListenerHandle>
  addListener(e: 'sheetDismiss', fn: (d: { id: string }) => void): Promise<PluginListenerHandle>
  addListener(e: 'barTap', fn: (d: { id: string }) => void): Promise<PluginListenerHandle>
  addListener(e: 'barMenu', fn: (d: { id: string; value: string }) => void): Promise<PluginListenerHandle>
  addListener(e: 'tabSelect', fn: (d: { id: string }) => void): Promise<PluginListenerHandle>
  addListener(e: 'headerBack', fn: () => void): Promise<PluginListenerHandle>
}

const NativeGlass = registerPlugin<NativeGlassPlugin>('NativeGlass')

/** Системные контролы доступны: приложение на iOS. */
export const GLASS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'

export function lockNativeMfaScroll(locked: boolean) {
  // Older native shells do not expose this method and retain the CSS lock.
  void NativeGlass.lockMfaScroll({ locked }).catch(() => undefined)
}

export function useNativeDocumentScroll(enabled: boolean) {
  const [active, setActive] = useState(false)
  useEffect(() => {
    if (!enabled || !GLASS) return
    let current = true
    void NativeGlass.documentScrollEdges({ enabled: true }).then(result => {
      if (current) setActive(result.enabled)
    }).catch(() => { /* Older app builds keep the existing scroll container. */ })
    return () => {
      current = false
      void NativeGlass.documentScrollEdges({ enabled: false }).catch(() => undefined)
    }
  }, [enabled])
  return enabled && active
}

/** The web fallback is shown only when the iOS sheet is unavailable. */
export function useGlassSheet(open: boolean, content: GlassSheetContent, onAction: (id: string) => void, onClose: () => void) {
  const id = useId()
  const [failed, setFailed] = useState(false)
  const callbacks = useRef({ onAction, onClose })
  callbacks.current = { onAction, onClose }
  const payload = JSON.stringify({ ...content, id })
  const latestPayload = useRef(payload)
  latestPayload.current = payload
  const active = useRef(false)

  useEffect(() => {
    if (!open || !GLASS || failed) return
    let disposed = false
    const action = NativeGlass.addListener('sheetAction', event => {
      if (event.id === id) callbacks.current.onAction(event.action)
    })
    const dismiss = NativeGlass.addListener('sheetDismiss', event => {
      if (event.id === id) callbacks.current.onClose()
    })
    void Promise.all([action, dismiss]).then(() => {
      if (disposed) return
      active.current = true
      return NativeGlass.sheetShow(JSON.parse(latestPayload.current))
    }).catch(() => { if (!disposed) setFailed(true) })
    return () => {
      disposed = true
      active.current = false
      void action.then(listener => listener.remove()).catch(() => {})
      void dismiss.then(listener => listener.remove()).catch(() => {})
      void NativeGlass.sheetClose({ id }).catch(() => {})
    }
  }, [open, failed, id])

  useEffect(() => {
    if (active.current) void NativeGlass.sheetShow(JSON.parse(payload)).catch(() => {})
  }, [payload])

  return open && (!GLASS || failed)
}

// ── алерт и подтверждение ────────────────────────────────────────────────────
// По одному: UIKit молча не покажет второй алерт поверх первого, и его
// обещание не закрылось бы никогда.
let alertChain: Promise<unknown> = Promise.resolve()
function queueAlert(o: Parameters<NativeGlassPlugin['alert']>[0]): Promise<{ index: number }> {
  const next = alertChain.then(() => NativeGlass.alert(o)).catch(() => ({ index: -1 }))
  alertChain = next
  return next
}

export async function glassAlert(title: string, message?: string, label = 'OK'): Promise<void> {
  await queueAlert({ title, message, buttons: [{ label, style: 'cancel' }] })
}

/** true — нажали подтверждение. «Отмена» система ставит на своё место сама. */
export async function glassConfirm(o: { title: string; message?: string; confirmLabel: string; cancelLabel: string; danger?: boolean }): Promise<boolean> {
  const r = await queueAlert({
    title: o.title, message: o.message,
    buttons: [
      { label: o.cancelLabel, style: 'cancel' },
      { label: o.confirmLabel, style: o.danger ? 'destructive' : 'default', preferred: !o.danger },
    ],
  })
  return r.index === 1
}

// ── меню ─────────────────────────────────────────────────────────────────────

/** Системное меню у элемента. Номер выбранного пункта или -1. */
export async function glassMenu(anchor: Element, items: GlassMenuItem[], title?: string): Promise<number> {
  const r = anchor.getBoundingClientRect()
  const res = await NativeGlass.menu({ x: r.left, y: r.top, width: r.width, height: r.height, title, items }).catch(() => ({ index: -1 }))
  return res.index
}

// ── таб-бар ──────────────────────────────────────────────────────────────────

let overlays = 0
let keyboard = false
let barShown = false
let headerShown = false
let screenBarShown = false
let screenBarBottomHidden = false
const syncBar = () => {
  const hide = overlays > 0 || keyboard
  if (barShown) void NativeGlass.tabBarHidden({ hidden: hide }).catch(() => {})
  // Бар экрана: верх — как шапка (только под шторкой/окном), низ — как вкладки
  // (и под клавиатурой), плюс по просьбе экрана (поиск открыт вместо ряда).
  if (screenBarShown) void NativeGlass.barHidden({ top: overlays > 0, bottom: hide || screenBarBottomHidden }).catch(() => {})
  // Шапка прячется под шторкой/окном (она плавает над WebView и легла бы
  // поверх затемнения), но НЕ под клавиатурой — она вверху, не мешает.
  if (headerShown) void NativeGlass.headerHidden({ hidden: overlays > 0 }).catch(() => {})
}

/** Веб-шторка или окно открыто: нативный бар не должен лежать поверх. */
export function useNativeOverlay(open: boolean) {
  useEffect(() => {
    if (!GLASS || !open) return
    overlays++
    syncBar()
    return () => { overlays = Math.max(0, overlays - 1); syncBar() }
  }, [open])
}

export function setGlassKeyboard(open: boolean) {
  if (keyboard === open) return
  keyboard = open
  syncBar()
}

export function setGlassTabs(items: GlassTab[], selected: string, tint?: string, compact?: boolean) {
  barShown = true
  void NativeGlass.tabBarSet({ items, selected, tint, compact }).catch(() => {})
  syncBar()
}

export function removeGlassTabs() {
  barShown = false
  void NativeGlass.tabBarRemove().catch(() => {})
}

export function onGlassTab(fn: (id: string) => void): () => void {
  const h = NativeGlass.addListener('tabSelect', d => fn(d.id))
  return () => { void h.then(x => x.remove()) }
}

// ── верхняя шапка ──────────────────────────────────────────────────────────────

export function setGlassHeader(h: GlassHeader) {
  headerShown = true
  const { onBack, ...header } = h
  void NativeGlass.headerSet({ ...header, back: !!onBack }).catch(() => {})
  syncBar()
}

export function onGlassHeaderBack(fn: () => void): () => void {
  const h = NativeGlass.addListener('headerBack', fn)
  return () => { void h.then(x => x.remove()) }
}

export function removeGlassHeader() {
  headerShown = false
  void NativeGlass.headerRemove().catch(() => {})
}

// ── тема ─────────────────────────────────────────────────────────────────────
// Тема кабинета своя (themeStore, data-theme), а системные контролы смотрят на
// тему окна. Окно подстраиваем под кабинет, иначе в тёмном кабинете выезжали бы
// светлые меню и алерты.
if (GLASS && typeof document !== 'undefined') {
  const root = document.documentElement
  const push = () => {
    const background = getComputedStyle(root).getPropertyValue('--color-bg').trim()
    void NativeGlass.setAppearance({ dark: root.getAttribute('data-theme') === 'dark', background }).catch(() => {})
  }
  push()
  new MutationObserver(push).observe(root, { attributes: true, attributeFilter: ['data-theme'] })
}

// ── стеклянный бар экрана (ученик, iPhone) ───────────────────────────────────
//
// Органы управления экраном — нативными кнопками Liquid Glass: таблетка сверху
// (переключатель курса и т. п.) и ряд над вкладками (поиск, модуль, фильтры).
// Пока бар стоит, на <html> висят --glass-top-pad / --glass-bottom-pad: отступы
// контента и высота мягкого края (WindowSoftEdges) учитывают кнопки.

/** Поставить бар, пока экран смонтирован. `hideBottom` — убрать нижний ряд
 *  (например, открыт веб-поиск на его месте). Обработчики читаются по ref. */
export function useGlassBar(
  bar: GlassBar | null,
  handlers: { onTap?: (id: string) => void; onMenu?: (id: string, value: string) => void },
  hideBottom = false,
) {
  const ref = useRef(handlers)
  ref.current = handlers
  const json = bar ? JSON.stringify(bar) : ''
  useEffect(() => {
    if (!GLASS) return
    if (!json) {
      // Экран больше не просит бар (например, спрятан под открытым уроком) —
      // снимаем, иначе кнопки остались бы поверх чужого экрана.
      if (screenBarShown) removeScreenBar()
      return
    }
    const parsed = JSON.parse(json) as GlassBar
    screenBarShown = true
    void NativeGlass.barSet(parsed).catch(() => {})
    syncBar()
    const root = document.documentElement
    root.style.setProperty('--glass-top-pad', parsed.top ? '76px' : '20px')
    root.style.setProperty('--glass-bottom-pad', parsed.bottom?.length ? '58px' : '0px')
  }, [json])
  useEffect(() => {
    if (!GLASS) return
    screenBarBottomHidden = hideBottom
    syncBar()
  }, [hideBottom])
  useEffect(() => {
    if (!GLASS || !json) return
    const tap = NativeGlass.addListener('barTap', d => ref.current.onTap?.(d.id))
    const menu = NativeGlass.addListener('barMenu', d => ref.current.onMenu?.(d.id, d.value))
    return () => { void tap.then(x => x.remove()); void menu.then(x => x.remove()) }
  }, [!!json])
  useEffect(() => () => { if (GLASS && screenBarShown) removeScreenBar() }, [])
}

function removeScreenBar() {
  screenBarShown = false
  screenBarBottomHidden = false
  void NativeGlass.barRemove().catch(() => {})
  const root = document.documentElement
  root.style.removeProperty('--glass-top-pad')
  root.style.removeProperty('--glass-bottom-pad')
}
