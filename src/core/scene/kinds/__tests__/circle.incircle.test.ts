import '../circle';
import { getKind } from '../../registry';

test('circle kind: construction incircle → board.create("incircle", [A,B,C])', () => {
  const def = getKind('circle')!;
  const created: { type: string; parents: unknown[] }[] = [];
  const board = { create: (type: string, parents: unknown[]) => { created.push({ type, parents }); return { type }; } };
  const refs: Record<string, { id: string }> = { A: { id: 'A' }, B: { id: 'B' }, C: { id: 'C' } };
  const obj = {
    id: 'c1', kind: 'circle', label: 'w', visible: true, locked: false, layer: 'd', schemaVersion: 1,
    attrs: { construction: { kind: 'incircle', p1: 'A', p2: 'B', p3: 'C' } },
  } as never;
  def.render(obj, { jxg: board, resolveRef: (id: string) => refs[id] } as never);
  expect(created[0].type).toBe('incircle');
  expect(created[0].parents).toEqual([{ id: 'A' }, { id: 'B' }, { id: 'C' }]);
});

test('dependsOn incircle trả 3 đỉnh', () => {
  const def = getKind('circle')!;
  expect(def.dependsOn({ construction: { kind: 'incircle', p1: 'A', p2: 'B', p3: 'C' } } as never)).toEqual(['A', 'B', 'C']);
});
