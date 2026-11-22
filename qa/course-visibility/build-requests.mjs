import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
await build({ entryPoints:['qa/course-visibility/requests.mjs'],bundle:true,platform:'node',format:'esm',outfile:'node_modules/.cache/course-visibility-requests.mjs',plugins:[{
  name:'visibility-test-client',setup(build){build.onResolve({filter:/^\.\/supabase$/},args=>args.importer.endsWith('/src/lib/courseVisibility.ts')?{path:fileURLToPath(new URL('./request-client.ts',import.meta.url))}:undefined)},
}] })
await import(new URL('../../node_modules/.cache/course-visibility-requests.mjs',import.meta.url))
