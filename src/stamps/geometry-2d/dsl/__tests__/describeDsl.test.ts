// src/stamps/geometry-2d/dsl/__tests__/describeDsl.test.ts
import { describeDsl } from '../describeDsl';
import { transpile } from '../transpile';
import type { State, SceneObject } from '../../../../core/scene/types';
import { createEmptyState } from '../../../../core/scene/types';
import { fixture as median } from '../fixtures/triangle-median';

// Import scene kind registrations để getKind('point') hoạt động trong fallback test.
import '../../../../core/scene/kinds';

function makeState(objs: SceneObject[]): State {
  const empty = createEmptyState('2d');
  return {
    objects: Object.fromEntries(objs.map((o) => [o.id, o])),
    order: objs.map((o) => o.id),
    counter: objs.length,
    meta: empty.meta,
  };
}

function pt(id: string, label: string, constraint: Record<string, unknown>): SceneObject {
  return {
    id, kind: 'point', label,
    visible: true, locked: false, layer: 'default', schemaVersion: 1,
    attrs: { constraint },
  };
}
function shape(id: string, kind: string, label: string, attrs: Record<string, unknown>): SceneObject {
  return {
    id, kind, label,
    visible: true, locked: false, layer: 'default', schemaVersion: 1,
    attrs,
  };
}

