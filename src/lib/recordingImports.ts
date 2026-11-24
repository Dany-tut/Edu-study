// Автоимпорт записей уроков из папки Google/Яндекс Диска.
// Проект: design/recordings-import/README.md. Сервер — служба iskra-media-sync на
// VPS (docs/infra/media-sync/index.mjs): читает папку, копирует ролики в R2 и
// сама ставит ссылку в урок. Отсюда — только чтение статусов и подтверждения.
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

const MEDIA_SYNC = 'https://api.iskra-study.ru/media-sync'

export type RecordingStatus = 'proposed' | 'confirmed' | 'copying' | 'applied' | 'conflict' | 'failed' | 'skipped'
export type MatchKind = 'number' | 'title' | 'order' | 'manual'

export interface RecordingSource {
  id: string; module_id: string; provider: 'gdrive' | 'yadisk'; folder_url: string
  auto_sync: boolean; last_scan_at: string | null; last_error: string | null
}
export interface RecordingItem {
  id: string; source_id: string; lesson_id: string | null; lesson_short_id: string | null
  provider_file_id: string; file_name: string; size_bytes: number | null
  match_kind: MatchKind | null; status: RecordingStatus; error: string | null
  expected_old_url: string | null; media_url: string | null; updated_at: string
}
export interface ScannedFile {
  provider_file_id: string; file_name: string; size_bytes: number | null
  lesson_id: string | null; match_kind: MatchKind | null; duplicate: boolean; playable: boolean
}
export interface ModuleLesson { id: string; short_id: string; title: string; position: number; lesson_number: number | null; youtube_url: string | null; kind: string | null }
export interface ScanResult {
  provider: 'gdrive' | 'yadisk'; folder_ref: string; folder_url: string
  files: ScannedFile[]; known: number; lessons: ModuleLesson[]
}

async function callService<T>(path: string, body: unknown): Promise<T> {
  const token = (await supabase.auth.getSession()).data.session?.access_token
  if (!token) throw new Error('Войдите заново')
  let res: Response
  try {
    res = await fetch(`${MEDIA_SYNC}${path}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(90000),
    })
  } catch {
    throw new Error('Сервер записей не отвечает. Попробуйте ещё раз через минуту.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `Ошибка ${res.status}`)
  return data as T
}

export const scanFolder = (moduleId: string, url: string) => callService<ScanResult>('/scan', { module_id: moduleId, url })
export const kickSource = (sourceId: string) => callService<{ added: number }>('/kick', { source_id: sourceId })

export async function saveSourceAndConfirm(moduleId: string, scan: ScanResult, autoSync: boolean,
  rows: Array<{ file: ScannedFile; lessonId: string | null; replace: boolean }>) {
  const { data: sourceId, error } = await supabase.rpc('recording_source_upsert', {
    p_module_id: moduleId, p_provider: scan.provider, p_folder_url: scan.folder_url, p_folder_ref: scan.folder_ref, p_auto_sync: autoSync,
  })
  if (error) throw new Error(error.message)
  await confirmItems(sourceId as string, rows)
  return sourceId as string
}

export async function confirmItems(sourceId: string, rows: Array<{ file: Pick<ScannedFile, 'provider_file_id' | 'file_name' | 'size_bytes' | 'match_kind'>; lessonId: string | null; replace: boolean; manual?: boolean }>) {
  const { error } = await supabase.rpc('recording_import_confirm', {
    p_source_id: sourceId,
    p_items: rows.map(r => ({
      provider_file_id: r.file.provider_file_id, file_name: r.file.file_name, size_bytes: r.file.size_bytes,
      lesson_id: r.lessonId, match_kind: r.manual ? 'manual' : r.file.match_kind, replace_existing: r.replace,
    })),
  })
  if (error) throw new Error(error.message)
  // Разбудить очередь сразу, не ждать минутного цикла службы.
  void kickSource(sourceId).catch(() => {})
}

export async function revertItem(itemId: string) {
  const { data, error } = await supabase.rpc('recording_import_revert', { p_item_id: itemId })
  if (error) throw new Error(error.message)
  return data === true
}

const ACTIVE: RecordingStatus[] = ['confirmed', 'copying']

/** Папки и файлы записей для модулей курса. Пока что-то копируется — опрос раз в 10 с. */
export function useCourseRecordings(moduleIds: string[]) {
  const ids = moduleIds.filter(id => /^[0-9a-f-]{36}$/i.test(id)).sort()
  const key = ids.join(',')
  const [sources, setSources] = useState<Record<string, RecordingSource>>({})
  const [items, setItems] = useState<RecordingItem[]>([])
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])

  const refresh = useCallback(async () => {
    if (!key) { setSources({}); setItems([]); return }
    const { data: src } = await supabase.from('course_module_recording_sources')
      .select('id, module_id, provider, folder_url, auto_sync, last_scan_at, last_error').in('module_id', key.split(','))
    const list = (src ?? []) as RecordingSource[]
    let rows: RecordingItem[] = []
    if (list.length) {
      const { data } = await supabase.from('recording_import_items')
        .select('id, source_id, lesson_id, provider_file_id, file_name, size_bytes, match_kind, status, error, expected_old_url, media_url, updated_at, lessons(short_id)')
        .in('source_id', list.map(s => s.id)).order('file_name')
      rows = ((data ?? []) as unknown as Array<Omit<RecordingItem, 'lesson_short_id'> & { lessons?: { short_id: string } | { short_id: string }[] | null }>)
        .map(({ lessons, ...r }) => ({ ...r, lesson_short_id: (Array.isArray(lessons) ? lessons[0]?.short_id : lessons?.short_id) ?? null }))
    }
    if (!alive.current) return
    setSources(Object.fromEntries(list.map(s => [s.module_id, s])))
    setItems(rows)
  }, [key])

  useEffect(() => { void refresh() }, [refresh])
  const busy = items.some(i => ACTIVE.includes(i.status))
  useEffect(() => {
    if (!busy) return
    const timer = setInterval(() => { void refresh() }, 10000)
    return () => clearInterval(timer)
  }, [busy, refresh])

  return { sources, items, refresh, busy }
}

export const formatBytes = (n: number | null | undefined) => {
  if (!n) return ''
  return n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(1).replace('.', ',')} ГБ` : `${Math.max(1, Math.round(n / 1024 ** 2))} МБ`
}
