import '../circle';
import { getKind } from '../../registry';

test('circle kind: construction incircle → board.create("incircle", [A,B,C])', () => {
  const def = getKind('circle')!;
  const created: { type: string; parents: unknown[]; el: any }[] = [];
  const board = {
    create: (type: string, parents: unknown[]) => {
      const el = { type };
      created.push({ type, parents, el });
      return el;
    },
  };
  const refs: Record<string, { id: string }> = { A: { id: 'A' }, B: { id: 'B' }, C: { id: 'C' } };
  const obj = {
    id: 'c1', kind: 'circle', label: 'I', visible: true, locked: false, layer: 'd', schemaVersion: 1,
    attrs: { construction: { kind: 'incircle', p1: 'A', p2: 'B', p3: 'C' } },
  } as never;
  const out = def.render(obj, { jxg: board, resolveRef: (id: string) => refs[id] } as never) as any;
  expect(created[0].type).toBe('incenter');
  expect(created[0].parents).toEqual([{ id: 'A' }, { id: 'B' }, { id: 'C' }]);
  expect(created[1].type).toBe('incircle');
  expect(created[1].parents).toEqual([{ id: 'A' }, { id: 'B' }, { id: 'C' }]);
  expect(out.center).toBe(created[0].el);
  expect(out._helpers).toEqual([created[0].el]);
});

test('circle kind: circumscribed tên "_c" (đã tách tâm) → circle KHÔNG hiện nhãn', () => {
  // resolveCircleNameCollisions tách tâm "(O)" thành scene point + đổi tên circle
  // → "O_c". "_c" là id nội bộ, KHÔNG phải nhãn hiển thị: circle phải withLabel
  // false (nếu không sẽ hiện "O_c" nổi trên vòng tròn). Tâm O nằm ở scene point
  // riêng.
  const def = getKind('circle')!;
  const created: { type: string; attrs: any }[] = [];
  const board = {
    create: (type: string, _parents: unknown[], attrs?: any) => {
      const el = { type };
      created.push({ type, attrs });
      return el;
    },
  };
  const refs: Record<string, { id: string }> = { A: { id: 'A' }, B: { id: 'B' }, C: { id: 'C' } };
  const obj = {
    id: 'c1', kind: 'circle', label: 'O_c', visible: true, locked: false, layer: 'd', schemaVersion: 1,
    attrs: { construction: { kind: 'circumscribed', p1: 'A', p2: 'B', p3: 'C' } },
  } as never;
  def.render(obj, { jxg: board, resolveRef: (id: string) => refs[id] } as never);
  // Không vẽ helper circumcenter (isCenter false) — chỉ 1 circle.
  expect(created).toHaveLength(1);
  expect(created[0].type).toBe('circumcircle');
  expect(created[0].attrs).toMatchObject({ withLabel: false });
});

test('circle kind: incircle tên "_c" (đã tách tâm) → circle KHÔNG hiện nhãn', () => {
  const def = getKind('circle')!;
  const created: { type: string; attrs: any }[] = [];
  const board = {
    create: (type: string, _parents: unknown[], attrs?: any) => {
      const el = { type };
      created.push({ type, attrs });
      return el;
    },
  };
  const refs: Record<string, { id: string }> = { A: { id: 'A' }, B: { id: 'B' }, C: { id: 'C' } };
  const obj = {
    id: 'c1', kind: 'circle', label: 'I_c', visible: true, locked: false, layer: 'd', schemaVersion: 1,
    attrs: { construction: { kind: 'incircle', p1: 'A', p2: 'B', p3: 'C' } },
  } as never;
  def.render(obj, { jxg: board, resolveRef: (id: string) => refs[id] } as never);
  expect(created).toHaveLength(1);
  expect(created[0].type).toBe('incircle');
  expect(created[0].attrs).toMatchObject({ withLabel: false });
});

test('dependsOn incircle trả 3 đỉnh', () => {
  const def = getKind('circle')!;
  expect(def.dependsOn({ construction: { kind: 'incircle', p1: 'A', p2: 'B', p3: 'C' } } as never)).toEqual(['A', 'B', 'C']);
});

test('circle kind: transpiled incircle attrs render visible incenter helper', () => {
  const def = getKind('circle')!;
  const created: { type: string; parents: unknown[]; attrs: any; el: any }[] = [];
  const board = {
    create: (type: string, parents: unknown[], attrs?: any) => {
      const el = { type };
      created.push({ type, parents, attrs, el });
      return el;
    },
  };
  const refs: Record<string, { id: string }> = { A: { id: 'A' }, B: { id: 'B' }, C: { id: 'C' } };
  const obj = {
    id: 'c1', kind: 'circle', label: 'I', visible: true, locked: false, layer: 'd', schemaVersion: 1,
    attrs: { kind: 'incircle', vertices: ['A', 'B', 'C'] },
  } as never;

  expect(def.dependsOn(obj.attrs)).toEqual(['A', 'B', 'C']);
  expect(def.describe(obj)).toBe('Đường tròn nội tiếp ΔABC');
  const out = def.render(obj, { jxg: board, resolveRef: (id: string) => refs[id] } as never) as any;
  expect(created[0].type).toBe('incenter');
  expect(created[0].attrs).toMatchObject({
    visible: true,
    withLabel: true,
    fixed: true,
    name: 'I',
  });
  expect(created[1].type).toBe('incircle');
  expect(out.center).toBe(created[0].el);
});
