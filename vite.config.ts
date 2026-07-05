import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // main bundle is ~4MB

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
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
