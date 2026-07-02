import { supabase } from './supabase'

// Current teacher/admin ownership context. Every teacher-cabinet data query is
// scoped to `created_by = auth.uid()` so a teacher only ever sees their OWN
// groups / students / homework. Cached to avoid an auth round-trip per query;
// invalidated on any auth state change (login/logout).
let cached: string | null | undefined

export async function getOwnerId(): Promise<string | null> {
  if (cached !== undefined) return cached
  const { data } = await supabase.auth.getUser()
  cached = data.user?.id ?? null
  return cached
}

supabase.auth.onAuthStateChange(() => { cached = undefined })
