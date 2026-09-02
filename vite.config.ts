import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/abraxio/members': {
        target: 'https://app.abraxio.com',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/api/management/teams/members/all',
      },
    },
  },
});
