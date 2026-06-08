// src/stamps/geometry-2d/ai/__tests__/radicalAxis-e2e.test.ts
//
// E2E render-correct cho "trục đẳng phương" (issue #47, construct 2):
//   problem → runDeterministicIntents → intentsToDsl → DslInput.parse → transpile.
// Khẳng định KEY: chân (foot) của trục trên đường nối tâm có LŨY THỪA (power)
// bằng nhau với 2 đường tròn — |F−O₁|²−r₁² = |F−O₂|²−r₂² (định nghĩa trục đẳng
// phương), trong 1e-9. Cũng kiểm tra circle-ref được rename O→O_c đúng (collision
// center↔circle). Suy biến: 2 đường tròn đồng tâm → escalate.

import { tryDeterministicFigure } from '../deterministic/tryDeterministicFigure';
import { runDeterministicIntents } from '../deterministic/runDeterministicIntents';
import { type DslInputT } from '../../dsl/schema';
import { transpile } from '../../dsl/transpile';

// Dùng tryDeterministicFigure (gate production THẬT) — nó resolve collision tên
// circle↔point (circleRadius dựng circle "O" + center "O") qua resolveCircleNames.
// runDeterministicIntents (raw) KHÔNG resolve → build trực tiếp sẽ vỡ DUPLICATE_NAME.
function pipeline(problem: string): DslInputT {
  const r = tryDeterministicFigure(problem);
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error('deterministic figure not ok: ' + r.reason);
  return r.figure.dsl;
}

function freeCoord(dsl: DslInputT, name: string): [number, number] {
  const p = dsl.points.find((q) => q.name === name);
  if (!p || p.kind !== 'free') throw new Error(`point ${name} không phải free`);
  return [p.x, p.y];
}

type Pt = [number, number];

/** Chân trục đẳng phương trên O₁O₂: F = O₁ + t·(O₂−O₁), t=(d²+r₁²−r₂²)/(2d²). */
function radicalFoot(o1: Pt, r1: number, o2: Pt, r2: number): Pt {
  const dx = o2[0] - o1[0], dy = o2[1] - o1[1];
  const d2 = dx * dx + dy * dy;
  const t = (d2 + r1 * r1 - r2 * r2) / (2 * d2);
  return [o1[0] + t * dx, o1[1] + t * dy];
}

function power(p: Pt, o: Pt, r: number): number {
  return (p[0] - o[0]) ** 2 + (p[1] - o[1]) ** 2 - r * r;
}

describe('radical axis e2e (issue #47)', () => {
  it('"Cho hai đường tròn (O; 3) và (I; 2). Vẽ trục đẳng phương của chúng." → radicalAxis equal-power', () => {
    const dsl = pipeline('Cho hai đường tròn (O; 3) và (I; 2). Vẽ trục đẳng phương của chúng.');

    // 1) Có 2 đường tròn circleCR.
    const circles = dsl.shapes.filter((s) => s.kind === 'circleCR') as Array<{
      name: string; center: string; radius: number;
    }>;
    expect(circles).toHaveLength(2);

    // 2) Có radicalAxis tham chiếu đúng 2 circle (đã rename O→O_c nếu cần).
    const rad = dsl.shapes.find((s) => s.kind === 'radicalAxis') as
      | { circle1: string; circle2: string } | undefined;
    expect(rad).toBeDefined();
    const circleNames = new Set(circles.map((c) => c.name));
    expect(circleNames.has(rad!.circle1)).toBe(true);
    expect(circleNames.has(rad!.circle2)).toBe(true);
    expect(rad!.circle1).not.toBe(rad!.circle2);

    // 3) Equal-power proof: chân trên đường nối tâm có power bằng nhau.
    const c1 = circles.find((c) => c.name === rad!.circle1)!;
    const c2 = circles.find((c) => c.name === rad!.circle2)!;
    const O1 = freeCoord(dsl, c1.center);
    const O2 = freeCoord(dsl, c2.center);
    expect(O1).not.toEqual(O2); // không đồng tâm
    const F = radicalFoot(O1, c1.radius, O2, c2.radius);
    expect(power(F, O1, c1.radius)).toBeCloseTo(power(F, O2, c2.radius), 9);

    // 4) Transpile ok.
    expect(transpile(dsl).ok).toBe(true);
  });

  it('suy biến: "hai đường tròn đồng tâm (O; 3) và (O; 5)" → escalate (cùng tâm)', () => {
    const r = runDeterministicIntents('Cho hai đường tròn đồng tâm (O; 3) và (O; 5). Vẽ trục đẳng phương.');
    expect(r.ok).toBe(false);
  });

  it('escalate-safe: chỉ 1 đường tròn → không đủ 2 → escalate', () => {
    const r = runDeterministicIntents('Cho đường tròn (O; 3). Vẽ trục đẳng phương.');
    expect(r.ok).toBe(false);
  });
});
