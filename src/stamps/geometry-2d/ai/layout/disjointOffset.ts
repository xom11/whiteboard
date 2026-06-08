// src/stamps/geometry-2d/ai/layout/disjointOffset.ts
//
// Layout pass (issue #46 nhóm D, D1, Mức 1): tách các component RỜI NHAU (không
// chia điểm/ref) theo trục ngang để không render chồng tại canonical origin.
//
// Pure, mutate in place (giống repairCircleIntersections). Chỉ dịch free point
// (kind:'free' — điểm DUY NHẤT có x/y); điểm phái sinh KHÔNG có coord → transpile
// tính lại từ ref đã dịch → tự đúng. Bất biến: ≤1 component → no-op (đề 1-figure
// byte-identical).

import type { DslPointT, DslShapeT } from '../../dsl/schema';
import { collectRefs } from '../../dsl/transpile/refs';

const GAP = 2; // board-unit giữa 2 component liền kề

type FreePoint = Extract<DslPointT, { kind: 'free' }>;
interface Bbox { minX: number; maxX: number; minY: number; maxY: number; }

export function layoutDisjointComponents(points: DslPointT[], shapes: DslShapeT[]): void {
  // --- union-find trên mọi entity name (point + shape) ---
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const r = parent.get(x);
    if (r === undefined) { parent.set(x, x); return x; }
    if (r === x) return x;
    const root = find(r);
    parent.set(x, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  const entities: (DslPointT | DslShapeT)[] = [...points, ...shapes];
  for (const e of entities) {
    find(e.name); // đảm bảo node tồn tại
    for (const ref of collectRefs(e)) union(e.name, ref);
  }

  // --- free point + thứ tự xuất hiện trong mảng points ---
  const freeByName = new Map<string, { p: FreePoint; index: number }>();
  points.forEach((p, i) => {
    if (p.kind === 'free') freeByName.set(p.name, { p, index: i });
  });
  if (freeByName.size === 0) return;

  // --- gom free point theo component root + min free-index ---
  const compFree = new Map<string, { p: FreePoint; index: number }[]>();
  const compMinIndex = new Map<string, number>();
  for (const [name, rec] of freeByName) {
    const root = find(name);
    if (!compFree.has(root)) { compFree.set(root, []); compMinIndex.set(root, rec.index); }
    compFree.get(root)!.push(rec);
    compMinIndex.set(root, Math.min(compMinIndex.get(root)!, rec.index));
  }

  // --- bất biến: ≤1 component có free point → no-op ---
  if (compFree.size <= 1) return;

  // --- thứ tự component theo min free-index (= thứ tự đọc đề) ---
  const roots = [...compFree.keys()].sort(
    (a, b) => compMinIndex.get(a)! - compMinIndex.get(b)!,
  );

  // --- bbox per-component: free-point coords + mở rộng bán kính khi tâm là free ---
  const bboxOf = (root: string): Bbox => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const ext = (x: number, y: number) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    };
    for (const { p } of compFree.get(root)!) ext(p.x, p.y);
    for (const s of shapes) {
      if (find(s.name) !== root) continue;
      if (s.kind === 'circleCR') {
        const c = freeByName.get(s.center);
        if (c) { ext(c.p.x - s.radius, c.p.y - s.radius); ext(c.p.x + s.radius, c.p.y + s.radius); }
      } else if (s.kind === 'circleCP') {
        const c = freeByName.get(s.center);
        const sp = freeByName.get(s.surfacePoint);
        if (c && sp) {
          const r = Math.hypot(c.p.x - sp.p.x, c.p.y - sp.p.y);
          ext(c.p.x - r, c.p.y - r); ext(c.p.x + r, c.p.y + r);
        }
      }
    }
    return { minX, maxX, minY, maxY };
  };

  // --- pack ngang trái→phải (anchor giữ gốc, dx=0) ---
  let cursorX = bboxOf(roots[0]).maxX + GAP;
  for (let i = 1; i < roots.length; i++) {
    const root = roots[i];
    const bb = bboxOf(root);
    const dx = cursorX - bb.minX;
    for (const { p } of compFree.get(root)!) p.x += dx;
    cursorX = bb.maxX + dx + GAP;
  }
}
