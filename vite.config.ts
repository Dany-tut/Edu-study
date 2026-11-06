import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { sentryVitePlugin } from '@sentry/vite-plugin'
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

// Source maps для Sentry (проект iskra-web): только в продакшен-сборке Vercel,
// где лежит SENTRY_AUTH_TOKEN. Карты создаются скрытыми (без ссылки в чанках),
// уходят в Sentry и удаляются из dist до выкладки — исходники публично не
// раздаются. Локально, в CI и в превью без токена ничего не меняется.
const sentryUpload = Boolean(process.env.SENTRY_AUTH_TOKEN) && process.env.VERCEL_ENV === 'production'

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
        // navigateFallback НЕ задаём. С ним workbox регистрирует NavigationRoute
        // раньше runtimeCaching, и любой переход получал index.html из precache —
        // правило NetworkFirst ниже было мёртвым. После деплоя старый index
        // просил чанки со старыми хешами, Vercel отвечал 404, и «Обновить» не
        // помогало: перезагрузку снова обслуживал старый воркер (16.09.2026).
        navigateFallback: null,
        // ── Precache = только оболочка ──────────────────────────────────────
        //
        // По умолчанию сюда попадали ВСЕ файлы из dist — 115 штук на 17 МБ.
        // Воркер начинал качать их сразу при первом заходе: все двадцать курсов,
        // сцены, three.js. Человек в это время смотрел на первый экран, а канал
        // у него был занят содержимым, которое он, может, и не откроет. Теперь
        // предзагружается оболочка (входной чанк, стили, иконки), а остальные
        // чанки кладутся в кеш по факту обращения — правилом ниже.
        //
        // index.html в precache НЕ кладём. Precache-маршрут регистрируется
        // первым и по directoryIndex отвечает на «/» своей копией index.html —
        // то есть снова старой оболочкой, мимо NetworkFirst ниже. После деплоя
        // сторож чанков перезагружал страницу, старый воркер (новый ещё не
        // встал) отдавал тот же старый index, чанк падал второй раз за 10 с —
        // и человек видел «Что-то пошло не так» (29.09.2026). Офлайн оболочку
        // даёт кеш app-shell: туда кладётся каждый удачный переход.
        globPatterns: [
          'manifest.webmanifest',
          'assets/app-*.js',
          'assets/index-*.css',
          'assets/vendor-core-*.js',
          'icon.svg',
          'icon-teacher.svg',
        ],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // Карты воркера не нужны и пишутся уже после очистки для Sentry.
        sourcemap: false,

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
    sentryUpload && sentryVitePlugin({
      org: 'iskra-b9',
      project: 'iskra-web',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
      // Сбой Sentry не должен валить выкладку: без карт стеки просто минифицированы.
      errorHandler: err => { console.warn('[sentry] source maps upload failed:', err.message) },
      // Релиз задаёт сам SDK (__APP_VERSION__); карты находятся по debug ID.
      release: { name: `${buildInfo.version}·${gitHash}`, inject: false },
      sourcemaps: { filesToDeleteAfterUpload: ['dist/**/*.map'] },
    }),
  ],
  build: {
    sourcemap: sentryUpload ? 'hidden' : false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app-[hash].js',
        // ── Общие данные — своим чанком, а не во входном ────────────────────
        //
        // Rollup поднимает модуль, нужный ДВУМ чанкам, в их общего родителя —
        // то есть во входной. Реестр изданий ленты нужен и виджету главной, и
        // самой ленте в тренажёре, и из-за этого 25 КБ данных снова оказались
        // там, откуда их только что убрали: ленивый импорт в этом случае не
        // помогает, помогает только явное имя чанка.
        manualChunks: (id) => {
          // Build metadata changes the entry on every release. Keep stable
          // framework/Auth/animation code cached across those entry changes.
          // Only baseline libraries belong here; large editors/3D stay lazy.
          if (/\/node_modules\/(react|react-dom|scheduler|framer-motion|motion-dom|motion-utils|@supabase)(\/|$)/.test(id)
            || id.includes('commonjsHelpers')) return 'vendor-core'
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
