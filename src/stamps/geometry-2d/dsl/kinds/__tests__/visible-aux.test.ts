import { transpile } from '../../transpile';

describe('visible flag cho vật dựng phụ', () => {
  it('midpoint visible:false → SceneObject.visible false', () => {
    const r = transpile({
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: -3, y: 0 },
        { name: 'B', kind: 'free', x: 3, y: 0 },
        { name: 'O', kind: 'midpoint', p1: 'A', p2: 'B', visible: false },
      ],
      shapes: [],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const o = Object.values(r.state.objects).find((x) => x.label === 'O')!;
    expect(o.visible).toBe(false);
  });

  it('midpoint không truyền visible → mặc định true', () => {
    const r = transpile({
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: -3, y: 0 },
        { name: 'B', kind: 'free', x: 3, y: 0 },
        { name: 'O', kind: 'midpoint', p1: 'A', p2: 'B' },
      ],
      shapes: [],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const o = Object.values(r.state.objects).find((x) => x.label === 'O')!;
    expect(o.visible).toBe(true);
  });

  it('circleCP visible:false → SceneObject.visible false', () => {
    const r = transpile({
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: -3, y: 0 },
        { name: 'B', kind: 'free', x: 3, y: 0 },
        { name: 'O', kind: 'midpoint', p1: 'A', p2: 'B', visible: false },
      ],
      shapes: [
        { name: 'w', kind: 'circleCP', center: 'O', surfacePoint: 'A', visible: false },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = Object.values(r.state.objects).find((x) => x.label === 'w')!;
    expect(c.visible).toBe(false);
  });
});
