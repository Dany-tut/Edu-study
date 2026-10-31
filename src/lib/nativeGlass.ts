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
import { useEffect } from 'react'
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

type AlertButton = { label: string; style?: 'default' | 'cancel' | 'destructive'; preferred?: boolean }
export type GlassMenuItem = { label: string; checked?: boolean; destructive?: boolean; disabled?: boolean; symbol?: string }
export type GlassTab = { id: string; title: string; symbol: string; badge?: number }

export type GlassHeader = { leading: string; leadingSymbol?: string; trailingText?: string; trailingSymbol?: string; onBack?: () => void; backLabel?: string }

interface NativeGlassPlugin {
  alert(o: { title?: string; message?: string; buttons: AlertButton[] }): Promise<{ index: number }>
  menu(o: { x: number; y: number; width: number; height: number; title?: string; items: GlassMenuItem[] }): Promise<{ index: number }>
  tabBarSet(o: { items: GlassTab[]; selected?: string; tint?: string }): Promise<void>
  tabBarHidden(o: { hidden: boolean }): Promise<void>
  tabBarRemove(): Promise<void>
  headerSet(o: Omit<GlassHeader, 'onBack'> & { back?: boolean }): Promise<void>
  headerHidden(o: { hidden: boolean }): Promise<void>
  headerRemove(): Promise<void>
  setAppearance(o: { dark: boolean }): Promise<void>
  addListener(e: 'tabSelect', fn: (d: { id: string }) => void): Promise<PluginListenerHandle>
  addListener(e: 'headerBack', fn: () => void): Promise<PluginListenerHandle>
}

const NativeGlass = registerPlugin<NativeGlassPlugin>('NativeGlass')

/** Системные контролы доступны: приложение на iOS. */
export const GLASS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'

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
const syncBar = () => {
  const hide = overlays > 0 || keyboard
  if (barShown) void NativeGlass.tabBarHidden({ hidden: hide }).catch(() => {})
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

export function setGlassTabs(items: GlassTab[], selected: string, tint?: string) {
  barShown = true
  void NativeGlass.tabBarSet({ items, selected, tint }).catch(() => {})
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
  const push = () => { void NativeGlass.setAppearance({ dark: root.getAttribute('data-theme') === 'dark' }).catch(() => {}) }
  push()
  new MutationObserver(push).observe(root, { attributes: true, attributeFilter: ['data-theme'] })
}
