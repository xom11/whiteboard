// src/stamps/geometry-2d/ai/deterministic/skeleton.ts
//
// Parse base shapes from Vietnamese problem statement.

import type { DslPointT, DslShapeT } from '../../dsl/schema';

export interface SkeletonResult {
  readonly points: DslPointT[];
  readonly shapes: DslShapeT[];
  readonly matched: string[];
}

const TRI_RE = /tam\s*giác(?:\s+(?:vuông|cân|đều|nhọn|tù))?\s+([A-Z])([A-Z])([A-Z])/i;
const TRI_RIGHT_RE = /tam\s*giác(?:\s+([A-Z])([A-Z])([A-Z]))?\s+vuông\s+tại\s+([A-Z])/i;
const TRI_ISOSCELES_RE = /tam\s*giác(?:\s+([A-Z])([A-Z])([A-Z]))?\s+cân\s+tại\s+([A-Z])/i;
const TRI_EQUILATERAL_RE = /tam\s*giác\s+đều\s+([A-Z])([A-Z])([A-Z])/i;

const CIRCLE_CR_RE = /\(\s*([A-Z])\s*;\s*R\s*=\s*(\d+(?:[.,]\d+)?)\s*\)/;
const CIRCLE_R_AFTER_RE = /\(\s*([A-Z])\s*\)\s*bán\s*kính\s*(\d+(?:[.,]\d+)?)/i;
const CIRCLE_NAMED_R_RE = /đường\s*tròn\s*tâm\s*([A-Z])\s*bán\s*kính\s*(\d+(?:[.,]\d+)?)/i;

const RECT_RE = /hình\s+chữ\s+nhật\s+([A-Z])([A-Z])([A-Z])([A-Z])/i;
const SQUARE_RE = /hình\s+vuông\s+([A-Z])([A-Z])([A-Z])([A-Z])/i;
const PARALLELOGRAM_RE = /hình\s+bình\s+hành\s+([A-Z])([A-Z])([A-Z])([A-Z])/i;

export function parseSkeleton(prompt: string): SkeletonResult {
  const points: DslPointT[] = [];
  const shapes: DslShapeT[] = [];
  const matched: string[] = [];

  parseQuadrilateral(prompt, points, shapes, matched);
  if (matched.length === 0) {
    parseTriangle(prompt, points, shapes, matched);
  }
  parseCircle(prompt, points, shapes, matched);

  return { points, shapes, matched };
}

function parseTriangle(
  prompt: string,
  points: DslPointT[],
  shapes: DslShapeT[],
  matched: string[],
): void {
  // 1. Equilateral
  const mEq = prompt.match(TRI_EQUILATERAL_RE);
  if (mEq) {
    const [A, B, C] = [mEq[1].toUpperCase(), mEq[2].toUpperCase(), mEq[3].toUpperCase()];
    points.push(
      { name: A, kind: 'free', x: 0, y: 2.6 },
      { name: B, kind: 'free', x: -1.5, y: 0 },
      { name: C, kind: 'free', x: 1.5, y: 0 },
    );
    pushTrianglePolygon(shapes, A, B, C);
    matched.push('triangle', 'triangle-equilateral');
    return;
  }

  // 2. Right
  const mRight = prompt.match(TRI_RIGHT_RE);
  if (mRight) {
    const labels = mRight[1] && mRight[2] && mRight[3]
      ? [mRight[1].toUpperCase(), mRight[2].toUpperCase(), mRight[3].toUpperCase()]
      : extractAnyTriple(prompt) ?? ['A', 'B', 'C'];
    const rightV = mRight[4].toUpperCase();
    const others = labels.filter((l) => l !== rightV);
    if (others.length === 2) {
      points.push(
        { name: rightV, kind: 'free', x: 0, y: 0 },
        { name: others[0], kind: 'free', x: 4, y: 0 },
        { name: others[1], kind: 'free', x: 0, y: 3 },
      );
      pushTrianglePolygon(shapes, labels[0], labels[1], labels[2]);
      matched.push('triangle', 'triangle-right');
      return;
    }
  }

  // 3. Isoceles
  const mIso = prompt.match(TRI_ISOSCELES_RE);
  if (mIso) {
    const labels = mIso[1] && mIso[2] && mIso[3]
      ? [mIso[1].toUpperCase(), mIso[2].toUpperCase(), mIso[3].toUpperCase()]
      : extractAnyTriple(prompt) ?? ['A', 'B', 'C'];
    const apex = mIso[4].toUpperCase();
    const others = labels.filter((l) => l !== apex);
    if (others.length === 2) {
      points.push(
        { name: apex, kind: 'free', x: 0, y: 3 },
        { name: others[0], kind: 'free', x: -2, y: 0 },
        { name: others[1], kind: 'free', x: 2, y: 0 },
      );
      pushTrianglePolygon(shapes, labels[0], labels[1], labels[2]);
      matched.push('triangle', 'triangle-isoceles');
      return;
    }
  }

  // 4. Generic scalene
  const m = prompt.match(TRI_RE);
  if (m) {
    const [A, B, C] = [m[1].toUpperCase(), m[2].toUpperCase(), m[3].toUpperCase()];
    points.push(
      { name: A, kind: 'free', x: 0, y: 3 },
      { name: B, kind: 'free', x: -2, y: 0 },
      { name: C, kind: 'free', x: 3, y: 0 },
    );
    pushTrianglePolygon(shapes, A, B, C);
    matched.push('triangle');
  }
}

