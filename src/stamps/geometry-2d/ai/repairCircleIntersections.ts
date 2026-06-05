import type { DslPointT, DslShapeT } from '../dsl/schema';

// Reposition auto-injected circle centers so two circles referenced by a
// `circleIntersection` point actually cross at TWO points.
//
// Bối cảnh: builder inject free coord cho circle center theo bảng spread cách
// nhau ~6 unit. Hai circle centerRadius cùng r=3 → distance = 6 = r1+r2 →
// tiếp xúc ngoài (1 điểm) → JSXGraph intersection branch 0/1 trùng nhau hoặc
// NaN → cascade hỏng (bug eval cau-08). Disjoint (d > r1+r2) còn tệ hơn.
//
// Điều kiện 2 giao điểm:  |r1-r2| < d < r1+r2.
// Khi d nằm ngoài "vùng an toàn" (sát biên tiếp xúc / disjoint), dời 1 center
// FREE dọc theo hướng hiện tại về khoảng cách mục tiêu = trung điểm của khoảng
// hợp lệ = (|r1-r2| + r1+r2)/2 = max(r1, r2). Giữ nguyên hướng để bố cục tương
// đối không đảo lộn.

type FreePoint = Extract<DslPointT, { kind: 'free' }>;

/** Resolve toạ độ tĩnh cho center (free hoặc midpoint của free/midpoint). */
function resolveCoord(points: DslPointT[], name: string): [number, number] | null {
  const p = points.find((x) => x.name === name);
  if (!p) return null;
  if (p.kind === 'free') return [p.x, p.y];
  if (p.kind === 'midpoint') {
    const a = resolveCoord(points, p.p1);
    const b = resolveCoord(points, p.p2);
    if (!a || !b) return null;
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  }
  return null;
}

export function repairCircleIntersections(points: DslPointT[], shapes: DslShapeT[]): void {
  const shapeByName = new Map(shapes.map((s) => [s.name, s]));

  for (const pt of points) {
    if (pt.kind !== 'circleIntersection') continue;
    const c1 = shapeByName.get(pt.c1);
    const c2 = shapeByName.get(pt.c2);
    if (!c1 || !c2 || c1.kind !== 'circleCR' || c2.kind !== 'circleCR') continue;

    const r1 = c1.radius;
    const r2 = c2.radius;
    const lower = Math.abs(r1 - r2);
    const upper = r1 + r2;

    const coord1 = resolveCoord(points, c1.center);
    const coord2 = resolveCoord(points, c2.center);
    if (!coord1 || !coord2) continue;

    const d = Math.hypot(coord1[0] - coord2[0], coord1[1] - coord2[1]);
    const safeLow = lower * 1.05 + 1e-6;
    const safeHigh = upper * 0.95;
    if (d > safeLow && d < safeHigh) continue; // đã cắt 2 điểm gọn gàng

    // Cần 1 center FREE để dời. Ưu tiên center của c2 (thường inject sau), fallback c1.
    const p1 = points.find((p) => p.name === c1.center);
    const p2 = points.find((p) => p.name === c2.center);
    let mover: FreePoint | undefined;
    let anchor: [number, number] | undefined;
    if (p2?.kind === 'free') { mover = p2; anchor = coord1; }
    else if (p1?.kind === 'free') { mover = p1; anchor = coord2; }
    if (!mover || !anchor) continue; // không có center free để dời an toàn

    const targetD = (lower + upper) / 2; // = max(r1, r2)
    let dx = mover.x - anchor[0];
    let dy = mover.y - anchor[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) { dx = 1; dy = 0; }
    const norm = Math.hypot(dx, dy) || 1;
    mover.x = anchor[0] + (targetD * dx) / norm;
    mover.y = anchor[1] + (targetD * dy) / norm;
  }
}
