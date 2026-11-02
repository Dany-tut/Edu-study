import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
const outfile = 'node_modules/.cache/checkHomeworkVideoAccess.mjs'
mkdirSync('node_modules/.cache', { recursive: true })
await build({
  entryPoints: ['scripts/checkHomeworkVideoAccess.ts'], outfile, bundle: true,
  platform: 'node', format: 'esm', logLevel: 'error',
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://example.supabase.co'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('test'),
  },
})
execFileSync(process.execPath, [outfile], { stdio: 'inherit' })
