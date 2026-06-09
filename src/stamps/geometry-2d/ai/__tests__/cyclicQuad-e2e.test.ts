// src/stamps/geometry-2d/ai/__tests__/cyclicQuad-e2e.test.ts
//
// E2E render-correct cho "tứ giác nội tiếp đường tròn" (issue #46 nhóm C):
//   problem → runDeterministicIntents → intentsToDsl → DslInput.parse → transpile.
//
// KEY (fix 2026-06-09): 4 đỉnh phải CONSTRAINED trên đường tròn (glider onCircle),
// KHÔNG phải free point đặt tĩnh ở toạ độ đồng viên. Trước fix: đỉnh thứ 4 (D) là
// free → kéo đường tròn (di chuyển tâm / 3 đỉnh kia) thì D không đi theo, rời khỏi
// đường tròn. Nay: circle centerRadius (tâm O) + 4 glider → kéo tâm O cả 4 di chuyển,
// luôn đồng viên.

import { tryDeterministicFigure } from '../deterministic/tryDeterministicFigure';
import { type DslInputT } from '../../dsl/schema';
import { transpile } from '../../dsl/transpile';

// Dùng tryDeterministicFigure — ĐÚNG path demo (qua resolveCircleNameCollisions:
// "(O)" name circle trùng center → inject point tâm O + rename circle O→O_c).
function pipeline(problem: string): DslInputT {
  const result = tryDeterministicFigure(problem);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('deterministic figure not ok: ' + result.reason);
  return result.figure.dsl;
}

/** Kiểm tra 4 đỉnh đều là glider onCircle tham chiếu cùng 1 circle có thật. */
function assertConcyclicConstrained(dsl: DslInputT, verts: string[]) {
  const circleId = new Set<string>();
  for (const name of verts) {
    const p = dsl.points.find((q) => q.name === name) as any;
    expect(p).toBeDefined();
    expect(p.kind).toBe('onCircle'); // CONSTRAINED, không phải free
    circleId.add(p.circleId);
  }
  // Cả 4 cùng 1 đường tròn.
  expect(circleId.size).toBe(1);
  const cid = [...circleId][0];
  // circle đó tồn tại (centerRadius → circleCR).
  const circle = dsl.shapes.find((s) => s.name === cid);
  expect(circle).toBeDefined();
  expect((circle as any).kind).toBe('circleCR');
  // polygon nối 4 đỉnh.
  const poly = dsl.shapes.find((s) => s.kind === 'polygon');
  expect(poly).toBeDefined();
  expect((poly as any).vertices).toEqual(verts);
  // transpile ok.
  expect(transpile(dsl).ok).toBe(true);
}

describe('cyclic quadrilateral e2e', () => {
  it('"tứ giác ABCD nội tiếp đường tròn (O)" → 4 glider onCircle + circleCR + polygon', () => {
    const dsl = pipeline('Cho tứ giác ABCD nội tiếp đường tròn (O)');
    assertConcyclicConstrained(dsl, ['A', 'B', 'C', 'D']);
    // Tâm O hiện diện như point (resolveCircleNames inject từ "(O)" = tâm).
    expect(dsl.points.find((p) => p.name === 'O')).toBeDefined();
  });

  it('Pattern B "Đường tròn (O) ngoại tiếp tứ giác MNPQ" → 4 glider + circleCR + polygon', () => {
    const dsl = pipeline('Đường tròn (O) ngoại tiếp tứ giác MNPQ');
    assertConcyclicConstrained(dsl, ['M', 'N', 'P', 'Q']);
  });
});
