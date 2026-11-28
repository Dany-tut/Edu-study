// Ответ голосом в развёрнутом задании (extended + voiceInput). Концепт —
// Figma «Искра», стр. 29; решение Дани 28.11.2026.
//
// ЧТО ОТПРАВЛЯЕТСЯ. Текст. Ученик диктует, сказанное печатается в поле, он
// правит его как обычный ответ. Запись — лишь приложение для учителя: послушать,
// если расшифровка вышла странной. Поэтому клип хранит и то, что услышала
// распознавалка (`heard`): учитель видит, что сказано и что потом поправлено.
//
// ГДЕ ЛЕЖИТ. Приватный бакет homework-answer-files (как файлы ответа), а не
// task-media: тот читает любой вошедший, а голос ученика — его работа.
// Путь: <auth uid>/<students.id>/voice-<мс>-<uuid>.<ext>. Аудио-типы бакету
// разрешены миграцией 20261128002504.

import { supabase } from './supabase'
import { getSessionUser } from './owner'
import { personalDemoOwner } from './personalStudentDemo'
import { ANSWER_FILES_BUCKET, MAX_ANSWER_FILE_BYTES, answerFileUrl } from './answerFiles'

/** Одна надиктованная вставка. */
export interface AnswerVoiceClip {
  /** Ключ объекта в бакете (или `blob:` в демо). */
  path: string
  /** Длительность, секунды. */
  sec: number
  mime: string
  /** Что услышала распознавалка — до правок ученика. */
  heard: string
}

const EXT: Record<string, string> = {
  'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/aac': 'aac', 'audio/wav': 'wav',
}

/** Сколько вставок держим у одного ответа — дальше старые не прикладываем. */
export const MAX_VOICE_CLIPS = 10

export async function uploadAnswerVoice(blob: Blob, studentId: string, sec: number, heard: string): Promise<AnswerVoiceClip> {
  const mime = (blob.type || 'audio/webm').split(';')[0].trim().toLowerCase()
  if (blob.size > MAX_ANSWER_FILE_BYTES) throw new Error('voice too large')
  if (personalDemoOwner()) return { path: URL.createObjectURL(blob), sec, mime, heard }
  const uid = (await getSessionUser())?.id
  if (!uid) throw new Error('not authenticated')
  const path = `${uid}/${studentId}/voice-${Date.now()}-${crypto.randomUUID()}.${EXT[mime] ?? 'webm'}`
  const { error } = await supabase.storage.from(ANSWER_FILES_BUCKET).upload(path, blob, { contentType: mime, upsert: false })
  if (error) throw error
  return { path, sec, mime, heard }
}

/** Подписанная ссылка для <audio>. null — нет доступа или файла. */
export function answerVoiceUrl(clip: AnswerVoiceClip): Promise<string | null> {
  return answerFileUrl({ path: clip.path, name: 'voice', size: 0, mime: clip.mime }, false)
}

/** Разбор клипов из JSONB. Мусор отбрасываем. */
export function parseVoiceClips(raw: unknown): AnswerVoiceClip[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap(v => {
    if (!v || typeof v !== 'object') return []
    const c = v as Record<string, unknown>
    if (typeof c.path !== 'string' || !c.path) return []
    return [{
      path: c.path,
      sec: typeof c.sec === 'number' ? c.sec : 0,
      mime: typeof c.mime === 'string' ? c.mime : 'audio/webm',
      heard: typeof c.heard === 'string' ? c.heard : '',
    }]
  }).slice(0, MAX_VOICE_CLIPS)
}

/**
 * Причесать кусок, который отдала распознавалка: Web Speech пишет со строчной
 * и без точки в конце. Заглавная в начале и точка в конце — минимум, чтобы
 * вставка читалась предложением; запятые внутри ставит сама распознавалка
 * там, где умеет (Chrome — для английского), остальное правит ученик.
 */
export function tidyDictated(text: string): string {
  const s = text.replace(/\s+/g, ' ').trim()
  if (!s) return ''
  const first = s.charAt(0).toLocaleUpperCase() + s.slice(1)
  return /[.!?…]$/.test(first) ? first : `${first}.`
}

/** Приклеить вставку к уже написанному: через пробел, без двойных пробелов. */
export function joinDictated(base: string, piece: string): string {
  if (!piece) return base
  if (!base.trim()) return piece
  return /\s$/.test(base) ? `${base}${piece}` : `${base} ${piece}`
}

/** Язык распознавания: у языкового задания — его язык, иначе — язык интерфейса. */
export function dictationLang(questionLang: string | undefined, uiLang: string): string {
  const l = (questionLang || uiLang || 'ru').toLowerCase()
  if (l.includes('-')) return l
  const map: Record<string, string> = { ru: 'ru-RU', en: 'en-US', ko: 'ko-KR', ja: 'ja-JP', zh: 'zh-CN', pt: 'pt-BR', es: 'es-ES', de: 'de-DE', fr: 'fr-FR' }
  return map[l] ?? l
}
