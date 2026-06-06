import { excircleModule } from '../circles/excircle';

test('excircle module emit circle với construction excircle', () => {
  const ctx = { resolveId: (n: string) => `id_${n}` } as never;
  const out = excircleModule.emit(
    { name: 'w', kind: 'excircle', vertices: ['A', 'B', 'C'], opposite: 'A' } as never,
    ctx,
  );
  expect(out[0].object.kind).toBe('circle');
  expect(out[0].object.attrs).toMatchObject({
    construction: { kind: 'excircle', p1: 'id_A', p2: 'id_B', p3: 'id_C', opposite: 'id_A' },
  });
});

test('excircle module collectRefs trả 3 đỉnh', () => {
  const e = { name: 'w', kind: 'excircle', vertices: ['A', 'B', 'C'], opposite: 'A' } as never;
  expect(excircleModule.collectRefs(e)).toEqual(['A', 'B', 'C']);
});
