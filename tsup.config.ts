import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  treeshake: true,
  // "use client" được prepend qua scripts/inject-use-client.mjs (banner config bị
  // bundler strip — Next.js App Router yêu cầu directive ở dòng đầu của file output).
});
