#!/usr/bin/env node
// scripts/build-catalog.mjs
//
// Postbuild — đo gzip size mỗi stamp entry trong `dist/` và:
//   1. Patch `bundleSize` placeholder `{ js: 0, css: 0 }` trong
//      `dist/stamps/shared/catalog.{mjs,cjs}` thành số KB thực tế.
//   2. Ghi `dist/catalog.json` cho consumer fetch runtime nếu cần.
//
// Source `src/stamps/shared/catalog.ts` giữ nguyên placeholder — git không
// dirty mỗi lần build. Replace chỉ chạm dist/ artifact.
//
// Bundle size đo trên `dist/{id}.mjs` (ESM entry per stamp do tsup multi-entry
// emit). Đây là số GẦN ĐÚNG: code shared chunks có thể tách ra → real load
// nhỏ hơn nếu stamp khác đã load trước. Vẫn là bound trên ổn định để consumer
// quyết định lazy-load.

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');

/** Đọc & gzip 1 file; trả về size bytes (raw). 0 nếu file không tồn tại. */
async function gzipBytes(path) {
  if (!existsSync(path)) return 0;
  const buf = await readFile(path);
  return gzipSync(buf).length;
}

/** bytes → KB rounded 2 decimals. */
function toKb(bytes) {
  return Math.round((bytes / 1024) * 100) / 100;
}

/** id ↔ tên file entry. Phải đồng bộ với tsup.config.ts entries. */
const STAMP_FILE_MAP = {
  geometry: 'geometry-2d',
  latex: 'latex',
  geometry3d: 'geometry-3d',
  graph2d: 'graph-2d',
};

/**
 * Tìm mọi tham chiếu file relative (`'./xxx.mjs'`) trong content — bao gồm cả
 * static `import` và dynamic `import(...)`. Trả về set tên file (chưa join path).
 */
function extractRelativeRefs(content) {
  const refs = new Set();
  // 'import ... from "./X.mjs"' / 'import("./X.mjs")' / 'export ... from "./X.mjs"'
  const re = /['"](\.\/[A-Za-z0-9_\-./]+\.mjs)['"]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    refs.add(m[1].replace(/^\.\//, ''));
  }
  return refs;
}

/**
 * BFS từ entry file, collect mọi file reachable (static + dynamic import).
 * Trả về Map<filename, gzipBytes>.
 */
async function collectReachable(entryFile) {
  const result = new Map();
  const queue = [entryFile];
  while (queue.length > 0) {
    const file = queue.shift();
    if (result.has(file)) continue;
    const path = join(DIST, file);
    if (!existsSync(path)) continue;
    const content = await readFile(path, 'utf8');
    const bytes = gzipSync(Buffer.from(content)).length;
    result.set(file, bytes);
    for (const ref of extractRelativeRefs(content)) {
      if (!result.has(ref)) queue.push(ref);
    }
  }
  return result;
}

async function measureBundleSize(id) {
  const slug = STAMP_FILE_MAP[id];
  if (!slug) {
    console.warn(`[build-catalog] no file mapping cho id=${id}`);
    return { js: 0, css: 0 };
  }
  const reachable = await collectReachable(`${slug}.mjs`);
  let totalBytes = 0;
  for (const b of reachable.values()) totalBytes += b;
  const cssBytes = await gzipBytes(join(DIST, `${slug}.css`));
  return { js: toKb(totalBytes), css: toKb(cssBytes) };
}

/**
 * STAMP_CATALOG entries duplicate ở build script — phải khớp với
 * `src/stamps/shared/catalog.ts`. Trade-off: tránh runtime import từ TS source
 * (Node ESM không load .ts trực tiếp), không cần thêm ts-node dependency.
 */
