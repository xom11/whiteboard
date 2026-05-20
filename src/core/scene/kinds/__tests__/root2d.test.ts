import { getKind } from '../../registry';
import '../root2d';

describe('kind root2d', () => {
  const def = getKind('root2d');
  it('type = "root2d"', () => expect(def.type).toBe('root2d'));
  it('validate ok', () => {
    expect(() => def.validate?.({ functionId: 'f1', interval: { min: -5, max: 5 } })).not.toThrow();
  });
  it('validate throw interval invalid', () => {
    expect(() => def.validate?.({ functionId: 'f1', interval: { min: 1, max: 1 } })).toThrow();
  });
  it('dependsOn → [functionId]', () => {
    expect(def.dependsOn({ functionId: 'f1', interval: { min: 0, max: 1 } })).toEqual(['f1']);
  });
});
