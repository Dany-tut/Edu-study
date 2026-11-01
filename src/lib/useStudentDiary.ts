import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { useStudentData } from '../store/studentDataStore'
import { getStudentSession } from './studentSession'
import { diaryDay, type DiaryMetadata } from './studentDiary'

// Main tasks are represented by one scalar, not by their questions, answers or images.
// Additional assignments retain their existing JSON source, reduced immediately to metadata.
const PROJECTION =
  'short_id,mainType:homework->hwTasks->0->>type,mainDate:homework->>hwDate,recordingType:homework->recHwTasks->0->>type,recordingDate:homework->>recHwDate,extras:homework->extraHw'
type Row = {
  short_id: string
  mainType: string | null
  mainDate: string | null
  recordingType: string | null
  recordingDate: string | null
  extras: { id: string; date?: string; tasks?: unknown[] }[] | null
}
export async function fetchDiaryMetadata(ids: string[], signal?: AbortSignal) {
  const chunks = Array.from({ length: Math.ceil(ids.length / 100) }, (_, i) =>
    ids.slice(i * 100, (i + 1) * 100),
  )
  const rows = await Promise.all(
    chunks.map(async (chunk) => {
      let query = supabase.from('lessons').select(PROJECTION).in('short_id', chunk)
      if (signal) query = query.abortSignal(signal)
      const { data, error } = await query
      if (error) throw error
      return data as unknown as Row[]
    }),
  )
  return new Map(
    rows.flat().map((row) => [
      row.short_id,
      {
        hasMain: !!row.mainType,
        mainDate: diaryDay(row.mainDate),
        hasRecording: !!row.recordingType,
        recordingDate: diaryDay(row.recordingDate),
        extras: (Array.isArray(row.extras) ? row.extras : []).flatMap((extra, index, all) =>
          extra?.id && extra.tasks?.length
            ? [{ id: extra.id, date: diaryDay(extra.date), index, total: all.length }]
            : [],
        ),
      } satisfies DiaryMetadata,
    ]),
  )
}
export function useStudentDiaryMetadata() {
  const subjects = useStudentData((s) => s.subjects),
    loaded = useStudentData((s) => s.loaded)
  const owner = getStudentSession()?.id ?? ''
  const scheduleRevision = useStudentData((s) => s.scheduleDays)
  const ids = [
    ...new Set(
      subjects.flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => l.id.replace(/~rec$/, '')))),
    ),
  ]
    .filter((id) => !id.startsWith('hw-'))
    .sort()
  const key = owner + ':' + ids.join(',')
  const [snapshot, setSnapshot] = useState<{
    key: string
    data: Map<string, DiaryMetadata>
    error: boolean
  } | null>(null)
  const [refresh, setRefresh] = useState(0)
  const idsRef = useRef(ids)
  idsRef.current = ids
  useEffect(() => {
    if (!loaded || !owner) return
    const controller = new AbortController()
    let current = true
    fetchDiaryMetadata(idsRef.current, controller.signal).then(
      (data) => {
        if (current) setSnapshot({ key, data, error: false })
      },
      () => {
        if (current)
          setSnapshot((previous) => ({
            key,
            data: previous?.key === key ? previous.data : new Map(),
            error: true,
          }))
      },
    )
    return () => {
      current = false
      controller.abort()
    }
  }, [key, loaded, owner, refresh, scheduleRevision])
  const fresh = snapshot?.key === key ? snapshot : null
  return {
    metadata: fresh?.data ?? new Map<string, DiaryMetadata>(),
    pending: !loaded || !fresh,
    error: fresh?.error ?? false,
    reload: () => setRefresh((n) => n + 1),
  }
}
