import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'geometry-2d': 'src/stamps/geometry-2d/index.tsx',
    'geometry-3d': 'src/stamps/geometry-3d/index.tsx',
    latex: 'src/stamps/latex/index.tsx',
    'graph-2d': 'src/stamps/graph-2d/index.tsx',
    studio: 'src/stamps/geometry-2d/studio/index.ts',
    ai: 'src/stamps/geometry-2d/ai/index.ts',
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
    'tesseract.js',
    'zod-to-json-schema',
  ],
  treeshake: true,
  // Giữ ký tự tiếng Việt nguyên văn trong dist thay vì escape `\xHH`/`\uHHHH`.
  // Bộ minify SWC của Next làm RƠI một dấu `\` trong template literal khi ngay
  // trước nó là `\xHH` (`l\xE0\\s+` → `l\xe0\s+`): regex tiếng Việt của rule
  // engine hỏng âm thầm ở bản production của consumer ("M là trung điểm BC" không
  // khớp ⇒ hình thiếu M). scripts/check-dist-latin1-escape.mjs canh sau build.
  esbuildOptions(options) {
    options.charset = 'utf8';
  },
  // "use client" được prepend qua scripts/inject-use-client.mjs (script lặp
  // toàn bộ dist/*.js + dist/*.mjs nên multi-entry tự động được handle).
});
