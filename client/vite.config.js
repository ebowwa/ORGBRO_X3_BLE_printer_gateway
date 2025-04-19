import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/scan': 'http://localhost:5004',
      '/print': 'http://localhost:5004'
    }
  }
});