describe('describeDsl — supported kinds', () => {
  test('free point hiển thị toạ độ', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 1, y: 2 });
    expect(describeDsl(A, makeState([A]))).toBe('A = (1, 2)');
  });

  test('midpoint hiển thị "trung điểm"', () => {
    const tr = transpile(median.dsl);
    if (!tr.ok) throw new Error('transpile failed');
    const M = Object.values(tr.state.objects).find((o) => o.label === 'M')!;
    expect(describeDsl(M, tr.state)).toBe('M = trung điểm BC');
  });

  test('perpFoot hiển thị "chân vuông góc"', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 3 });
    const B = pt('p2', 'B', { kind: 'free', x: 0, y: 0 });
    const C = pt('p3', 'C', { kind: 'free', x: 4, y: 0 });
    const BC = shape('s1', 'segment', 'BC', { p1: 'p2', p2: 'p3' });
    const H = pt('p4', 'H', { kind: 'perpFoot', from: 'p1', onLine: 's1' });
    expect(describeDsl(H, makeState([A, B, C, BC, H]))).toBe(
      'H = chân vuông góc từ A xuống BC',
    );
  });

  test.each([
    ['circumcenter', 'tâm ngoại tiếp'],
    ['incenter',     'tâm nội tiếp'],
    ['centroid',     'trọng tâm'],
    ['orthocenter',  'trực tâm'],
  ])('%s → "%s"', (kind, vn) => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 3 });
    const B = pt('p2', 'B', { kind: 'free', x: -2, y: 0 });
    const C = pt('p3', 'C', { kind: 'free', x: 3, y: 0 });
    const O = pt('p4', 'O', { kind, vertices: ['p1', 'p2', 'p3'] });
    expect(describeDsl(O, makeState([A, B, C, O]))).toBe(`O = ${vn} ABC`);
  });

  test('intersection lineLine — không có suffix nhánh', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 0 });
    const B = pt('p2', 'B', { kind: 'free', x: 2, y: 2 });
    const C = pt('p3', 'C', { kind: 'free', x: 2, y: 0 });
    const D = pt('p4', 'D', { kind: 'free', x: 0, y: 2 });
    const AB = shape('s1', 'segment', 'AB', { p1: 'p1', p2: 'p2' });
    const CD = shape('s2', 'segment', 'CD', { p1: 'p3', p2: 'p4' });
    const O = shape('i1', 'intersection', 'O', { kind: 'lineLine', ref1: 's1', ref2: 's2' });
    expect(describeDsl(O, makeState([A, B, C, D, AB, CD, O]))).toBe('O = AB ∩ CD');
  });

  test('intersection circleCircle — có suffix nhánh', () => {
    const O1 = pt('p1', 'O1', { kind: 'free', x: 0, y: 0 });
    const A1 = pt('p2', 'A1', { kind: 'free', x: 2, y: 0 });
    const O2 = pt('p3', 'O2', { kind: 'free', x: 3, y: 0 });
    const A2 = pt('p4', 'A2', { kind: 'free', x: 5, y: 0 });
    const k1 = shape('c1', 'circle', 'k1', { center: 'p1', surfacePoint: 'p2' });
    const k2 = shape('c2', 'circle', 'k2', { center: 'p3', surfacePoint: 'p4' });
    const P = shape('i1', 'intersection', 'P', {
      kind: 'circleCircle', ref1: 'c1', ref2: 'c2', branch: 1,
    });
    expect(describeDsl(P, makeState([O1, A1, O2, A2, k1, k2, P]))).toBe('P = k1 ∩ k2 (nhánh 1)');
  });

  test('segment / line / ray / polygon', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 0 });
    const B = pt('p2', 'B', { kind: 'free', x: 2, y: 0 });
    const C = pt('p3', 'C', { kind: 'free', x: 0, y: 2 });
    const seg = shape('s1', 'segment', 'AB', { p1: 'p1', p2: 'p2' });
    const ray = shape('r1', 'ray', 'AB2', { origin: 'p1', through: 'p2' });
    const lin = shape('l1', 'line', 'd', { p1: 'p1', p2: 'p2' });
    const poly = shape('poly1', 'polygon', 'ABC', { vertices: ['p1', 'p2', 'p3'] });
    const s = makeState([A, B, C, seg, ray, lin, poly]);
    expect(describeDsl(seg, s)).toBe('AB = đoạn AB');
    expect(describeDsl(ray, s)).toBe('AB2 = tia AB');
    expect(describeDsl(lin, s)).toBe('d = đường thẳng AB');
    expect(describeDsl(poly, s)).toBe('ABC = đa giác ABC');
  });

  test('line constructions: perpendicular / parallel / perpBisector / angleBisector / tangent', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 3 });
    const B = pt('p2', 'B', { kind: 'free', x: 0, y: 0 });
    const C = pt('p3', 'C', { kind: 'free', x: 4, y: 0 });
    const BC = shape('s1', 'segment', 'BC', { p1: 'p2', p2: 'p3' });
    const cir = shape('c1', 'circle', 'k', { center: 'p2', surfacePoint: 'p3' });

    const h = shape('l1', 'line', 'h', { construction: { kind: 'perpendicular', throughPoint: 'p1', toLine: 's1' } });
    const m = shape('l2', 'line', 'm', { construction: { kind: 'parallel',      throughPoint: 'p1', toLine: 's1' } });
    const pb = shape('l3', 'line', 'd', { construction: { kind: 'perpBisector', p1: 'p2', p2: 'p3' } });
    const ab = shape('l4', 'line', 'b', { construction: { kind: 'angleBisector', p1: 'p2', vertex: 'p1', p2: 'p3' } });
    const t = shape('l5', 'line', 't', { construction: { kind: 'tangent', throughPoint: 'p1', toCircle: 'c1' } });

    const s = makeState([A, B, C, BC, cir, h, m, pb, ab, t]);
    expect(describeDsl(h, s)).toBe('h ⟂ BC qua A');
    expect(describeDsl(m, s)).toBe('m ∥ BC qua A');
    expect(describeDsl(pb, s)).toBe('d = trung trực BC');
    expect(describeDsl(ab, s)).toBe('b = phân giác ∠BAC');
    expect(describeDsl(t, s)).toBe('t = tiếp tuyến k qua A');
  });

  test('circle: circleCP và circle3', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 3 });
    const B = pt('p2', 'B', { kind: 'free', x: -2, y: 0 });
    const C = pt('p3', 'C', { kind: 'free', x: 3, y: 0 });
    const cp = shape('c1', 'circle', 'k', { center: 'p2', surfacePoint: 'p3' });
    const c3 = shape('c2', 'circle', 'w', {
      construction: { kind: 'circumscribed', p1: 'p1', p2: 'p2', p3: 'p3' },
    });
    const s = makeState([A, B, C, cp, c3]);
    expect(describeDsl(cp, s)).toBe('k = (B; BC)');
    expect(describeDsl(c3, s)).toBe('w = đường tròn qua ABC');
  });
});

describe('describeDsl — fallback', () => {
  test('out-of-DSL kind → suffix "(không hỗ trợ DSL)"', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 0 });
    const B = pt('p2', 'B', { kind: 'free', x: 2, y: 0 });
    const v = shape('v1', 'vector', 'v', { p1: 'p1', p2: 'p2' });
    const out = describeDsl(v, makeState([A, B, v]));
    expect(out).toMatch(/\(không hỗ trợ DSL\)$/);
  });

  test('transformed constraint → suffix "(không hỗ trợ DSL)"', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 0 });
    const t = pt('p2', 'B', {
      kind: 'transformed', source: 'p1', transform: { kind: 'translate', dx: 1, dy: 2 },
    });
    const out = describeDsl(t, makeState([A, t]));
    expect(out).toMatch(/\(không hỗ trợ DSL\)$/);
  });
});
