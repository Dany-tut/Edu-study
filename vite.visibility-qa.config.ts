import { defineConfig, mergeConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import base from './vite.config'
export default mergeConfig(base, defineConfig({
  plugins: [{ name: 'visibility-fixture-only', enforce: 'pre', resolveId(source, importer) {
    if (source === './supabase' && importer?.endsWith('/src/lib/courseVisibility.ts')) return fileURLToPath(new URL('./qa/course-visibility/supabase.ts', import.meta.url))
  } }],
  optimizeDeps: { entries: ['qa/course-visibility/index.html'] },
}))
