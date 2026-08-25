import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Версия сборки. Номер (`1.0.<N>`, N — порядковый номер коммита) штампуется в
// public/version.json ХУКОМ pre-commit и едет внутри самого коммита, поэтому
// здесь он просто читается из файла: на Vercel клон мелкий и `rev-list --count`
// соврал бы. Тот же файл лежит в dist корнем — приложение тянет /version.json и
// сравнивает с этой вшитой цифрой, чтобы понять, доехала ли обнова.
const buildInfo = (() => {
  try { return JSON.parse(readFileSync(new URL('./public/version.json', import.meta.url), 'utf8')) }
  catch { return { build: 0, version: '1.0.0' } }
})()
const gitHash = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim() }
  catch { return (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || 'dev' }
})()

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(`${buildInfo.version}·${gitHash}`),
    __APP_BUILD__: JSON.stringify(Number(buildInfo.build) || 0),
    __APP_COMMIT__: JSON.stringify(gitHash),
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
