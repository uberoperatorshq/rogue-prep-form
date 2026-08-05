import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Namespaced so the form can be proxied onto info.roguefinance.us/prep
    // without colliding with that host's own /assets/ image folder.
    // assetsDir, never `base` - `base` rewrites URLs to /prep/... which the
    // proxy does not serve.
    assetsDir: 'prep-assets',
  },
})
