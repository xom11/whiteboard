import '../circle';
import { getKind } from '../../registry';

test('excircle render: tạo circle function-based (tâm excenter)', () => {
  const def = getKind('circle')!;
  const created: { type: string }[] = [];
  const board = { create: (type: string) => { created.push({ type }); return { type, X: () => 0, Y: () => 0 }; } };
  const refs: Record<string, { X: () => number; Y: () => number }> = {
    A: { X: () => 0, Y: () => 0 }, B: { X: () => 4, Y: () => 0 }, C: { X: () => 0, Y: () => 3 },
  };
  const obj = {
    id: 'c1', kind: 'circle', label: 'w', visible: true, locked: false, layer: 'd', schemaVersion: 1,
    attrs: { construction: { kind: 'excircle', p1: 'A', p2: 'B', p3: 'C', opposite: 'A' } },
  } as never;
  const out = def.render(obj, { jxg: board, resolveRef: (id: string) => refs[id] } as never);
  expect(created.some((c) => c.type === 'circle')).toBe(true);
  expect(out).toBeTruthy();
});

test('dependsOn excircle trả 3 đỉnh', () => {
  const def = getKind('circle')!;
  expect(def.dependsOn({ construction: { kind: 'excircle', p1: 'A', p2: 'B', p3: 'C', opposite: 'A' } } as never)).toEqual(['A', 'B', 'C']);
});
