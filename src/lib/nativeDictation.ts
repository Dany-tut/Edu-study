// Диктовка в приложении Искры — системным распознаванием телефона
// (iOS: NativeDictationPlugin.swift на SFSpeechRecognizer, Android:
// NativeDictationPlugin.java на SpeechRecognizer). Бесплатно, без нашего
// сервера. В WKWebView айфона Web Speech нет, поэтому в приложении — только так.
//
// Айфон отдаёт и запись для учителя (тот же поток микрофона пишется в .m4a);
// Android — только текст: его распознаватель звук наружу не отдаёт.

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

interface NativeDictationPlugin {
  available(opts: { lang: string }): Promise<{ available: boolean }>
  start(opts: { lang: string; id: number; keep: boolean }): Promise<void>
  stop(): Promise<{ text: string; sec?: number; audio?: string; mime?: string }>
  cancel(): Promise<void>
  addListener(event: 'dictationText', cb: (d: { id: number; text: string }) => void): Promise<PluginListenerHandle>
  addListener(event: 'dictationLevel', cb: (d: { id: number; level: number }) => void): Promise<PluginListenerHandle>
  addListener(event: 'dictationEnd', cb: (d: { id: number; text: string }) => void): Promise<PluginListenerHandle>
}

const plugin = registerPlugin<NativeDictationPlugin>('NativeDictation')

/** В приложении (айфон, айпад, Android) с нашим модулем диктовки. */
export function hasNativeDictation(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('NativeDictation')
}

export interface NativeDictationResult {
  text: string
  sec: number
  audio: Blob | null
}

export interface NativeDictationSession {
  /** Запуск: отказ — нет доступа к микрофону/распознаванию. */
  ready: Promise<void>
  stop(): Promise<NativeDictationResult>
  cancel(): void
}

let seq = 0

export function startNativeDictation(
  lang: string, keep: boolean,
  on: { text: (t: string) => void; level: (l: number) => void; ended: () => void },
): NativeDictationSession {
  const id = ++seq
  const handles: Promise<PluginListenerHandle>[] = [
    plugin.addListener('dictationText', d => { if (d.id === id) on.text(d.text) }),
    plugin.addListener('dictationLevel', d => { if (d.id === id) on.level(d.level) }),
    plugin.addListener('dictationEnd', d => { if (d.id === id) on.ended() }),
  ]
  const off = () => { for (const h of handles) void h.then(x => x.remove()).catch(() => {}) }
  const ready = plugin.start({ lang, id, keep })
  ready.catch(off)
  return {
    ready,
    async stop() {
      try {
        const r = await plugin.stop()
        return { text: r.text ?? '', sec: r.sec ?? 1, audio: r.audio ? base64Blob(r.audio, r.mime ?? 'audio/mp4') : null }
      } finally { off() }
    },
    cancel() { off(); void plugin.cancel().catch(() => {}) },
  }
}

function base64Blob(b64: string, mime: string): Blob {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}
