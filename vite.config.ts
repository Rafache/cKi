import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: process.env.HOST || '192.168.1.10',
    port: 5173,
    allowedHosts: ['.aubox.chem1.fr'],
    hmr: {
      clientPort: 443,
    },
    proxy: {
      '/api/abraxio/members': {
        target: 'https://app.abraxio.com',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/api/management/teams/members/all',
      },
    },
  },
  preview: {
    host: process.env.HOST || '192.168.1.10',
    port: 5173,
    allowedHosts: ['.aubox.chem1.fr'],
  },
});
