import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const APP_TOKEN = 'local-dev-token'

const BACKENDURL = "http://localhost:4000"

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
