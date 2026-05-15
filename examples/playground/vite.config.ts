import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Bypass next/dynamic in ExcalidrawWhiteboardView by stubbing it as a passthrough.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@board': path.resolve(__dirname, '../../src/stamp/JSXGraphMiniBoard.tsx'),
      '@tools': path.resolve(__dirname, '../../src/stamp/jsxgraph/tools.tsx'),
      '@transforms': path.resolve(__dirname, '../../src/stamp/transforms.ts'),
      '@serialize-board': path.resolve(__dirname, '../../src/stamp/serializeBoard.ts'),
      // Shim next/dynamic để ExcalidrawWhiteboardView chạy ngoài Next.js.
      'next/dynamic': path.resolve(__dirname, 'src/next-dynamic-shim.ts'),
    },
  },
  server: {
    fs: {
      // allow imports from sibling src/
      allow: [path.resolve(__dirname, '..', '..')],
    },
  },
});
