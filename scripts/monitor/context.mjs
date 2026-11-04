const sets = Object.fromEntries(Object.entries({
  event: ['js_error','promise_rejection','react_crash','widget_crash','native_crash','bootstrap_error','operation_failed','api_request','auth_failed','auth_stalled','auth_cancelled','login','logout','page_view','session_start','diagnostic_recovery','context'],
  role: ['admin','teacher','student','anon','system','unknown'],
  screen: ['teacher','lesson','homework','login','other'],
  reason: ['no_rows_updated','server_error','save_failed','load_failed','render_failed','entry_error','entry_rejection','bootstrap_stalled'],
  recovery: ['attempted','observed','boot_observed'],
}).map(([k, v]) => [k, new Set(v)]));

export function validateWorkSummary(value, now = Date.now()) {
  const at = typeof value?.checked_at === 'string' ? Date.parse(value.checked_at) : NaN;
  if (value?.project !== 'iskra' || value.schema_version !== 1 || value.capture_error !== false
    || !Number.isFinite(at) || now - at >= 180_000 || at - now > 60_000
    || !Number.isSafeInteger(value.open_signals) || value.open_signals < 0
    || typeof value.work_revision !== 'string' || !/^[a-f0-9]{32}$/.test(value.work_revision)) {
    throw Error('Untrusted/stale summary');
  }
  return { revision: value.work_revision, open_signals: value.open_signals };
}

/** Independent model-boundary allowlist; never pass through fields from upstream. */
export function technicalEvidence(value) {
  if (value?.project !== 'iskra' || value.schema_version !== 1 || !Array.isArray(value.evidence) || value.evidence.length > 20) throw Error('Invalid context');
  const match = (v, pattern) => typeof v === 'string' && pattern.test(v) ? v : null;
  const evidence = value.evidence.map(row => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw Error('Invalid evidence row');
    return {
      ...Object.fromEntries(Object.entries(sets).map(([key, values]) => [key, typeof row[key] === 'string' && values.has(row[key]) ? row[key] : null])),
      version: match(row.version, /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,9}(·[a-f0-9]{7,40})?$/),
      endpoint: match(row.endpoint, /^\/(rest\/v1\/(rpc\/)?[a-zA-Z0-9_]+|auth\/v1\/[a-zA-Z/]+|functions\/v1\/[a-zA-Z0-9_-]+)$/),
      asset: match(row.asset, /^[a-zA-Z0-9_.-]{1,120}\.(js|css)$/),
      status: Number.isInteger(row.status) && row.status >= 0 && row.status <= 599 ? row.status : null,
    };
  });
  if (JSON.stringify(evidence).length > 16000) throw Error('Oversized evidence');
  return evidence;
}
