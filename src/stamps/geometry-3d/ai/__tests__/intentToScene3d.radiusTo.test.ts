import { intentToScene3d } from '../intentToScene3d';
import { addPoint3d, coneIntent, cylinderIntent } from '../intent';

function radiusOf(state: any, kind: string): number {
  const obj = Object.values(state.objects).find((o: any) => o.kind === kind) as any;
  return obj.attrs.radius;
}

describe('build-time radius từ radiusTo', () => {
  it('cone radiusTo: radius = khoảng cách ⊥ trục baseCenter→radiusTo', () => {
    // base O(0,0,0), apex S(0,0,2) (trục z), radiusTo M(1.5,0,0) → radius = 1.5
    const state = intentToScene3d([
      addPoint3d('O', { kind: 'free', x: 0, y: 0, z: 0 }),
      addPoint3d('S', { kind: 'free', x: 0, y: 0, z: 2 }),
      addPoint3d('M', { kind: 'free', x: 1.5, y: 0, z: 0 }),
      coneIntent({ baseCenter: 'O', apex: 'S', radiusTo: 'M' }),
    ]);
    expect(radiusOf(state, 'cone3d')).toBeCloseTo(1.5, 6);
  });
  it('cone radius literal (standalone) KHÔNG đổi', () => {
    const state = intentToScene3d([
      addPoint3d('O', { kind: 'free', x: 0, y: 0, z: -1.2 }),
      addPoint3d('S', { kind: 'free', x: 0, y: 0, z: 1.2 }),
      coneIntent({ baseCenter: 'O', apex: 'S', radius: 1.4 }),
    ]);
    expect(radiusOf(state, 'cone3d')).toBeCloseTo(1.4, 6);
  });
  it('cylinder radiusTo: chiếu ⊥ trục (radiusTo lệch trục vẫn ra bán kính ⊥)', () => {
    // base O(0,0,0), top I(0,0,3), radiusTo M(2,0,1) → thành phần ⊥ trục z = 2
    const state = intentToScene3d([
      addPoint3d('O', { kind: 'free', x: 0, y: 0, z: 0 }),
      addPoint3d('I', { kind: 'free', x: 0, y: 0, z: 3 }),
      addPoint3d('M', { kind: 'free', x: 2, y: 0, z: 1 }),
      cylinderIntent({ baseCenter: 'O', topCenter: 'I', radiusTo: 'M' }),
    ]);
    expect(radiusOf(state, 'cylinder3d')).toBeCloseTo(2, 6);
  });
});
