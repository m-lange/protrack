import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Loose files occasionally show up in the project root from unrelated local
// tools and can be OS-locked, which crashes Vite's fs watcher (EBUSY). Only
// watch the paths this project actually needs.
const watchedRootFiles = new Set([
  'index.html',
  'vite.config.ts',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  '.oxlintrc.json',
])

// Served under github.io/protrack/ via GitHub Pages, so every root-relative
// URL (routes, manifest, icons) needs this prefix baked in.
const base = '/protrack/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg'],
      manifest: {
        id: base,
        name: 'ProTrack',
        short_name: 'ProTrack',
        description: 'Zeiterfassung und Projekt-Kontingente',
        lang: 'de',
        start_url: base,
        display: 'standalone',
        background_color: '#F9F9FB',
        theme_color: '#644BF5',
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell + IndexedDB is all local already; just cache the built assets for offline use.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
  server: {
    watch: {
      ignored: (path: string) => {
        const normalized = path.replace(/\\/g, '/')
        if (/\/(node_modules|\.git|dist)\//.test(normalized)) return true
        const rel = normalized.split('/protrack/')[1]
        if (!rel || rel.includes('/')) return false
        return !watchedRootFiles.has(rel)
      },
    },
  },
})
