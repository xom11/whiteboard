// src/stamps/geometry-2d/ai/__tests__/incircleNamed-e2e.test.ts
//
// E2E cho đề "đường tròn nội tiếp (I) tiếp xúc các cạnh tại D, E, F" — tên tâm
// (I) ĐỨNG SAU "nội tiếp", tam giác đứng TRƯỚC "đường tròn".
//   BUG cũ: (a) "đường tròn nội tiếp (I)" bị circleTriangle hiểu nhầm thành
//   "tam giác ABC nội tiếp (I)" → vẽ I là TÂM NGOẠI TIẾP (through3);
//   (b) D, E, F không được dựng → guard named-missing → KHÔNG vẽ được.
import { tryDeterministicFigure } from '../deterministic/tryDeterministicFigure';
import { transpile } from '../../dsl/transpile';

function fig(problem: string) {
  const r = tryDeterministicFigure(problem);
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error('deterministic figure not ok: ' + r.reason);
  return r.figure;
}

describe('incircle "đường tròn nội tiếp (I)" e2e', () => {
  it('parens: incircle inscribedIn I + D,E,F tangency, KHÔNG circumcircle through3', () => {
    const f = fig('cho tam giác ABC, đường tròn nội tiếp (I) tiếp xúc AB, BC, CA tại D, E, F');
    const intents = f.intents as any[];

    // (a) KHÔNG vẽ I là circumcircle (through3) — đây là bug "I = tâm ngoại tiếp".
    expect(intents.some((i) => i.op === 'draw-circle' && i.spec === 'through3')).toBe(false);

    // CÓ incircle inscribedIn (tâm = incenter).
    const circle = intents.find((i) => i.op === 'draw-circle' && i.spec === 'inscribedIn');
    expect(circle).toBeDefined();

    // (b) D, E, F là tangencyPoint của incircle.
    const tang = intents.filter((i) => i.op === 'add-point' && i.constraint?.kind === 'tangencyPoint');
    expect(tang.map((t) => t.name).sort()).toEqual(['D', 'E', 'F']);
    expect(tang.every((t) => t.constraint.circle === circle.name)).toBe(true);

    expect(transpile(f.dsl).ok).toBe(true);
  });

  it('bare (không ngoặc): "đường tròn nội tiếp I tiếp xúc ..." vẫn vẽ được, D/E/F present', () => {
    const f = fig('cho tam giác ABC, đường tròn nội tiếp I tiếp xúc AB, BC, CA tại D, E, F');
    const intents = f.intents as any[];
    const tang = intents.filter((i) => i.op === 'add-point' && i.constraint?.kind === 'tangencyPoint');
    expect(tang.map((t) => t.name).sort()).toEqual(['D', 'E', 'F']);
    expect(transpile(f.dsl).ok).toBe(true);
  });

  it('standalone (KHÔNG "tiếp xúc"): "Cho tam giác ABC có đường tròn nội tiếp (I)." → incircle I, KHÔNG circumcircle', () => {
    const f = fig('Cho tam giác ABC có đường tròn nội tiếp (I).');
    const intents = f.intents as any[];
    expect(intents.some((i) => i.op === 'draw-circle' && i.spec === 'through3')).toBe(false);
    const inc = intents.find((i) => i.op === 'draw-circle' && i.spec === 'inscribedIn');
    expect(inc).toBeDefined();
    expect(inc.name).toBe('I');
    expect(transpile(f.dsl).ok).toBe(true);
  });
});
