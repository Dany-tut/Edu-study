// Types for the vendored distortion-waves 0.1.0 (MIT © Jakub Antalik), only what Искра uses.

export type Rgb = [number, number, number]
export interface WavePaletteSpec { colors: Rgb[]; ahead: Rgb; behind: Rgb }
export type WaveType = 'vertical' | 'horizontal' | 'center'
export interface WaveRect { x: number; y: number; w: number; h: number }

export interface WaveOptions {
  revealed?: boolean
  type?: WaveType
  palette?: WavePaletteSpec | string
  waveStyle?: Partial<Record<string, number>>
  cornerRadius?: number
  reducedMotion?: 'system' | 'always' | 'never'
  prewarm?: boolean
  /** false — без снимков: только цвет и край поверх страницы. */
  capture?: boolean
  onFinish?: (revealed: boolean) => void
}

export class WaveController {
  constructor(root: HTMLElement, content: HTMLElement, revealed?: HTMLElement | null)
  update(options: WaveOptions): void
  play(options?: { source?: HTMLElement | WaveRect | null; focus?: { x: number; y: number } | null }): void
  reset(): void
  prepare(): Promise<void>
  destroy(): void
  readonly debug: { progress: number; running: boolean; mode: string | null; webgl: boolean; duration: number }
}

export const PALETTES: Record<'colorful' | 'green' | 'ocean' | 'sunset' | 'mono', WavePaletteSpec>
export function waveDuration(style: Record<string, number>): number
export function defaultWaveStyle(type: WaveType): Record<string, unknown>
