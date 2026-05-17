import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      '@xom11/whiteboard': path.resolve(__dirname, '../../src'),
      'next/dynamic': path.resolve(__dirname, 'next-dynamic-shim.ts'),
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: true,
  },
  plugins: [react(), tailwindcss()],
});
