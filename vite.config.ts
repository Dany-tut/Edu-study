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
        // ── Precache = только оболочка ──────────────────────────────────────
        //
        // По умолчанию сюда попадали ВСЕ файлы из dist — 115 штук на 17 МБ.
        // Воркер начинал качать их сразу при первом заходе: все двадцать курсов,
        // сцены, three.js. Человек в это время смотрел на первый экран, а канал
        // у него был занят содержимым, которое он, может, и не откроет. Теперь
        // предзагружается оболочка (входной чанк, стили, иконки), а остальные
        // чанки кладутся в кеш по факту обращения — правилом ниже.
        globPatterns: [
          'index.html',
          'manifest.webmanifest',
          'assets/index-*.js',
          'assets/*.css',
          '*.{svg,png,ico}',
        ],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,

        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'app-shell', networkTimeoutSeconds: 4 },
          },
          {
            // Чанки приложения. Имя содержит хеш содержимого, поэтому файл по
            // такому адресу не меняется никогда — CacheFirst без ревалидации.
            // Взамен precache: офлайн доступно то, что человек уже открывал.
            urlPattern: ({ url, request }) =>
              url.origin === self.location.origin &&
              url.pathname.startsWith('/assets/') &&
              (request.destination === 'script' || request.destination === 'style'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-chunks',
              expiration: { maxEntries: 250, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            // Анимации Lottie (public/anim/*.json) — приезжают по требованию.
            urlPattern: ({ url }) => url.pathname.startsWith('/anim/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'anim',
              expiration: { maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // ── Общие данные — своим чанком, а не во входном ────────────────────
        //
        // Rollup поднимает модуль, нужный ДВУМ чанкам, в их общего родителя —
        // то есть во входной. Реестр изданий ленты нужен и виджету главной, и
        // самой ленте в тренажёре, и из-за этого 25 КБ данных снова оказались
        // там, откуда их только что убрали: ленивый импорт в этом случае не
        // помогает, помогает только явное имя чанка.
        manualChunks: (id) => {
          if (id.includes('src/data/feed/outlets')) return 'feed-outlets'
          return undefined
        },
      },
    },
  },
  server: {
    // Honor the port injected by the preview harness so its proxy can reach us.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    strictPort: !!process.env.PORT,
  },
})
