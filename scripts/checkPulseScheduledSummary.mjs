import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'iskra-pulse-summary-'));
const base = new URL('../integrations/pulse/web/', import.meta.url);
const env = { VITE_ISKRA_SUMMARY_URL: 'https://igsdwvwiqnozgwczzycx.supabase.co/rest/v1/rpc/iskra_monitor_summary', VITE_ISKRA_SUMMARY_KEY: 'sb_publishable_fixture', VITE_ISKRA_SERVER_MONITOR_URL: 'https://raw.githubusercontent.com/Dany-tut/Edu-study/codex/monitor-status/iskra.json' };
const previousFetch = globalThis.fetch;
try {
  for (const name of ['scheduledSummary', 'operations']) {
    const source = (await fs.readFile(new URL(name + '.ts', base), 'utf8')).replaceAll('import.meta.env', JSON.stringify(env)).replace("'./scheduledSummary'", "'./scheduledSummary.mjs'");
    await fs.writeFile(path.join(dir, name + '.mjs'), ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
  }
  const { scheduledOperations, summaryConfig } = await import(path.join(dir, 'scheduledSummary.mjs'));
  const { loadOperations, mergeServerOperations } = await import(path.join(dir, 'operations.mjs'));
  const now = Date.now(), at = new Date(now).toISOString();
  const summary = { project: 'iskra', schema_version: 1, checked_at: at, capture_error: false, open_signals: 0 };
  const fresh = scheduledOperations(summary, null, now);
  assert.equal(fresh.states.monitor.code, 'observing');
  assert.equal(fresh.external_probe.code, 'unknown');
  assert.equal(fresh.last_checked_at, at);
  assert.equal(fresh.states.incident.code, 'unknown'); // quiet does not mean no bugs
  for (const patch of [{ checked_at: new Date(now - 180001).toISOString() }, { checked_at: new Date(now + 60001).toISOString() }, { capture_error: true }]) {
    assert.equal(scheduledOperations({ ...summary, ...patch }, fresh, now).states.monitor.code, 'error');
  }
  for (const patch of [{ project: 'testly' }, { checked_at: 'invalid' }, { open_signals: -1 }, { open_signals: '1' }, { capture_error: null }]) {
    assert.throws(() => scheduledOperations({ ...summary, ...patch }, null, now));
  }
  assert.equal(scheduledOperations({ ...summary, open_signals: 2, private_user_id: 'must-not-escape' }, null, now).states.incident.code, 'detected');
  assert(!JSON.stringify(scheduledOperations({ ...summary, private_user_id: 'must-not-escape' }, null, now)).includes('must-not-escape'));
  assert.equal(scheduledOperations(summary, fresh, now + 16 * 60000).external_probe.code, 'unknown');
  assert.throws(() => summaryConfig('https://attacker.invalid/', 'sb_publishable_fixture'));
  assert.throws(() => summaryConfig(env.VITE_ISKRA_SUMMARY_URL, 'service_role_secret'));
  const local = { ...fresh, states: { ...fresh.states, hotfix: { code: 'awaiting_approval', label: 'Локальное согласование', at }, release: { code: 'testing', label: 'Локальная проверка', at } } };
  assert.equal(mergeServerOperations(local, fresh).states.hotfix.code, 'awaiting_approval');
  let mode = 'github_down', requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init });
    if (String(url).startsWith(env.VITE_ISKRA_SUMMARY_URL)) {
      assert.equal(init.method, 'POST'); assert.equal(init.body, '{}'); assert.equal(init.headers.apikey, 'sb_publishable_fixture');
      if (mode === 'db_down') return new Response('{}', { status: 503 });
      if (mode === 'malformed') return Response.json({ rows: ['private'] });
      return Response.json(summary);
    }
    if (String(url).startsWith('https://raw.')) {
      if (mode === 'github_down') throw Error('network');
      return Response.json(fresh);
    }
    return Response.json(local);
  };
  assert.equal((await loadOperations('/local', 'iskra', new AbortController().signal)).states.monitor.code, 'observing');
  assert.equal((await loadOperations('/local', 'iskra', new AbortController().signal)).external_probe.code, 'unknown');
  mode = 'db_down'; await assert.rejects(loadOperations('/local', 'iskra', new AbortController().signal));
  mode = 'malformed'; await assert.rejects(loadOperations('/local', 'iskra', new AbortController().signal));
  assert(requests.every(r => !String(r.url).includes('analytics_events')));
  console.log('Pulse scheduled summary: real server clock, stale/future/capture error, fixed project/privacy, no healthy fallback, separate external probe, local release/approval preserved');
} finally {
  globalThis.fetch = previousFetch;
  await fs.rm(dir, { recursive: true, force: true });
}
