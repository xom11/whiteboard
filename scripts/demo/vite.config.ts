import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { aiMiddlewarePlugin } from './aiMiddlewarePlugin';

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
  plugins: [
    react(),
    tailwindcss(),
    aiMiddlewarePlugin({
      // Lazy: đọc env tại từng request → đổi model không cần restart Vite.
      // Để swap provider: trả về { provider: new MyProvider(...) }.
      getOptions: () => ({
        apiKey: process.env.ANTHROPIC_API_KEY,
        ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
        ollamaDefaultModel: process.env.OLLAMA_DEFAULT_MODEL,
      }),
    }),
  ],
});
