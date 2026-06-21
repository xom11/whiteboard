import { intentToScene3d } from '../intentToScene3d';
import { solid, addPoint3d, sphereIntent } from '../intent';

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
