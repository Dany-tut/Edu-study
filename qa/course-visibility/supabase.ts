type Row = { item_kind: string; item_key: string; hidden: boolean }
export const fixtureServer = {
  mode: 'ok', calls: 0, delay: 450,
  rows: new Map<string, Row[]>(),
}
export const supabase = {
  async rpc(name: string, args: Record<string, any>) {
    const course = args.p_course
    const rows = fixtureServer.rows.get(course) ?? []
    const copy = rows.map(row => ({ ...row }))
    if (name === 'get_course_item_visibility') {
      await new Promise(resolve => setTimeout(resolve, fixtureServer.delay))
      return { data: copy, error: null }
    }
    fixtureServer.calls++
    window.dispatchEvent(new Event('visibility-fixture'))
    await new Promise(resolve => setTimeout(resolve, fixtureServer.delay))
    if (fixtureServer.mode === 'fail') return { data: null, error: { code: '42501' } }
    const row = { item_kind: args.p_kind, item_key: args.p_item, hidden: args.p_hidden }
    fixtureServer.rows.set(course, [...rows.filter(r => !(r.item_kind === row.item_kind && r.item_key === row.item_key)), row])
    return { data: true, error: null }
  },
}
