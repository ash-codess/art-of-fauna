import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'node:fs'

// Served from https://<user>.github.io/art-of-fauna/ on GitHub Pages, so assets
// need the repo name as the base. Locally (dev) BASE_URL stays '/'.
const base = process.env.GITHUB_PAGES ? '/art-of-fauna/' : '/'

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    {
      // GitHub Pages has no SPA fallback — serve index.html for unknown paths
      // (e.g. /art-of-fauna/a/snowy-owl) by shipping a copy as 404.html.
      name: 'spa-fallback-404',
      closeBundle() {
        try {
          copyFileSync('dist/index.html', 'dist/404.html')
        } catch {
          /* no dist yet (dev) */
        }
      },
    },
  ],
  server: {
    port: 5173,
    open: false,
  },
})
