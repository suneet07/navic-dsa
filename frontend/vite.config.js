import { defineConfig } from 'vite';

// In development, /api is proxied to the Express backend.
export default defineConfig({
  server: { proxy: { '/api': 'http://127.0.0.1:5000' } },
  build: { target: 'es2022' },
});
