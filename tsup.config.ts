import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'geometry-2d': 'src/stamps/geometry-2d/index.tsx',
    'geometry-3d': 'src/stamps/geometry-3d/index.tsx',
    latex: 'src/stamps/latex/index.tsx',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    '@excalidraw/excalidraw',
    'jsxgraph',
    'katex',
  ],
  treeshake: true,
  // "use client" được prepend qua scripts/inject-use-client.mjs (script lặp
  // toàn bộ dist/*.js + dist/*.mjs nên multi-entry tự động được handle).
});
