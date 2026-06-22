import { intentToScene3d } from '../intentToScene3d';
import { addPoint3d, polygonIntent } from '../intent';

describe('intentToScene3d — polygon', () => {
  it('polygon3d từ 3 nhãn điểm free', () => {
    const st = intentToScene3d([
      addPoint3d('A', { kind: 'free', x: -1.4, y: 0, z: -1.2 }),
      addPoint3d('S', { kind: 'free', x: 0, y: 0, z: 1.2 }),
      addPoint3d('B', { kind: 'free', x: 1.4, y: 0, z: -1.2 }),
      polygonIntent({ vertices: ['A', 'S', 'B'] }),
    ]);
    const poly = Object.values(st.objects).find((o) => o.kind === 'polygon3d') as any;
    expect(poly).toBeDefined();
    // vertices = id điểm hợp lệ (không phải nhãn thô)
    expect(poly.attrs.vertices).toHaveLength(3);
    for (const id of poly.attrs.vertices) expect(st.objects[id]).toBeDefined();
  });
});
