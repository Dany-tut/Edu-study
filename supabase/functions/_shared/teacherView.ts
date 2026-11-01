/** Resolve an explicitly requested read-only teacher context after getUser().
 * A teacher id in a request never grants the caller additional privileges. */
export function teacherReadContext(user: { id: string; app_metadata?: Record<string, unknown> }, body: Record<string, unknown>) {
  if (body.viewTeacherId === undefined) return { teacher: user.id, viewing: false } as const
  if (user.app_metadata?.role !== 'admin') return { error: 'forbidden', status: 403 } as const
  if (typeof body.viewTeacherId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.viewTeacherId)) {
    return { error: 'bad_request', status: 400 } as const
  }
  if (!['module', 'tests', 'results'].includes(String(body.action))) return { error: 'view_only', status: 403 } as const
  return { teacher: body.viewTeacherId, viewing: true } as const
}