const BASE_ENTRIES = [
  {
    id: 'geometry',
    title: 'Hình học 2D (JSXGraph)',
    version: 1,
    experimental: false,
    runtimeDeps: ['jsxgraph'],
  },
  {
    id: 'latex',
    title: 'Công thức LaTeX (KaTeX)',
    version: 1,
    experimental: false,
    runtimeDeps: ['katex'],
  },
  {
    id: 'geometry3d',
    title: 'Hình học 3D (JSXGraph view3d)',
    version: 2,
    experimental: true,
    runtimeDeps: ['jsxgraph'],
  },
  {
    id: 'graph2d',
    title: 'Đồ thị hàm số 2D (JSXGraph)',
    version: 2,
    experimental: true,
    runtimeDeps: ['jsxgraph'],
  },
];

async function findCatalogArtifacts() {
  // Tsup compile catalog.ts thành dist/index.{mjs,cjs} chunks. Ta tìm mọi file
  // có chứa `STAMP_CATALOG` để patch.
  const candidates = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        await walk(p);
      } else if (e.isFile() && (p.endsWith('.mjs') || p.endsWith('.js'))) {
        candidates.push(p);
      }
    }
  }
  await walk(DIST);
  return candidates;
}

/**
 * Replace placeholder `bundleSize: { js: 0, css: 0 }` của entry id `target.id`
 * trong content thành `{ js: X, css: Y }`. Tìm theo cặp anchor (id + bundleSize)
 * nên không cần lo lẫn entry với entry khác (anchor chính là id literal).
 */
function patchEntry(content, target, size) {
  // Tsup minify giữ object property layout khá ổn định, nhưng để chắc ta
  // dùng regex non-greedy match từ `id: "<id>"` đến `bundleSize: { js: 0, css: 0 }`.
  // Hỗ trợ cả quotes đơn/đôi/no-space.
  const idLiteral = new RegExp(`(["'])${target.id}\\1`);
  const bundleSizeRe = /bundleSize:\s*\{\s*js:\s*0\s*,\s*css:\s*0\s*\}/;
  // Tìm vị trí entry id rồi tìm bundleSize gần nhất sau đó.
  const m = idLiteral.exec(content);
  if (!m) return { content, changed: false };
  const fromIdx = m.index;
  // Tìm bundleSize ở vùng sau idx, window 1KB là đủ cho 1 object literal.
  const window = content.slice(fromIdx, fromIdx + 2048);
  const bm = bundleSizeRe.exec(window);
  if (!bm) return { content, changed: false };
  const absStart = fromIdx + bm.index;
  const absEnd = absStart + bm[0].length;
  const replacement = `bundleSize: { js: ${size.js}, css: ${size.css} }`;
  return {
    content: content.slice(0, absStart) + replacement + content.slice(absEnd),
    changed: true,
  };
}

async function main() {
  if (!existsSync(DIST)) {
    console.error('[build-catalog] dist/ không tồn tại — chạy `tsup` trước.');
    process.exit(1);
  }

  const entries = [];
  for (const base of BASE_ENTRIES) {
    const bundleSize = await measureBundleSize(base.id);
    entries.push({ ...base, bundleSize });
  }

  // 1. Ghi dist/catalog.json
  const catalogJson = { generatedAt: new Date().toISOString(), entries };
  await writeFile(join(DIST, 'catalog.json'), JSON.stringify(catalogJson, null, 2), 'utf8');

  // 2. Patch placeholders trong dist js/mjs
  const artifacts = await findCatalogArtifacts();
  let patchedFiles = 0;
  for (const path of artifacts) {
    let content = await readFile(path, 'utf8');
    if (!content.includes('bundleSize')) continue;
    let touched = false;
    for (const entry of entries) {
      const result = patchEntry(content, entry, entry.bundleSize);
      if (result.changed) {
        content = result.content;
        touched = true;
      }
    }
    if (touched) {
      await writeFile(path, content, 'utf8');
      patchedFiles++;
    }
  }

  // 3. In summary
  console.log(`[build-catalog] catalog.json + patched ${patchedFiles} file(s):`);
  for (const e of entries) {
    console.log(
      `  - ${e.id.padEnd(11)} js=${String(e.bundleSize.js).padStart(6)}KB  css=${String(
        e.bundleSize.css,
      ).padStart(5)}KB`,
    );
  }
}

main().catch((err) => {
  console.error('[build-catalog] FAILED:', err);
  process.exit(1);
});
