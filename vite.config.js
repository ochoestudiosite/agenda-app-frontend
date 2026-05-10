import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-router'))          return 'vendor-react';
          if (id.includes('react-dom'))             return 'vendor-react';
          if (/\/react\//.test(id))                 return 'vendor-react';
          if (id.includes('@tanstack/react-query')) return 'vendor-query';
          if (id.includes('framer-motion'))         return 'vendor-motion';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true, // Permite conexiones en LAN (0.0.0.0)
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
