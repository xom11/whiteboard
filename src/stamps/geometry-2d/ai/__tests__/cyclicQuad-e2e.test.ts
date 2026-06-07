// src/stamps/geometry-2d/ai/__tests__/cyclicQuad-e2e.test.ts
//
// E2E render-correct cho "tứ giác nội tiếp đường tròn" (issue #46 nhóm C):
//   problem → runDeterministicIntents → intentsToDsl → DslInput.parse → transpile.
// Khẳng định KEY: 4 đỉnh ĐỒNG VIÊN (concyclic) — circumcenter của A,B,C cách
// đều cả 4 điểm trong 1e-9 → đường tròn circle3 thực sự đi qua đỉnh thứ 4.

import { runDeterministicIntents } from '../deterministic/runDeterministicIntents';
import { intentsToDsl } from '../intentToDsl';
import { DslInput, type DslInputT } from '../../dsl/schema';
import { transpile } from '../../dsl/transpile';

function pipeline(problem: string): DslInputT {
  const result = runDeterministicIntents(problem);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('deterministic pipeline not ok');
  const dsl = intentsToDsl(result.intents);
  const parsed = DslInput.parse(dsl); // throws on invalid
  return parsed as DslInputT;
}

function freeCoord(dsl: DslInputT, name: string): [number, number] {
  const p = dsl.points.find((q) => q.name === name);
  if (!p || p.kind !== 'free') throw new Error(`point ${name} không phải free`);
  return [p.x, p.y];
}

/** Circumcenter của 3 điểm (giao 2 trung trực). */
function circumcenter(
  a: [number, number],
  b: [number, number],
  c: [number, number],
): [number, number] {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  const ax2 = a[0] * a[0] + a[1] * a[1];
  const bx2 = b[0] * b[0] + b[1] * b[1];
  const cx2 = c[0] * c[0] + c[1] * c[1];
  const ux = (ax2 * (b[1] - c[1]) + bx2 * (c[1] - a[1]) + cx2 * (a[1] - b[1])) / d;
  const uy = (ax2 * (c[0] - b[0]) + bx2 * (a[0] - c[0]) + cx2 * (b[0] - a[0])) / d;
  return [ux, uy];
}

function dist(p: [number, number], q: [number, number]): number {
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}

describe('cyclic quadrilateral e2e', () => {
  it('"tứ giác ABCD nội tiếp đường tròn (O)" → circle3 + polygon đồng viên', () => {
    const dsl = pipeline('Cho tứ giác ABCD nội tiếp đường tròn (O)');

    // 1) Có circle3.
    const circle = dsl.shapes.find((s) => s.kind === 'circle3');
    expect(circle).toBeDefined();

    // 2) Có polygon vertices [A,B,C,D].
    const poly = dsl.shapes.find((s) => s.kind === 'polygon');
    expect(poly).toBeDefined();
    expect((poly as any).vertices).toEqual(['A', 'B', 'C', 'D']);

    // 3) 4 điểm ĐỒNG VIÊN — circumcenter(A,B,C) cách đều cả 4 trong 1e-9.
    const A = freeCoord(dsl, 'A');
    const B = freeCoord(dsl, 'B');
    const C = freeCoord(dsl, 'C');
    const D = freeCoord(dsl, 'D');
    const center = circumcenter(A, B, C);
    const rA = dist(center, A);
    expect(dist(center, B)).toBeCloseTo(rA, 9);
    expect(dist(center, C)).toBeCloseTo(rA, 9);
    expect(dist(center, D)).toBeCloseTo(rA, 9); // đỉnh thứ 4 thực sự trên đường tròn

    // 4) Transpile ok.
    const t = transpile(dsl);
    expect(t.ok).toBe(true);
  });

  it('Pattern B "Đường tròn (O) ngoại tiếp tứ giác MNPQ" → đồng viên + transpile ok', () => {
    const dsl = pipeline('Đường tròn (O) ngoại tiếp tứ giác MNPQ');

    expect(dsl.shapes.find((s) => s.kind === 'circle3')).toBeDefined();
    const poly = dsl.shapes.find((s) => s.kind === 'polygon');
    expect((poly as any).vertices).toEqual(['M', 'N', 'P', 'Q']);

    const M = freeCoord(dsl, 'M');
    const N = freeCoord(dsl, 'N');
    const P = freeCoord(dsl, 'P');
    const Q = freeCoord(dsl, 'Q');
    const center = circumcenter(M, N, P);
    const rM = dist(center, M);
    expect(dist(center, N)).toBeCloseTo(rM, 9);
    expect(dist(center, P)).toBeCloseTo(rM, 9);
    expect(dist(center, Q)).toBeCloseTo(rM, 9);

    const t = transpile(dsl);
    expect(t.ok).toBe(true);
  });
});
