type Args = { p_course: string; p_kind?: string; p_item?: string; p_hidden?: boolean }
export const client = { exists: true, fail: false, calls: [] as Args[], rows: new Map<string, boolean>(), holdRead: null as null | (() => void) }
export const supabase = { async rpc(name: string, args: Args) {
  if (name === 'get_course_item_visibility') {
    const data = [...client.rows].map(([key, hidden]) => {
      const [course, item_kind, ...item] = key.split(':'); return { course, item_kind, item_key: item.join(':'), hidden }
    }).filter(r => r.course === args.p_course)
    await new Promise<void>(resolve => { client.holdRead = resolve })
    return { data, error: null }
  }
  client.calls.push(args)
  if (client.fail) return { data: null, error: { code: '42501' } }
  if (!client.exists) return { data: false, error: null }
  client.rows.set(`${args.p_course}:${args.p_kind}:${args.p_item}`, args.p_hidden!)
  return { data: true, error: null }
} }