// Emit 1 polygon shape thay vì 3 segments. Convention codebase (xem
// fixtures/parallelogram.ts, refineFixtures.ts) — polygon là semantic closed
// shape, single name (vd "ABC") khớp với cách AI prompt emit. Derived patterns
// (perpFoot, midpoint) tự emit segment cạnh khi cần (vd "đường cao AH" tự thêm
// segment BC + AH) — không có duplicate vì check by name.
function pushTrianglePolygon(shapes: DslShapeT[], a: string, b: string, c: string): void {
  shapes.push({ name: a + b + c, kind: 'polygon', vertices: [a, b, c] });
}

function extractAnyTriple(prompt: string): string[] | null {
  const m = prompt.match(/([A-Z])([A-Z])([A-Z])/);
  if (!m) return null;
  return [m[1], m[2], m[3]];
}

function parseQuadrilateral(
  prompt: string,
  points: DslPointT[],
  shapes: DslShapeT[],
  matched: string[],
): void {
  let m = prompt.match(SQUARE_RE);
  if (m) {
    pushQuadFreePoints(points, m, [[0,0],[3,0],[3,3],[0,3]]);
    pushQuadPolygon(shapes, m);
    matched.push('square');
    return;
  }
  m = prompt.match(RECT_RE);
  if (m) {
    pushQuadFreePoints(points, m, [[0,0],[4,0],[4,2.5],[0,2.5]]);
    pushQuadPolygon(shapes, m);
    matched.push('rectangle');
    return;
  }
  m = prompt.match(PARALLELOGRAM_RE);
  if (m) {
    pushQuadFreePoints(points, m, [[0,0],[4,0],[5,2.5],[1,2.5]]);
    pushQuadPolygon(shapes, m);
    matched.push('parallelogram');
    return;
  }
}

function pushQuadFreePoints(
  points: DslPointT[],
  m: RegExpMatchArray,
  coords: [number, number][],
): void {
  for (let i = 0; i < 4; i++) {
    points.push({
      name: m[i + 1].toUpperCase(),
      kind: 'free',
      x: coords[i][0],
      y: coords[i][1],
    });
  }
}

function pushQuadPolygon(shapes: DslShapeT[], m: RegExpMatchArray): void {
  const [a, b, c, d] = [m[1], m[2], m[3], m[4]].map((s) => s.toUpperCase());
  shapes.push({
    name: a + b + c + d,
    kind: 'polygon',
    vertices: [a, b, c, d],
  });
}

function parseCircle(
  prompt: string,
  points: DslPointT[],
  shapes: DslShapeT[],
  matched: string[],
): void {
  let centerName: string | null = null;
  let radius: number | null = null;

  for (const re of [CIRCLE_CR_RE, CIRCLE_R_AFTER_RE, CIRCLE_NAMED_R_RE]) {
    const m = prompt.match(re);
    if (m) {
      centerName = m[1].toUpperCase();
      radius = parseFloat(m[2].replace(',', '.'));
      break;
    }
  }

  if (centerName === null || radius === null) return;

  if (!points.some((p) => p.name === centerName)) {
    points.push({ name: centerName, kind: 'free', x: 0, y: 0 });
  }
  shapes.push({ name: 'omega', kind: 'circleCR', center: centerName, radius });
  matched.push('circle-cr');
}
