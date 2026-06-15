import { radiusRule } from '../radius';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  return radiusRule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m) => m.intents as any[]);
}

describe('radiusRule', () => {
  // httcd:6 — "Vẽ hai bán kính OA, OB" → A,B trên đường tròn O + đoạn OA, OB.
  it('"Vẽ hai bán kính OA, OB" → A,B onCircle O + connect', () => {
    const all = intents('Cho đường tròn (O; R). Vẽ hai bán kính OA, OB.');
    const a = all.find((i) => i.name === 'A');
    const b = all.find((i) => i.name === 'B');
    expect(a.constraint).toMatchObject({ kind: 'onCircle', circle: 'O' });
    expect(b.constraint).toMatchObject({ kind: 'onCircle', circle: 'O' });
    expect(a.constraint.theta).not.toBe(b.constraint.theta);
    expect(all).toContainEqual({ op: 'connect', from: 'O', to: 'A', style: 'segment' });
    expect(all).toContainEqual({ op: 'connect', from: 'O', to: 'B', style: 'segment' });
  });

  it('"Kẻ bán kính OM" (đơn) → M onCircle O', () => {
    const all = intents('Cho (O). Kẻ bán kính OM.');
    expect(all.find((i) => i.name === 'M')?.constraint).toMatchObject({ kind: 'onCircle', circle: 'O' });
  });

  it('không match khi 2 bán kính khác tâm (OA, IB)', () => {
    expect(intents('Cho (O). Vẽ hai bán kính OA, IB.')).toEqual([]);
  });

  it('không match khi không có "bán kính"', () => {
    expect(intents('Cho tam giác ABC. Vẽ AO.')).toEqual([]);
  });
});
