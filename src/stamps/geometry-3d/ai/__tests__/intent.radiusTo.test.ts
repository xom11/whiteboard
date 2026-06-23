import { Intent3DZ, coneIntent, cylinderIntent } from '../intent';

describe('cone/cylinder radiusTo (Phase 5b)', () => {
  it('coneIntent radiusTo parse OK, radius optional', () => {
    const parsed = Intent3DZ.parse(coneIntent({ baseCenter: 'O', apex: 'S', radiusTo: 'M' }));
    expect((parsed as any).radiusTo).toBe('M');
    expect((parsed as any).radius).toBeUndefined();
  });
  it('coneIntent radius literal vẫn OK (Phase 4 standalone)', () => {
    const parsed = Intent3DZ.parse(coneIntent({ baseCenter: 'O', apex: 'S', radius: 1.4 }));
    expect((parsed as any).radius).toBe(1.4);
  });
  it('cylinderIntent radiusTo parse OK', () => {
    const parsed = Intent3DZ.parse(cylinderIntent({ baseCenter: 'O', topCenter: 'I', radiusTo: 'M' }));
    expect((parsed as any).radiusTo).toBe('M');
  });
});
