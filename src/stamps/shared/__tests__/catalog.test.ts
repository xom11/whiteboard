// src/stamps/shared/__tests__/catalog.test.ts
// Verify STAMP_CATALOG (B½.1 — issue #29).
import { STAMP_CATALOG, findCatalogEntry } from '../catalog';
import { ALL_STAMPS } from '../registry';

describe('STAMP_CATALOG', () => {
  it('có đủ 4 entries', () => {
    expect(STAMP_CATALOG).toHaveLength(4);
  });

  it('mỗi entry có id khớp 1 stamp trong ALL_STAMPS', () => {
    const stampKinds = new Set(ALL_STAMPS.map((s) => s.kind));
    for (const entry of STAMP_CATALOG) {
      expect(stampKinds.has(entry.id)).toBe(true);
    }
  });

  it('không trùng id', () => {
    const ids = STAMP_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('experimental flag khớp với stamp.experimental của registry', () => {
    for (const entry of STAMP_CATALOG) {
      const stamp = ALL_STAMPS.find((s) => s.kind === entry.id);
      expect(stamp).toBeDefined();
      expect(entry.experimental).toBe(!!stamp!.experimental);
    }
  });

  it('mỗi entry khai báo runtimeDeps non-empty', () => {
    for (const entry of STAMP_CATALOG) {
      expect(Array.isArray(entry.runtimeDeps)).toBe(true);
      expect(entry.runtimeDeps.length).toBeGreaterThan(0);
    }
  });

  it('mỗi entry có bundleSize shape { js, css }', () => {
    for (const entry of STAMP_CATALOG) {
      expect(entry.bundleSize).toBeDefined();
      expect(typeof entry.bundleSize.js).toBe('number');
      expect(typeof entry.bundleSize.css).toBe('number');
      expect(entry.bundleSize.js).toBeGreaterThanOrEqual(0);
      expect(entry.bundleSize.css).toBeGreaterThanOrEqual(0);
    }
  });

  it('frozen (Object.freeze)', () => {
    expect(Object.isFrozen(STAMP_CATALOG)).toBe(true);
  });
});

describe('findCatalogEntry', () => {
  it('trả entry đúng cho id hợp lệ', () => {
    const entry = findCatalogEntry('geometry');
    expect(entry).not.toBeNull();
    expect(entry!.id).toBe('geometry');
    expect(entry!.runtimeDeps).toContain('jsxgraph');
  });

  it('trả entry experimental cho geometry3d', () => {
    const entry = findCatalogEntry('geometry3d');
    expect(entry).not.toBeNull();
    expect(entry!.experimental).toBe(true);
  });

  it('trả null cho id không tồn tại', () => {
    expect(findCatalogEntry('does-not-exist')).toBeNull();
  });
});
