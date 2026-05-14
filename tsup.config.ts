import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'next', 'next/dynamic'],
  treeshake: true,
  // Banner để giữ "use client" cho component RSC consumer (Next.js App Router)
  banner: {
    js: '"use client";',
  },
});
