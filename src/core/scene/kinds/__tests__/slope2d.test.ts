import { getKind } from '../../registry';
import '../slope2d';

describe('kind slope2d', () => {
  const def = getKind('slope2d');
  it('type = "slope2d"', () => expect(def.type).toBe('slope2d'));
  it('validate ok', () => {
    expect(() => def.validate?.({ pointId: 'p1' })).not.toThrow();
  });
  it('dependsOn → [pointId]', () => {
    expect(def.dependsOn({ pointId: 'p1' })).toEqual(['p1']);
  });
});
