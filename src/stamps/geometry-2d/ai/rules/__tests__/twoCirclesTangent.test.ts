import { twoCirclesTangentRule } from '../twoCirclesTangent';
import { segmentClauses } from '../../deterministic/coverage';
import { tryPartialDeterministic } from '../../deterministic/runDeterministicIntents';

function intents(problem: string) {
  return twoCirclesTangentRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('twoCirclesTangentRule', () => {
  it('"(O) và (O′) tiếp xúc ngoài tại A" → 2 đường tròn centerThrough + A free', () => {
    const all = intents('Cho hai đường tròn (O) và (O′) tiếp xúc ngoài tại A.');
    expect(all.find((i) => i.name === 'A')?.constraint.kind).toBe('free');
    expect(all).toContainEqual({ op: 'draw-circle', name: 'O_t', spec: 'centerThrough', center: 'O', through: 'A' });
    expect(all).toContainEqual({ op: 'draw-circle', name: "O'_t", spec: 'centerThrough', center: "O'", through: 'A' });
  });

  it('"tiếp xúc nhau tại A" cũng khớp (= tiếp xúc ngoài)', () => {
    const all = intents('Cho hai đường tròn (O) và (O′) tiếp xúc nhau tại A.');
    expect(all.find((i) => i.name === 'A')?.constraint.kind).toBe('free');
  });

  it('"tiếp xúc trong" bị bỏ qua (defer)', () => {
    expect(intents('Cho hai đường tròn (O) và (O′) tiếp xúc trong tại A.')).toHaveLength(0);
  });

  it('2 tâm trùng tên (OCR mất prime) → escalate', () => {
    expect(intents('Cho hai đường tròn (O) và (O) tiếp xúc ngoài tại A.')).toHaveLength(0);
  });

  it('partial render: detIntents > 0 (rời NONE)', () => {
    const p = tryPartialDeterministic(
      'Cho hai đường tròn (O) và (O′) tiếp xúc ngoài tại A. Gọi CD là tiếp tuyến chung ngoài của hai đường tròn.',
    );
    expect(p.detIntents.length).toBeGreaterThan(0);
  });
});
