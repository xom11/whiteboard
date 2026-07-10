// Cổng bundle: khoá hai bất biến sau mỗi build, đo trên BAO ĐÓNG IMPORT TĨNH
// của từng entry — KHÔNG phải trên file entry (entry chỉ là stub vài trăm byte
// re-export từ chunk-*.mjs; grep/size trên stub không đo được gì).
//
//  1. Bao đóng của dist/studio.mjs KHÔNG chứa "@excalidraw" ở bất kỳ file nào.
//     Trang landing standalone không bao giờ được kéo Excalidraw vào.
//     (Đối chứng dương: bao đóng dist/index.mjs CÓ chứa → cổng phân biệt được.)
//
//  2. Bao đóng của dist/geometry-2d.mjs ≤ CEILING byte. `Host` được bọc
//     React.lazy có chủ đích; một export tĩnh của editor sẽ kéo cả MiniBoard +
//     EditorPanel vào bundle gốc của MỌI consumer <Whiteboard>.
//
// KHÔNG đi theo import() động — đó chính là ranh giới React.lazy cần bảo vệ.
//
// Baseline đo 2026-07-10: studio 463.253B / geometry-2d 158.221B.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';

const GEOMETRY_2D_CEILING = 220_000; // baseline 158.221B; editor tĩnh ⇒ ~463KB

const STATIC_FROM = /(?:^|\n)\s*(?:import|export)[^\n]*?from\s*['"]([^'"]+)['"]/g;
const SIDE_EFFECT = /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;

/** Bao đóng import tĩnh của `entry`: [{file, src}]. Bỏ qua import() động. */
function staticClosure(entry) {
  const seen = new Map();
  const stack = [resolve(entry)];

  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;

    let src;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue; // specifier bare (react, immer…) — không phải file trong dist/
    }
    seen.set(file, src);

    for (const re of [STATIC_FROM, SIDE_EFFECT]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(src))) {
        if (m[1].startsWith('.')) stack.push(resolve(dirname(file), m[1]));
      }
    }
  }
  return [...seen.entries()].map(([file, src]) => ({ file, src }));
}

const failures = [];

for (const entry of ['dist/studio.mjs', 'dist/geometry-2d.mjs']) {
  if (!existsSync(entry)) {
    failures.push(`${entry}: KHÔNG tồn tại — chạy \`npm run build\` trước.`);
  }
}

if (failures.length === 0) {
  // (1) studio phải sạch @excalidraw trên TOÀN BỘ bao đóng
  const studio = staticClosure('dist/studio.mjs');
  const dirty = studio.filter((m) => m.src.includes('@excalidraw'));
  if (dirty.length > 0) {
    failures.push(
      `dist/studio.mjs: bao đóng chứa "@excalidraw" tại ${dirty
        .map((m) => basename(m.file))
        .join(', ')} — trang landing sẽ phải cài Excalidraw.`,
    );
  }

  // (2) geometry-2d không được phình (React.lazy bị phá)
  const g2d = staticClosure('dist/geometry-2d.mjs');
  const bytes = g2d.reduce((n, m) => n + m.src.length, 0);
  if (bytes > GEOMETRY_2D_CEILING) {
    failures.push(
      `dist/geometry-2d.mjs: bao đóng ${bytes.toLocaleString()} byte > ngưỡng ` +
        `${GEOMETRY_2D_CEILING.toLocaleString()}. Nghi ngờ export tĩnh kéo editor ` +
        `vào bundle gốc (React.lazy ở geometry-2d/index.tsx bị phá).`,
    );
  } else {
    console.log(
      `[check-bundle-boundaries] studio: ${studio.length} module sạch @excalidraw; ` +
        `geometry-2d: ${bytes.toLocaleString()}B ≤ ${GEOMETRY_2D_CEILING.toLocaleString()}B`,
    );
  }
}

if (failures.length > 0) {
  console.error('\n[check-bundle-boundaries] THẤT BẠI:\n');
  for (const f of failures) console.error('  ✗ ' + f);
  console.error('');
  process.exit(1);
}

console.log('[check-bundle-boundaries] OK — ranh giới bundle nguyên vẹn.');
