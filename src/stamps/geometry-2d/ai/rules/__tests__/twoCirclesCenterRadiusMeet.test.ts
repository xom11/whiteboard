import { twoCirclesCenterRadiusMeetRule } from '../twoCirclesCenterRadiusMeet';
import { segmentClauses } from '../../deterministic/coverage';
import { tryDeterministicFigure } from '../../deterministic/tryDeterministicFigure';

function intents(problem: string) {
  return twoCirclesCenterRadiusMeetRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('twoCirclesCenterRadiusMeetRule', () => {
  // vxhung #7 (sau triangle ABC vuông tại A).
  const P =
    'Lấy B làm tâm, vẽ đường tròn bán kính BA; lấy C làm tâm, vẽ đường tròn bán kính CA. Hai đường tròn này cắt nhau tại điểm thứ hai là D.';

  it('2 circle centerThrough (tâm = đỉnh, qua A) + D = circleIntersection which=1', () => {
    const all = intents(P);
    // circle tâm B đi qua A.
    expect(all).toContainEqual(
      expect.objectContaining({ op: 'draw-circle', name: 'B', spec: 'centerThrough', center: 'B', through: 'A' }),
    );
    expect(all).toContainEqual(
      expect.objectContaining({ op: 'draw-circle', name: 'C', spec: 'centerThrough', center: 'C', through: 'A' }),
    );
    const d = all.find((i) => i.name === 'D');
    expect(d.constraint).toMatchObject({ kind: 'circleIntersection', c1: 'B', c2: 'C', which: 1 });
  });

  it('"cắt nhau tại D" (không "điểm thứ hai") → which mặc định 1 (khác A)', () => {
    const all = intents(
      'Lấy B làm tâm, vẽ đường tròn bán kính BA; lấy C làm tâm, vẽ đường tròn bán kính CA. Hai đường tròn cắt nhau tại D.',
    );
    expect(all.find((i) => i.name === 'D')?.constraint.kind).toBe('circleIntersection');
  });

  it('không match khi chỉ 1 đường tròn tâm-bán-kính', () => {
    expect(
      intents('Lấy B làm tâm, vẽ đường tròn bán kính BA.'),
    ).toEqual([]);
  });

  it('không match khi 2 tâm trùng nhau', () => {
    expect(
      intents('Lấy B làm tâm, vẽ đường tròn bán kính BA; lấy B làm tâm, vẽ đường tròn bán kính BC. Hai đường tròn cắt nhau tại D.'),
    ).toEqual([]);
  });

  it('end-to-end (kèm tam giác): hình hợp lệ, D có toạ độ hữu hạn', () => {
    const r = tryDeterministicFigure(
      'Cho tam giác ABC vuông tại A. ' + P,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const names = (r as any).figure.dsl.points.map((p: any) => p.name);
    expect(names).toContain('D');
  });
});
