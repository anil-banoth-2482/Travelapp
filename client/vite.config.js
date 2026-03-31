import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const APP_TOKEN = 'local-dev-token'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        headers: {
          'x-app-token': APP_TOKEN,
        },
      },
      '/health': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        headers: {
          'x-app-token': APP_TOKEN,
        },
      },
      '/media': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        headers: {
          'x-app-token': APP_TOKEN,
        },
      },
    },
  },
})
