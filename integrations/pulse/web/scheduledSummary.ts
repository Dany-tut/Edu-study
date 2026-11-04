import type { Operations, OperationState } from './operations';

export const SUMMARY_URL = 'https://igsdwvwiqnozgwczzycx.supabase.co/rest/v1/rpc/iskra_monitor_summary';
const date = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));
export function summaryConfig(url?: string, key?: string) {
  if (!url && !key) return null;
  if (url !== SUMMARY_URL || !key?.startsWith('sb_publishable_')) throw Error('Некорректная настройка серверной сводки Искры');
  return { url, key };
}

/** Construct fixed public text only. Never forward arbitrary RPC fields. */
export function scheduledOperations(value: unknown, external: Operations | null, now = Date.now()): Operations {
  const v = value as Record<string, unknown> | null;
  if (!v || v.schema_version !== 1 || v.project !== 'iskra' || !date(v.checked_at) || typeof v.capture_error !== 'boolean'
    || !Number.isSafeInteger(v.open_signals) || Number(v.open_signals) < 0) throw Error('Некорректная серверная сводка Искры');
  const at = v.checked_at;
  const fresh = now - Date.parse(at) >= -60_000 && now - Date.parse(at) < 180_000;
  const observing = fresh && !v.capture_error;
  const state = (code: string, label: string): OperationState => ({ code, label, at });
  const externalFresh = external?.last_checked_at && now - Date.parse(external.last_checked_at) >= -60_000
    && now - Date.parse(external.last_checked_at) < 15 * 60_000;
  const externalOk = !!externalFresh && external?.states.monitor.code === 'observing';
  return {
    schema_version: 1, project: 'iskra', name: 'Искра', updated_at: at,
    last_checked_at: at, summary_source: 'scheduled_database',
    external_probe: {
      code: externalOk ? 'observing' : 'unknown',
      label: externalOk ? 'Внешняя проверка приложения подтверждена' : 'Свежая внешняя проверка приложения не подтверждена',
      at: external?.states.monitor.at ?? at, last_checked_at: external?.last_checked_at ?? null,
    },
    states: {
      monitor: state(observing ? 'observing' : 'error', observing ? 'Серверный сбор отвечает' : 'Серверный сбор не подтверждён'),
      telemetry: state('unknown', 'Покрытие проверяется отдельно от доступности'),
      incident: state(Number(v.open_signals) > 0 ? 'detected' : 'unknown', Number(v.open_signals) > 0 ? 'Есть сигналы для разбора' : 'Подтверждённого вывода о сбоях нет'),
      hotfix: state('none', 'Исправления требуют отдельного разбора'),
      release: state('not_started', 'Источник не управляет выпуском'),
    }, history: [],
  };
}
