const stages = new Set([
  'owner_lock_and_probe_gate', 'lesson_snapshot_and_cas',
  'payload_validation_and_module_snapshot', 'json_projection_and_comparison',
  'course_update_if_needed', 'module_and_lesson_mutations_if_needed', 'access_if_needed',
])

/** QA diagnostics contain numbers only, never course text or authentication claims. */
export function courseSaveProbeMetrics(body: unknown, profile: unknown, elapsed: number): Record<string, number> {
  const metrics: Record<string, number> = {
    request_body_utf8_bytes: new TextEncoder().encode(JSON.stringify(body)).length,
    client_rpc_ms: Math.round(elapsed * 1000) / 1000,
  }
  if (!profile || typeof profile !== 'object') return metrics
  const p = profile as { function_ms?: unknown; steps?: unknown }
  const duration = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 60_000
  if (duration(p.function_ms)) metrics.inside_function_ms = p.function_ms
  if (Array.isArray(p.steps)) for (const step of p.steps) {
    if (step && typeof step.stage === 'string' && stages.has(step.stage) && duration(step.ms)) {
      metrics[`inside_${step.stage}_ms`] = step.ms
    }
  }
  return metrics
}
