import { commonTangentRule } from '../commonTangent';
import { segmentClauses } from '../../deterministic/coverage';
import { tryDeterministicFigure } from '../../deterministic/tryDeterministicFigure';

function intents(problem: string) {
  return commonTangentRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('commonTangentRule', () => {
  // vxhung #37: "Vẽ tiếp tuyến chung ngoài BC (B, C thứ tự là các tiếp điểm
  //  thuộc (O; R) và (O'; R'))."
  it('"tiếp tuyến chung ngoài BC của hai đường tròn (O) và (O\')" → 2 circle + 2 commonTangentPoint + connect', () => {
    const all = intents(
      "Vẽ tiếp tuyến chung ngoài BC của hai đường tròn (O) và (O') với B thuộc (O), C thuộc (O').",
    );
    // 2 đường tròn đặt như twoCirclesTangent (free centers).
    expect(all).toContainEqual(
      expect.objectContaining({ op: 'draw-circle', name: 'O', center: 'O' }),
    );
    expect(all).toContainEqual(
      expect.objectContaining({ op: 'draw-circle', name: "O'", center: "O'" }),
    );
    const b = all.find((i) => i.name === 'B');
    const c = all.find((i) => i.name === 'C');
    expect(b.constraint).toMatchObject({
      kind: 'commonTangentPoint', circles: ['O', "O'"], on: 0, variant: 'external', side: 0,
    });
    expect(c.constraint).toMatchObject({
      kind: 'commonTangentPoint', circles: ['O', "O'"], on: 1, variant: 'external', side: 0,
    });
    // tiếp tuyến = connect 2 tiếp điểm.
    expect(all).toContainEqual(
      expect.objectContaining({ op: 'connect', from: 'B', to: 'C' }),
    );
  });

  it('"tiếp tuyến chung trong DE" → variant internal, D on=0 / E on=1', () => {
    const all = intents(
      "Kẻ tiếp tuyến chung trong DE của hai đường tròn (O) và (O') với D thuộc (O), E thuộc (O').",
    );
    const d = all.find((i) => i.name === 'D');
    const e = all.find((i) => i.name === 'E');
    expect(d.constraint).toMatchObject({ kind: 'commonTangentPoint', on: 0, variant: 'internal' });
    expect(e.constraint).toMatchObject({ kind: 'commonTangentPoint', on: 1, variant: 'internal' });
  });

  it('không nêu ngoài/trong → mặc định external', () => {
    const all = intents(
      "Tiếp tuyến chung BC của hai đường tròn (O) và (O').",
    );
    const b = all.find((i) => i.name === 'B');
    expect(b.constraint).toMatchObject({ variant: 'external' });
  });

  // biến thể "(B, C) thứ tự là các tiếp điểm" — không có ràng buộc ∈ tường minh.
  it('biến thể "B, C lần lượt là các tiếp điểm" vẫn gán đúng on', () => {
    const all = intents(
      "Vẽ tiếp tuyến chung ngoài BC của hai đường tròn (O) và (O'), B và C lần lượt là các tiếp điểm.",
    );
    const b = all.find((i) => i.name === 'B');
    const c = all.find((i) => i.name === 'C');
    expect(b.constraint).toMatchObject({ on: 0 });
    expect(c.constraint).toMatchObject({ on: 1 });
  });

  it('hai tâm trùng tên (OCR mất prime) → bỏ qua (escalate)', () => {
    expect(
      intents("Vẽ tiếp tuyến chung ngoài BC của hai đường tròn (O) và (O)."),
    ).toEqual([]);
  });

  it('không nuốt "tiếp tuyến" đơn (1 đường tròn)', () => {
    expect(
      intents('Kẻ tiếp tuyến AB của đường tròn (O).'),
    ).toEqual([]);
  });

  it('tiếp điểm trùng tâm → bỏ qua', () => {
    expect(
      intents("Tiếp tuyến chung OC của hai đường tròn (O) và (O')."),
    ).toEqual([]);
  });

  it('end-to-end: hình hợp lệ, B và C có toạ độ hữu hạn', () => {
    const r = tryDeterministicFigure(
      "Cho hai đường tròn (O) và (O') ở ngoài nhau. Vẽ tiếp tuyến chung ngoài BC của hai đường tròn (O) và (O') với B thuộc (O), C thuộc (O').",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const pts = (r as any).figure.dsl.points as any[];
    const names = pts.map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining(['B', 'C']));
  });
});
