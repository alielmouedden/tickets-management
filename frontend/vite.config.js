import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3001,
    proxy: {
      '/api': {
        target: 'https://tickets-management-backend-production.up.railway.app',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'https://tickets-management-backend-production.up.railway.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});