import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy only in dev — in production the frontend calls VITE_API_URL directly
    proxy: command === 'serve' ? {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    } : {},
  },
}))
