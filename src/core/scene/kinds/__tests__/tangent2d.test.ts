// src/core/scene/kinds/__tests__/tangent2d.test.ts
import { getKind } from '../../registry';
import '../tangent2d';

describe('kind tangent2d', () => {
  const def = getKind('tangent2d');
  it('type = "tangent2d"', () => expect(def.type).toBe('tangent2d'));
  it('validate ok', () => {
    expect(() => def.validate?.({ pointId: 'p1' })).not.toThrow();
  });
  it('validate throw nếu pointId thiếu', () => {
    expect(() => def.validate?.({ pointId: '' } as never)).toThrow();
  });
  it('dependsOn → [pointId]', () => {
    expect(def.dependsOn({ pointId: 'p1' })).toEqual(['p1']);
  });
});
