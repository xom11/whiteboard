// src/core/scene/kinds/__tests__/pointOnCurve.test.ts
import { getKind } from '../../registry';
import '../pointOnCurve';

describe('kind pointOnCurve', () => {
  const def = getKind('pointOnCurve');

  it('type = "pointOnCurve"', () => {
    expect(def.type).toBe('pointOnCurve');
  });

  it('validate ok', () => {
    expect(() => def.validate?.({ functionId: 'f1', x: 1.5 })).not.toThrow();
  });

  it('validate throw khi functionId thiếu', () => {
    expect(() => def.validate?.({ functionId: '', x: 0 } as never)).toThrow(/functionId/i);
  });

  it('validate throw khi x không phải number', () => {
    expect(() => def.validate?.({ functionId: 'f1', x: NaN })).toThrow(/x/i);
  });

  it('dependsOn → [functionId]', () => {
    expect(def.dependsOn({ functionId: 'f1', x: 0 })).toEqual(['f1']);
  });
});
