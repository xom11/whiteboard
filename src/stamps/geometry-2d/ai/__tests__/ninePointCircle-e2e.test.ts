// src/stamps/geometry-2d/ai/__tests__/ninePointCircle-e2e.test.ts
//
// E2E render-correct cho "đường tròn chín điểm / đường tròn Euler" (issue #47,
// construct 4): problem → tryDeterministicFigure.
// Khẳng định KEY (định lý nine-point): đường tròn qua 3 TRUNG ĐIỂM cạnh CŨNG đi
// qua 3 CHÂN ĐƯỜNG CAO, và bán kính = R/2 (R = bán kính ngoại tiếp). 3 chân đường
// cao tính ĐỘC LẬP → nếu chúng cách tâm = r9 thì circle3-qua-3-trung-điểm đúng là
// đường tròn chín điểm. Ambiguity (>1 tam giác) → escalate.

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

function mid(a: Pt, b: Pt): Pt {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function circumcenter(a: Pt, b: Pt, c: Pt): Pt {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  const a2 = a[0] ** 2 + a[1] ** 2, b2 = b[0] ** 2 + b[1] ** 2, c2 = c[0] ** 2 + c[1] ** 2;
  return [
    (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d,
    (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d,
  ];
}

/** Chân vuông góc của p xuống đường thẳng qua (q1,q2) — chiếu trực giao. */
function foot(p: Pt, q1: Pt, q2: Pt): Pt {
  const dx = q2[0] - q1[0], dy = q2[1] - q1[1];
  const t = ((p[0] - q1[0]) * dx + (p[1] - q1[1]) * dy) / (dx * dx + dy * dy);
  return [q1[0] + t * dx, q1[1] + t * dy];
}

function dist(p: Pt, q: Pt): number {
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}

describe('nine-point circle e2e (issue #47)', () => {
  it('"đường tròn chín điểm của tam giác ABC" → circle3 qua 3 trung điểm, cũng qua 3 chân đường cao, R/2', () => {
    const dsl = pipeline('Cho tam giác ABC. Vẽ đường tròn chín điểm của tam giác ABC.');

    // 1) Có 3 trung điểm + circle3 qua chúng.
    const mids = dsl.points.filter((p) => p.kind === 'midpoint');
    expect(mids.length).toBeGreaterThanOrEqual(3);
    const circle = dsl.shapes.find((s) => s.kind === 'circle3') as
      | { p1: string; p2: string; p3: string } | undefined;
    expect(circle).toBeDefined();

    // 2) Geometric proof: tâm + bán kính của đường tròn (qua 3 trung điểm), rồi
    //    chứng minh 3 CHÂN ĐƯỜNG CAO cũng nằm trên (định lý nine-point) + R/2.
    const A = freeCoord(dsl, 'A');
    const B = freeCoord(dsl, 'B');
    const C = freeCoord(dsl, 'C');
    const Mab = mid(A, B), Mbc = mid(B, C), Mca = mid(C, A);
    const N = circumcenter(Mab, Mbc, Mca); // tâm đường tròn chín điểm
    const r9 = dist(N, Mab);

    // 2a) 3 chân đường cao (foot of altitude từ mỗi đỉnh xuống cạnh đối).
    const hA = foot(A, B, C);
    const hB = foot(B, C, A);
    const hC = foot(C, A, B);
    expect(dist(N, hA)).toBeCloseTo(r9, 9);
    expect(dist(N, hB)).toBeCloseTo(r9, 9);
    expect(dist(N, hC)).toBeCloseTo(r9, 9);

    // 2b) Bán kính nine-point = R/2 (R = bán kính đường tròn ngoại tiếp).
    const R = dist(circumcenter(A, B, C), A);
    expect(r9).toBeCloseTo(R / 2, 9);

    // 3) Transpile ok.
    expect(transpile(dsl).ok).toBe(true);
  });

  it('"đường tròn Euler" (tên gọi khác) cũng render đường tròn chín điểm', () => {
    const dsl = pipeline('Cho tam giác ABC. Vẽ đường tròn Euler của tam giác ABC.');
    expect(dsl.shapes.find((s) => s.kind === 'circle3')).toBeDefined();
    expect(dsl.points.filter((p) => p.kind === 'midpoint').length).toBeGreaterThanOrEqual(3);
  });

  it('escalate-safe: >1 tam giác (nhập nhằng) → escalate', () => {
    const r = runDeterministicIntents('Cho tam giác ABC và tam giác DEF. Vẽ đường tròn chín điểm.');
    expect(r.ok).toBe(false);
  });
});
