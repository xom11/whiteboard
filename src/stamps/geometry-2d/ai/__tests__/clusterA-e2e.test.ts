// src/stamps/geometry-2d/ai/__tests__/clusterA-e2e.test.ts
import { applyDeterministicCompletion } from '../validator';
import { transpile } from '../../dsl/transpile';
import type { DslInputT } from '../../dsl/schema';
import { DslInput } from '../../dsl/schema';

// Helper: chạy deterministic completion trên DSL rỗng (mô phỏng LLM bỏ sót),
// rồi parse + transpile. Khẳng định kind mới xuất hiện và transpile không throw.
function run(prompt: string, base: DslInputT) {
  const { dsl } = applyDeterministicCompletion(prompt, base);
  const parsed = DslInput.parse(dsl); // schema runtime phải chấp nhận kind mới
  const scene = transpile(parsed);
  return { dsl, scene };
}

describe('Cụm A end-to-end (completion → schema → transpile)', () => {
  it('arcMidpoint: prompt → DSL có arcMidpoint + circle3, transpile OK', () => {
    const triBase: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 3 },
        { name: 'B', kind: 'free', x: -2, y: 0 },
        { name: 'C', kind: 'free', x: 3, y: 0 },
      ],
      shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
    };
    const { dsl, scene } = run('Cho tam giác ABC. M là trung điểm cung BC không chứa A.', triBase);
    expect(dsl.points.some((p) => p.kind === 'arcMidpoint' && p.name === 'M')).toBe(true);
    expect(dsl.shapes.some((s) => s.kind === 'circle3')).toBe(true);
    expect(scene.ok).toBe(true);
  });

  it('excenter: prompt → DSL có excenter, transpile OK', () => {
    const triBase: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 4, y: 0 },
        { name: 'C', kind: 'free', x: 0, y: 3 },
      ],
      shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
    };
    const { dsl, scene } = run('Cho tam giác ABC, J là tâm bàng tiếp góc A.', triBase);
    expect(dsl.points.some((p) => p.kind === 'excenter' && p.name === 'J')).toBe(true);
    expect(scene.ok).toBe(true);
  });

  it('reflectLine: prompt → DSL có reflectLine + segment, transpile OK', () => {
    const base: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 3 },
        { name: 'B', kind: 'free', x: -2, y: 0 },
        { name: 'C', kind: 'free', x: 3, y: 0 },
        { name: 'H', kind: 'orthocenter', vertices: ['A', 'B', 'C'] },
      ],
      shapes: [{ name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] }],
    };
    const { dsl, scene } = run('Cho tam giác ABC trực tâm H. D đối xứng với H qua BC.', base);
    expect(dsl.points.some((p) => p.kind === 'reflectLine' && p.name === 'D')).toBe(true);
    expect(scene.ok).toBe(true);
  });
});
