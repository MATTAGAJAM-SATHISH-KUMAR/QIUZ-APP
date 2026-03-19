import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// CAP Server URL for local development
const CAP_SERVER = 'http://localhost:4004';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: CAP_SERVER,
        changeOrigin: true
      },
      '/live-quiz': {
        target: CAP_SERVER,
        ws: true
      },
      '/certificates': {
        target: CAP_SERVER,
        changeOrigin: true
      },
      '/health': {
        target: CAP_SERVER,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true
  }
});
