// Serve only the standalone preview, including byte-range requests for Safari video.
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'

await preview({
  configFile: false,
  root: fileURLToPath(new URL('.', import.meta.url)),
  build: { outDir: '.' },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT || 8471),
    strictPort: true,
    headers: { 'Cache-Control': 'no-cache' },
  },
})
