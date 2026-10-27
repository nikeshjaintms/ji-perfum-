import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// JJ PERFUME Light Luxury Theme - Active
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
