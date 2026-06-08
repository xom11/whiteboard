// src/stamps/geometry-2d/ai/__tests__/simsonLine-e2e.test.ts
//
// E2E render-correct cho "đường thẳng Simson" (issue #47, construct 3):
//   problem → tryDeterministicFigure (gate production, đã resolve circle names).
// Khẳng định KEY (định lý Simson): P trên đường tròn ngoại tiếp ABC → 3 chân
// vuông góc hạ từ P xuống 3 CẠNH (đường vô hạn BC/CA/AB) THẲNG HÀNG — cross-product
// ≈ 0 trong 1e-9. 3 chân tính ĐỘC LẬP bằng phép chiếu trực giao. Suy biến: thiếu
// đường tròn ngoại tiếp / >1 tam giác → escalate.

import { tryDeterministicFigure } from '../deterministic/tryDeterministicFigure';
import { runDeterministicIntents } from '../deterministic/runDeterministicIntents';
import { type DslInputT } from '../../dsl/schema';
import { transpile } from '../../dsl/transpile';

function pipeline(problem: string): DslInputT {
  const r = tryDeterministicFigure(problem);
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error('deterministic figure not ok: ' + r.reason);
  return r.figure.dsl;
}

type Pt = [number, number];

function freeCoord(dsl: DslInputT, name: string): Pt {
  const p = dsl.points.find((q) => q.name === name);
  if (!p || p.kind !== 'free') throw new Error(`point ${name} không phải free`);
  return [p.x, p.y];
}

function circumcenter(a: Pt, b: Pt, c: Pt): Pt {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  const a2 = a[0] ** 2 + a[1] ** 2, b2 = b[0] ** 2 + b[1] ** 2, c2 = c[0] ** 2 + c[1] ** 2;
  return [
    (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d,
    (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d,
  ];
}

/** Chân vuông góc của p xuống đường thẳng qua (q1,q2) — chiếu trực giao (đường vô hạn). */
function foot(p: Pt, q1: Pt, q2: Pt): Pt {
  const dx = q2[0] - q1[0], dy = q2[1] - q1[1];
  const t = ((p[0] - q1[0]) * dx + (p[1] - q1[1]) * dy) / (dx * dx + dy * dy);
  return [q1[0] + t * dx, q1[1] + t * dy];
}

function cross(g: Pt, p: Pt, q: Pt): number {
  return (p[0] - g[0]) * (q[1] - g[1]) - (p[1] - g[1]) * (q[0] - g[0]);
}

function dist(p: Pt, q: Pt): number {
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}

describe('Simson line e2e (issue #47)', () => {
  it('"tam giác ABC nội tiếp (O), Simson của P" → 3 chân thẳng hàng', () => {
    const dsl = pipeline(
      'Cho tam giác ABC nội tiếp đường tròn (O). P là điểm trên (O). Vẽ đường thẳng Simson của P.',
    );

    // 1) P là onCircle, có 3 chân perpFoot, có lineThrough.
    const pOnCircle = dsl.points.find((p) => p.kind === 'onCircle') as
      | { name: string; circleId: string; theta: number } | undefined;
    expect(pOnCircle).toBeDefined();
    const feet = dsl.points.filter((p) => p.kind === 'perpFoot') as Array<{
      name: string; from: string; onLine: string;
    }>;
    expect(feet).toHaveLength(3);
    const line = dsl.shapes.find((s) => s.kind === 'lineThrough') as
      | { points: string[] } | undefined;
    expect(line).toBeDefined();
    expect(new Set(line!.points)).toEqual(new Set(feet.map((f) => f.name)));

    // 2) Geometric proof (định lý Simson): tính P từ circumcircle + theta, chiếu
    //    xuống 3 cạnh, 3 chân thẳng hàng.
    const A = freeCoord(dsl, 'A');
    const B = freeCoord(dsl, 'B');
    const C = freeCoord(dsl, 'C');
    const O = circumcenter(A, B, C);
    const R = dist(O, A);
    const theta = pOnCircle!.theta;
    const P: Pt = [O[0] + R * Math.cos(theta), O[1] + R * Math.sin(theta)];

    // P thật sự trên đường tròn (sanity).
    expect(dist(P, O)).toBeCloseTo(R, 9);

    const fBC = foot(P, B, C);
    const fCA = foot(P, C, A);
    const fAB = foot(P, A, B);

    // 2a) 3 chân phân biệt (test không vacuous — P không trùng đỉnh).
    expect(dist(fBC, fCA)).toBeGreaterThan(0.05);
    expect(dist(fCA, fAB)).toBeGreaterThan(0.05);

    // 2b) THẲNG HÀNG: (fCA−fBC) × (fAB−fBC) ≈ 0.
    expect(cross(fBC, fCA, fAB)).toBeCloseTo(0, 9);

    // 3) Transpile ok.
    expect(transpile(dsl).ok).toBe(true);
  });

  it('escalate-safe: thiếu đường tròn ngoại tiếp → không đặt được P → escalate', () => {
    const r = runDeterministicIntents('Cho tam giác ABC. Vẽ đường thẳng Simson của P.');
    expect(r.ok).toBe(false);
  });

  it('escalate-safe: >1 tam giác (nhập nhằng) → escalate', () => {
    const r = runDeterministicIntents(
      'Cho tam giác ABC nội tiếp (O) và tam giác DEF. Vẽ đường thẳng Simson của P.',
    );
    expect(r.ok).toBe(false);
  });
});
