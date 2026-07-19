import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
