// src/stamps/shared/catalog.ts
//
// STAMP_CATALOG — manifest tra cứu mọi stamp có sẵn trong package (B½.1,
// issue #29). Consumer build admin UI / picker / docs page chỉ cần import
// hằng số này; không phải tự đọc source.
//
// `bundleSize` được populate bởi `scripts/build-catalog.mjs` (chạy postbuild)
// — số đo gzip size thực tế của `dist/{kind}.mjs`. Build script replace giá
// trị placeholder `{ js: 0, css: 0 }` thành số KB chính xác đồng thời ghi
// `dist/catalog.json` để consumer có thể fetch runtime nếu cần.
//
// Khi thêm stamp mới (xem `docs/superpowers/specs/add-new-stamp-howto.md`),
// thêm entry vào mảng này — entry phải match `stamp.kind` của registry.

/**
 * Mô tả 1 stamp trong catalog. Bundle size đo bằng KB (kilobytes) gzip — tính
 * trên file entry `dist/{id}.mjs`. Đây là bound trên: code thực sự nạp khi
 * user dùng stamp có thể nhỏ hơn nếu shared chunks đã load cho stamp khác.
 */
export interface StampCatalogEntry {
  /** Khớp với `StampType.kind`. Vd 'geometry', 'latex', 'geometry3d', 'graph2d'. */
  id: string;
  /** Tên hiển thị cho admin UI (tiếng Việt). */
  title: string;
  /** Phiên bản schema customData. Bump khi BREAKING change format. */
  version: number;
  /** true nếu stamp chưa production-ready (EXPERIMENTAL_STAMPS). */
  experimental: boolean;
  /** Dependency runtime mà consumer phải cài qua peerDependency. */
  runtimeDeps: ReadonlyArray<string>;
  /** Size dist/{id}.{mjs,css} sau gzip (KB). Populated postbuild. */
  bundleSize: { js: number; css: number };
}

/**
 * Catalog tĩnh của 4 stamps hiện tại. `bundleSize` ở đây là PLACEHOLDER —
 * `scripts/build-catalog.mjs` sẽ override giá trị này trong `dist/`. Tại
 * source (chạy jest / dev), bundleSize sẽ là 0 — đừng dùng cho quyết định
 * production, chỉ dùng entries trong build artifact.
 */
export const STAMP_CATALOG: ReadonlyArray<StampCatalogEntry> = Object.freeze([
  {
    id: 'geometry',
    title: 'Hình học 2D (JSXGraph)',
    version: 1,
    experimental: false,
    runtimeDeps: ['jsxgraph'],
    bundleSize: { js: 0, css: 0 },
  },
  {
    id: 'latex',
    title: 'Công thức LaTeX (KaTeX)',
    version: 1,
    experimental: false,
    runtimeDeps: ['katex'],
    bundleSize: { js: 0, css: 0 },
  },
  {
    id: 'geometry3d',
    title: 'Hình học 3D (JSXGraph view3d)',
    version: 2,
    experimental: true,
    runtimeDeps: ['jsxgraph'],
    bundleSize: { js: 0, css: 0 },
  },
  {
    id: 'graph2d',
    title: 'Đồ thị hàm số 2D (JSXGraph)',
    version: 2,
    experimental: true,
    runtimeDeps: ['jsxgraph'],
    bundleSize: { js: 0, css: 0 },
  },
]);

/** Lấy entry theo stamp.kind. Trả null nếu không có. */
export function findCatalogEntry(id: string): StampCatalogEntry | null {
  return STAMP_CATALOG.find((entry) => entry.id === id) ?? null;
}
