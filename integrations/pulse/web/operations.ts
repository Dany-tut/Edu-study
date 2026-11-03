export interface OperationState { code: string; label: string; at: string }
export interface Operations {
  schema_version: 1; project: string; name: string; updated_at: string; last_checked_at: string | null;
  states: Record<'monitor' | 'telemetry' | 'incident' | 'hotfix' | 'release', OperationState>;
  history: Array<OperationState & { area: string }>;
}
export const AREA_LABELS = { monitor: 'Мониторинг', telemetry: 'Сбор событий', incident: 'Инцидент', hotfix: 'Исправление', release: 'Релиз' };
export function parseOperations(value: unknown, project = "iskra"): Operations {
  if (!value || typeof value !== 'object') throw Error('Некорректный формат статусов');
  const v = value as Operations;
  if (v.schema_version !== 1 || v.project !== project || !validDate(v.updated_at) || !v.states || !Array.isArray(v.history)) throw Error('Неизвестный формат статусов');
  for (const area of Object.keys(AREA_LABELS) as Array<keyof typeof AREA_LABELS>) {
    const row = v.states[area];
    if (!row || typeof row.code !== 'string' || typeof row.label !== 'string' || row.label.length > 180 || !validDate(row.at)) throw Error('Неполный статус');
  }
  if (v.last_checked_at !== null && !validDate(v.last_checked_at)) throw Error('Некорректное время проверки');
  if (v.history.length > 30 || v.history.some(e => !e || !Object.hasOwn(AREA_LABELS, e.area) || typeof e.label !== 'string' || e.label.length > 180 || !validDate(e.at))) throw Error('Некорректная история');
  return v;
}
function validDate(value: unknown) { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }
export function operationsStale(value: Operations, now = Date.now()) {
  return !value.last_checked_at || now - Date.parse(value.last_checked_at) > 15 * 60_000 || Date.parse(value.last_checked_at) > now + 60_000;
}

/** Independent server observation must never approve/release a local hotfix. */
export function mergeServerOperations(local: Operations | null, remote: Operations): Operations {
  return { ...remote, states: { ...remote.states,
    ...(local ? { telemetry: local.states.telemetry, hotfix: local.states.hotfix, release: local.states.release } : {}) },
    history: local?.history ?? [] };
}
export function serverOperationsUrl(): string | null {
  const value = import.meta.env.VITE_ISKRA_SERVER_MONITOR_URL;
  if (!value) return null;
  const url = new URL(value);
  // Aggregate only, fixed project/repo; never accept a destination from user logs.
  if (url.href !== 'https://raw.githubusercontent.com/Dany-tut/Edu-study/codex/monitor-status/iskra.json') throw Error('Неизвестный серверный источник Искры');
  return url.href;
}

export async function loadOperations(localUrl: string, project: string, signal: AbortSignal): Promise<Operations> {
  const remote = project === 'iskra' ? serverOperationsUrl() : null;
  const read = async (url: string) => {
    const r = await fetch(url, {cache: 'no-store', signal});
    if (!r.ok) throw Error('Источник статусов не ответил');
    return parseOperations(await r.json(), project);
  };
  if (!remote) return read(localUrl);
  const [local, server] = await Promise.allSettled([read(localUrl), read(`${remote}?t=${Date.now()}`)]);
  if (server.status === 'rejected') throw Error('Серверный монитор Искры не ответил');
  return mergeServerOperations(local.status === 'fulfilled' ? local.value : null, server.value);
}
