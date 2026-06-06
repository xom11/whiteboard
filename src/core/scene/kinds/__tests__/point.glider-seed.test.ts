import '../point';
import { getKind } from '../../registry';

function renderGlider(constraint: Record<string, unknown>, target: unknown) {
  const def = getKind('point')!;
  const created: { type: string; parents: unknown[] }[] = [];
  const board = { create: (type: string, parents: unknown[]) => { created.push({ type, parents }); return {}; } };
  const obj = { id: 'p', kind: 'point', label: 'P', visible: true, locked: false, layer: 'd', schemaVersion: 1, attrs: { constraint } } as never;
  def.render(obj, { jxg: board, resolveRef: () => target } as never);
  return created[0];
}

test('onCircle seed dọc tia tâm→theta (tâm lệch gốc)', () => {
  // circle tâm (10,10); theta = 0 → seed x phải > 10 (bên phải tâm).
  const circle = { center: { X: () => 10, Y: () => 10 } };
  const g = renderGlider({ kind: 'onCircle', circleId: 'c', theta: 0 }, circle);
  expect(g.type).toBe('glider');
  const [sx] = g.parents as [number, number, unknown];
  expect(sx).toBeGreaterThan(10);
});

test('onLine seed nội suy theo t giữa point1/point2', () => {
  const line = { point1: { X: () => 0, Y: () => 0 }, point2: { X: () => 10, Y: () => 0 } };
  const g = renderGlider({ kind: 'onLine', lineId: 'l', t: 0.5 }, line);
  expect(g.type).toBe('glider');
  const [sx, sy] = g.parents as [number, number, unknown];
  expect(sx).toBeCloseTo(5, 5);
  expect(sy).toBeCloseTo(0, 5);
});
