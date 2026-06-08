// src/stamps/geometry-2d/ai/__tests__/eulerLine-e2e.test.ts
//
// E2E render-correct cho "đường thẳng Euler" (issue #47, construct 1):
//   problem → runDeterministicIntents → intentsToDsl → DslInput.parse → transpile.
// Khẳng định KEY: 3 tâm G (trọng tâm), H (trực tâm), O (ngoại tiếp) THẲNG HÀNG
// (cross-product ≈ 0 trong 1e-9) VÀ thoả hệ thức Euler H = 3G − 2O. H được tính
// ĐỘC LẬP qua giao 2 đường cao (KHÔNG dùng O) → collinearity là kiểm tra THẬT,
// không tautology. Suy biến (tam giác đều, G≡H≡O) → escalate fail-safe.

import { runDeterministicIntents } from '../deterministic/runDeterministicIntents';
import { intentsToDsl } from '../intentToDsl';
import { DslInput, type DslInputT } from '../../dsl/schema';
import { transpile } from '../../dsl/transpile';

function pipeline(problem: string): DslInputT {
  const result = runDeterministicIntents(problem);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('deterministic pipeline not ok: ' + result.reason);
  const dsl = intentsToDsl(result.intents);
  return DslInput.parse(dsl) as DslInputT;
}

function freeCoord(dsl: DslInputT, name: string): [number, number] {
  const p = dsl.points.find((q) => q.name === name);
  if (!p || p.kind !== 'free') throw new Error(`point ${name} không phải free`);
  return [p.x, p.y];
}

type Pt = [number, number];

function centroid(a: Pt, b: Pt, c: Pt): Pt {
  return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3];
}

/** Circumcenter của 3 điểm (giao 2 trung trực). */
function circumcenter(a: Pt, b: Pt, c: Pt): Pt {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  const a2 = a[0] * a[0] + a[1] * a[1];
  const b2 = b[0] * b[0] + b[1] * b[1];
  const c2 = c[0] * c[0] + c[1] * c[1];
  const ux = (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d;
  const uy = (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d;
  return [ux, uy];
}

/**
 * Trực tâm tính ĐỘC LẬP qua 2 ràng buộc đường cao (KHÔNG dùng circumcenter):
 *   (H−A)·(C−B) = 0   [AH ⊥ BC]
 *   (H−B)·(C−A) = 0   [BH ⊥ AC]
 * Hệ 2 phương trình tuyến tính theo (Hx, Hy).
 */
function orthocenter(a: Pt, b: Pt, c: Pt): Pt {
  // r1: Hx·(Cx−Bx) + Hy·(Cy−By) = Ax·(Cx−Bx) + Ay·(Cy−By)
  const a11 = c[0] - b[0];
  const a12 = c[1] - b[1];
  const r1 = a[0] * (c[0] - b[0]) + a[1] * (c[1] - b[1]);
  // r2: Hx·(Cx−Ax) + Hy·(Cy−Ay) = Bx·(Cx−Ax) + By·(Cy−Ay)
  const a21 = c[0] - a[0];
  const a22 = c[1] - a[1];
  const r2 = b[0] * (c[0] - a[0]) + b[1] * (c[1] - a[1]);
  const det = a11 * a22 - a12 * a21;
  const hx = (r1 * a22 - a12 * r2) / det;
  const hy = (a11 * r2 - r1 * a21) / det;
  return [hx, hy];
}

function cross(g: Pt, p: Pt, q: Pt): number {
  // (P−G) × (Q−G)
  return (p[0] - g[0]) * (q[1] - g[1]) - (p[1] - g[1]) * (q[0] - g[0]);
}

function dist(p: Pt, q: Pt): number {
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}

describe('Euler line e2e (issue #47)', () => {
  it('"Cho tam giác ABC. Vẽ đường thẳng Euler." → lineThrough(G,H,O) thẳng hàng', () => {
    const dsl = pipeline('Cho tam giác ABC. Vẽ đường thẳng Euler.');

    // 1) Có 3 tâm phái sinh.
    expect(dsl.points.find((p) => p.kind === 'centroid')).toBeDefined();
    expect(dsl.points.find((p) => p.kind === 'orthocenter')).toBeDefined();
    expect(dsl.points.find((p) => p.kind === 'circumcenter')).toBeDefined();

    // 2) Có lineThrough đi qua đúng 3 tâm.
    const line = dsl.shapes.find((s) => s.kind === 'lineThrough');
    expect(line).toBeDefined();
    const pts = (line as { points: string[] }).points;
    const centroidName = dsl.points.find((p) => p.kind === 'centroid')!.name;
    const orthoName = dsl.points.find((p) => p.kind === 'orthocenter')!.name;
    const circumName = dsl.points.find((p) => p.kind === 'circumcenter')!.name;
    expect(new Set(pts)).toEqual(new Set([centroidName, orthoName, circumName]));

    // 3) Geometric proof: tính G/O/H từ toạ độ A,B,C (H độc lập với O).
    const A = freeCoord(dsl, 'A');
    const B = freeCoord(dsl, 'B');
    const C = freeCoord(dsl, 'C');
    const G = centroid(A, B, C);
    const O = circumcenter(A, B, C);
    const H = orthocenter(A, B, C);

    // 3a) Không suy biến — 3 tâm phân biệt (test không vacuous).
    expect(dist(G, O)).toBeGreaterThan(0.1);
    expect(dist(G, H)).toBeGreaterThan(0.1);
    expect(dist(H, O)).toBeGreaterThan(0.1);

    // 3b) Thẳng hàng: (H−G) × (O−G) ≈ 0.
    expect(cross(G, H, O)).toBeCloseTo(0, 9);

    // 3c) Hệ thức Euler: H = 3G − 2O (G chia OH theo OG:GH = 1:2).
    expect(H[0]).toBeCloseTo(3 * G[0] - 2 * O[0], 9);
    expect(H[1]).toBeCloseTo(3 * G[1] - 2 * O[1], 9);

    // 4) Transpile ok.
    expect(transpile(dsl).ok).toBe(true);
  });

  it('suy biến: "Cho tam giác đều ABC. Vẽ đường thẳng Euler." → escalate (G≡H≡O)', () => {
    const r = runDeterministicIntents('Cho tam giác đều ABC. Vẽ đường thẳng Euler.');
    // Tam giác đều → 3 tâm trùng → đường Euler không xác định → KHÔNG render det.
    expect(r.ok).toBe(false);
  });
});
