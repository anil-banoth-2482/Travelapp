import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const APP_TOKEN = 'local-dev-token'

const BACKENDURL = "https://travelapp-production-a035.up.railway.app"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: BACKENDURL,
        changeOrigin: true,
        headers: {
          'x-app-token': APP_TOKEN,
        },
      },
      '/health': {
        target: BACKENDURL,
        changeOrigin: true,
        headers: {
          'x-app-token': APP_TOKEN,
        },
      },
      '/media': {
        target: BACKENDURL,
        changeOrigin: true,
        headers: {
          'x-app-token': APP_TOKEN,
        },
      },
    },
  },
})
