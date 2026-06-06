import { completeRightAngle } from '../completeRightAngle';
import type { IntentT } from '../intent';

const base: IntentT[] = [
  { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
  { op: 'add-point', name: 'K', constraint: { kind: 'perpFoot', from: 'C', onLine: 'AB' } },
];

describe('completeRightAngle', () => {
  it('inject khi LLM thiếu M (đề gốc)', () => {
    const problem = 'Cho tam giác nhọn ABC, đường cao CK. Gọi M là một điểm trên CK sao cho góc AMB = 90 độ.';
    const out = completeRightAngle(base, problem);
    const m = out.find((i) => i.op === 'add-point' && i.name === 'M');
    expect(m).toBeDefined();
    expect((m as any).constraint).toEqual({ kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'CK' });
  });

  it('replace khi LLM emit M với constraint sai', () => {
    const problem = 'M trên CK sao cho góc AMB = 90°.';
    const wrong: IntentT[] = [
      ...base,
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'CK' } },
    ];
    const out = completeRightAngle(wrong, problem);
    const ms = out.filter((i) => i.op === 'add-point' && i.name === 'M');
    expect(ms).toHaveLength(1);
    expect((ms[0] as any).constraint.kind).toBe('rightAngleViewing');
  });

  it('keep khi LLM đã đúng rightAngleViewing', () => {
    const problem = 'M trên CK sao cho góc AMB = 90°.';
    const ok: IntentT[] = [
      ...base,
      { op: 'add-point', name: 'M', constraint: { kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'CK' } },
    ];
    const out = completeRightAngle(ok, problem);
    const ms = out.filter((i) => i.op === 'add-point' && i.name === 'M');
    expect(ms).toHaveLength(1);
    expect((ms[0] as any).constraint).toEqual({ kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'CK' });
  });

  it('phrasing "góc AMB vuông"', () => {
    const out = completeRightAngle(base, 'M thuộc đường thẳng CK sao cho góc AMB vuông.');
    const m = out.find((i) => i.op === 'add-point' && i.name === 'M');
    expect((m as any)?.constraint?.kind).toBe('rightAngleViewing');
  });

  it('phrasing "MA ⊥ MB"', () => {
    const out = completeRightAngle(base, 'M nằm trên CK sao cho MA ⊥ MB.');
    const m = out.find((i) => i.op === 'add-point' && i.name === 'M');
    expect((m as any)?.constraint).toMatchObject({ kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'CK' });
  });

  it('phrasing "MA vuông góc với MB"', () => {
    const out = completeRightAngle(base, 'Điểm M trên đường thẳng d sao cho MA vuông góc với MB.');
    const m = out.find((i) => i.op === 'add-point' && i.name === 'M');
    expect((m as any)?.constraint).toMatchObject({ kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'd' });
  });

  it('no-op khi không có mệnh đề đường', () => {
    const out = completeRightAngle(base, 'Tính góc AMB = 90 độ.');
    expect(out.find((i) => i.op === 'add-point' && i.name === 'M')).toBeUndefined();
  });

  it('no-op khi đề không nhắc góc vuông', () => {
    const out = completeRightAngle(base, 'Cho tam giác ABC, M là trung điểm BC.');
    expect(out).toEqual(base);
  });
});
