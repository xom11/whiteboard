// src/stamps/geometry-2d/ai/deterministic/skeleton.ts
//
// Parse base shapes from Vietnamese problem statement.

import type { DslPointT, DslShapeT } from '../../dsl/schema';

export interface SkeletonResult {
  readonly points: DslPointT[];
  readonly shapes: DslShapeT[];
  readonly matched: string[];
}

const TRI_RE = /tam\s*giác(?:\s+(?:vuông|cân|đều))?\s+([A-Z])([A-Z])([A-Z])/i;
const TRI_RIGHT_RE = /tam\s*giác(?:\s+([A-Z])([A-Z])([A-Z]))?\s+vuông\s+tại\s+([A-Z])/i;
const TRI_ISOSCELES_RE = /tam\s*giác(?:\s+([A-Z])([A-Z])([A-Z]))?\s+cân\s+tại\s+([A-Z])/i;
const TRI_EQUILATERAL_RE = /tam\s*giác\s+đều\s+([A-Z])([A-Z])([A-Z])/i;

export function parseSkeleton(prompt: string): SkeletonResult {
  const points: DslPointT[] = [];
  const shapes: DslShapeT[] = [];
  const matched: string[] = [];

  parseTriangle(prompt, points, shapes, matched);

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
    pushTriangleSegments(shapes, A, B, C);
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
      pushTriangleSegments(shapes, labels[0], labels[1], labels[2]);
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
      pushTriangleSegments(shapes, labels[0], labels[1], labels[2]);
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
    pushTriangleSegments(shapes, A, B, C);
    matched.push('triangle');
  }
}

function pushTriangleSegments(shapes: DslShapeT[], a: string, b: string, c: string): void {
  shapes.push(
    { name: a + b, kind: 'segment', p1: a, p2: b },
    { name: b + c, kind: 'segment', p1: b, p2: c },
    { name: c + a, kind: 'segment', p1: c, p2: a },
  );
}

function extractAnyTriple(prompt: string): string[] | null {
  const m = prompt.match(/([A-Z])([A-Z])([A-Z])/);
  if (!m) return null;
  return [m[1], m[2], m[3]];
}
