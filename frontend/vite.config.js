import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    port: 5173, // Added port from previous configuration
    proxy: {
      '/verify_token': {
        target: 'http://localhost:8000', 
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/verify-token/, '/verify-token'),
      },
      // Added proxy for /auth/google to match the new backend endpoint
      '/auth/google': { 
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth\/google/, '/auth/google'),
      },
    },
  },
});
