import { useEffect, useState } from 'react';
import { Alert } from './Alert';
import { AREA_LABELS, operationsStale, loadOperations } from '../lib/operations';
import type { Operations } from '../lib/operations';

export function IskraOperations({ project = "iskra", name = "Искра" }: { project?: "iskra" | "taskly"; name?: string }) {
  const [data, setData] = useState<Operations | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let disposed = false;
    let active: AbortController | null = null;
    const load = async () => {
      if (active) return;
      const controller = new AbortController(); active = controller;
      const timeout = window.setTimeout(() => controller.abort(), 10_000);
      try {
        const parsed = await loadOperations(`${import.meta.env.BASE_URL}operations/${project}.json?t=${Date.now()}`, project, controller.signal);
        if (!disposed) { setData(parsed); setError(''); }
      } catch (e) { if (!disposed) setError(e instanceof Error && e.name !== 'AbortError' ? e.message : 'Источник статусов не ответил'); }
      finally { window.clearTimeout(timeout); active = null; if (!disposed) { setLoading(false); setNow(Date.now()); } }
    };
    void load();
    const timer = window.setInterval(() => { setNow(Date.now()); void load(); }, 5000);
    return () => { disposed = true; window.clearInterval(timer); active?.abort(); };
  }, [refresh, project, name]);
  const stale = data ? operationsStale(data, now) : true;
  const date = (at: string) => new Date(at).toLocaleString('ru-RU');
  return <section className="section" aria-label={`Состояние ${name}`}>
    <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
      <h2 className="section__title" style={{ margin: 0 }}>{name} · инциденты и выпуск</h2>
      <button type="button" className="btn pressable" style={{ minHeight: 'var(--control-h-lg)' }} onClick={() => setRefresh(v => v + 1)}>Обновить статусы</button>
    </div>
    {loading && !data && <p role="status">Подключаем источник Искры…</p>}
    {error && <Alert tone="warning" title={error}>Последний полученный снимок, если он есть, сохранён ниже. Свежесть мониторинга не подтверждена.</Alert>}
    {data && <>
      <Alert tone={stale || !!error || data.states.monitor.code !== 'observing' ? 'warning' : 'info'} title={stale || !!error || data.states.monitor.code !== 'observing' ? 'Состояние пользователей не подтверждено' : 'Источник мониторинга отвечает'}>
        Последняя успешная проверка журнала: {data.last_checked_at ? date(data.last_checked_at) : 'ещё не выполнена'}. Статусы обновлены: {date(data.updated_at)}.
      </Alert>
      {data.external_probe && <Alert tone={data.external_probe.code === 'observing' ? 'info' : 'warning'} title={data.external_probe.label}>
        Последняя внешняя проверка: {data.external_probe.last_checked_at ? date(data.external_probe.last_checked_at) : 'ещё не выполнена'}. Это отдельная проверка доступности приложения; ответ серверного сбора её не заменяет.
      </Alert>}
      <div className="grid grid--mid" style={{ marginTop: 'var(--space-4)' }}>
        {(Object.keys(AREA_LABELS) as Array<keyof typeof AREA_LABELS>).map(area => <div className="card" key={area}>
          <h3 className="card__title">{AREA_LABELS[area]}</h3>
          <p style={{ marginTop: 'var(--space-2)', overflowWrap: 'anywhere' }}>{data.states[area].label}</p>
          <p className="meta" style={{ marginTop: 'var(--space-2)' }}>{date(data.states[area].at)}</p>
        </div>)}
      </div>
      <details className="card" style={{ marginTop: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', minHeight: 'var(--control-h-lg)' }}>История статусов · {data.history.length}</summary>
        {data.history.length ? <ol style={{ paddingLeft: 'var(--space-5)' }}>{[...data.history].reverse().map((entry, i) => <li key={`${entry.at}-${entry.area}-${i}`} style={{ marginTop: 'var(--space-2)' }}>{date(entry.at)} · {entry.label}</li>)}</ol> : <p>Переходов ещё нет.</p>}
      </details>
      <p className="meta" style={{ marginTop: 'var(--space-3)' }}>Сводка запрашивается каждые 5 секунд. {data.summary_source === 'scheduled_database' ? 'Серверное расписание проверяет журнал раз в минуту без компьютера. Показано время сервера, а не время открытия пульта.' : project === 'iskra' && import.meta.env.VITE_ISKRA_SERVER_MONITOR_URL ? 'Серверный источник работает без компьютера; при задержке проверок сводка помечается устаревшей.' : 'Локальный источник зависит от работающего компьютера.'} Данные пользователей остаются в закрытом журнале продукта. Выпуск исправления требует согласования.</p>
    </>}
  </section>;
}
