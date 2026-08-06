import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Human-readable build id shown on the crash screen (e.g. "1.0.0·a1b2c3d") so a
// user report can be pinned to an exact build. Falls back gracefully if git or
// package.json isn't available at build time.
const pkgVersion = (() => {
  try { return JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version || '0.0.0' }
  catch { return '0.0.0' }
})()
const gitHash = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim() }
  catch { return 'dev' }
})()

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(`${pkgVersion}·${gitHash}`),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',      // new SW takes over ASAP — no stale shell
      injectRegister: 'auto',
      manifest: false,                 // we ship our own hand-tuned manifest.webmanifest
      workbox: {
        // Network-first navigation so a fresh deploy is served immediately and the
        // cached shell is only used offline — avoids the classic stale-SPA trap.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /supabase\.co/],
        // Потолок precache. Бандл растёт вместе с контентом курсов (сиды,
        // библиотеки текстов, разговорники) и уже дважды упирался в эту цифру:
        // сборка при этом не предупреждает, а ПАДАЕТ, то есть деплой встаёт от
        // добавления обычных данных. Настоящее лечение — вынести контент из
        // главного чанка (survivalKo уже так и грузится, ленивым импортом);
        // до тех пор держим запас, а не догоняем размер вплотную.
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024, // главный чанк ~6.3 МБ

        runtimeCaching: [{
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: { cacheName: 'app-shell', networkTimeoutSeconds: 4 },
        }],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    // Honor the port injected by the preview harness so its proxy can reach us.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    strictPort: !!process.env.PORT,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
