import { getKind } from '../../registry';
import '../extremum2d';

describe('kind extremum2d', () => {
  const def = getKind('extremum2d');
  it('type = "extremum2d"', () => expect(def.type).toBe('extremum2d'));
  it('validate ok cho max', () => {
    expect(() => def.validate?.({ functionId: 'f1', interval: { min: -5, max: 5 }, mode: 'max' })).not.toThrow();
  });
  it('validate throw mode invalid', () => {
    expect(() => def.validate?.({ functionId: 'f1', interval: { min: 0, max: 1 }, mode: 'invalid' as never })).toThrow();
  });
  it('validate throw interval invalid', () => {
    expect(() => def.validate?.({ functionId: 'f1', interval: { min: 5, max: 5 }, mode: 'min' })).toThrow();
  });
  it('dependsOn → [functionId]', () => {
    expect(def.dependsOn({ functionId: 'f1', interval: { min: 0, max: 1 }, mode: 'min' })).toEqual(['f1']);
  });
});
