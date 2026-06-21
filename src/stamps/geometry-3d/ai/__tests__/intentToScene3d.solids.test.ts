import { intentToScene3d } from '../intentToScene3d';
import { solid, addPoint3d, sphereIntent, coneIntent, cylinderIntent } from '../intent';

describe('intentToScene3d — sphere', () => {
  it('mặt cầu ngoại tiếp tứ diện: sphere3d + tâm cách đều', () => {
    const st = intentToScene3d([
      solid({ flavor: 'tetrahedron', baseLabels: ['A', 'B', 'C'], baseVariant: 'equilateral-triangle', apex: 'D', apexVariant: 'regular' }),
      addPoint3d('O', { kind: 'circumsphereCenter', vertices: ['A', 'B', 'C', 'D'] }),
      sphereIntent({ center: 'O', surfacePoint: 'A' }),
    ]);
    const objs = Object.values(st.objects);
    const sph = objs.find((o) => o.kind === 'sphere3d');
    expect(sph).toBeDefined();
    const center = objs.find((o) => o.label === 'O');
    expect(center).toBeDefined();
    // sphere3d refs trỏ id điểm hợp lệ (không phải nhãn thô)
    const a = sph!.attrs as any;
    expect(st.objects[a.center]).toBeDefined();
    expect(st.objects[a.surfacePoint]).toBeDefined();
  });
});

describe('intentToScene3d — cone/cylinder', () => {
  it('cone3d từ 2 điểm free + radius', () => {
    const st = intentToScene3d([
      addPoint3d('O', { kind: 'free', x: 0, y: 0, z: -1.2 }),
      addPoint3d('S', { kind: 'free', x: 0, y: 0, z: 1.2 }),
      coneIntent({ baseCenter: 'O', apex: 'S', radius: 1.4 }),
    ]);
    const co = Object.values(st.objects).find((o) => o.kind === 'cone3d') as any;
    expect(co).toBeDefined();
    expect(co.attrs.radius).toBe(1.4);
    expect(st.objects[co.attrs.baseCenter]).toBeDefined();
    expect(st.objects[co.attrs.apex]).toBeDefined();
  });

  it('cylinder3d từ 2 điểm free + radius', () => {
    const st = intentToScene3d([
      addPoint3d('O', { kind: 'free', x: 0, y: 0, z: -1.2 }),
      addPoint3d('I', { kind: 'free', x: 0, y: 0, z: 1.2 }),
      cylinderIntent({ baseCenter: 'O', topCenter: 'I', radius: 1.4 }),
    ]);
    const cy = Object.values(st.objects).find((o) => o.kind === 'cylinder3d') as any;
    expect(cy).toBeDefined();
    expect(cy.attrs.radius).toBe(1.4);
    expect(st.objects[cy.attrs.topCenter]).toBeDefined();
  });
});
