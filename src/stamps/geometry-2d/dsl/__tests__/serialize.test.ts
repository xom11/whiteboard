// src/stamps/geometry-2d/dsl/__tests__/serialize.test.ts
//
// Tests cho reverse path State → DSL (issue #41).
//
// 3 nhóm:
//   1. Per-kind happy path (synthetic State, verify DSL output)
//   2. Fallback (out-of-DSL state vẫn được report, không drop)
//   3. Roundtrip qua 9 fixtures (serializeState(transpile(fix).state).dsl ≡ fix.dsl)

import { transpile } from '../transpile';
import { serializeObject, serializeState } from '../serialize';
import type { State, SceneObject } from '../../../../core/scene/types';
import { createEmptyState } from '../../../../core/scene/types';

import { fixture as equilateral } from '../fixtures/triangle-equilateral';
import { fixture as median } from '../fixtures/triangle-median';
import { fixture as altitude } from '../fixtures/triangle-altitude';
import { fixture as centroid } from '../fixtures/triangle-centroid';
import { fixture as orthocenter } from '../fixtures/triangle-orthocenter';
import { fixture as circumcircle } from '../fixtures/triangle-circumcircle';
import { fixture as incircle } from '../fixtures/triangle-incircle';
import { fixture as parallelogram } from '../fixtures/parallelogram';
import { fixture as twoCirclesIntersect } from '../fixtures/two-circles-intersect';
import { fixture as angleBisector } from '../fixtures/triangle-angle-bisector';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 1. Per-kind happy paths
// ---------------------------------------------------------------------------

describe('serializeObject — per-kind', () => {
  test('point.free → DSL free', () => {
    const obj = pt('p1', 'A', { kind: 'free', x: 1, y: 2 });
    const state = makeState([obj]);
    const r = serializeObject(obj, state);
    expect(r).toEqual({ ok: true, entity: { name: 'A', kind: 'free', x: 1, y: 2 } });
  });

  test('point.midpoint refs nodes by label', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 0 });
    const B = pt('p2', 'B', { kind: 'free', x: 2, y: 0 });
    const M = pt('p3', 'M', { kind: 'midpoint', p1: 'p1', p2: 'p2' });
    const r = serializeObject(M, makeState([A, B, M]));
    expect(r).toEqual({ ok: true, entity: { name: 'M', kind: 'midpoint', p1: 'A', p2: 'B' } });
  });

  test('point.onSegment carries t', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 0 });
    const B = pt('p2', 'B', { kind: 'free', x: 2, y: 0 });
    const s = shape('s1', 'segment', 'AB', { p1: 'p1', p2: 'p2' });
    const P = pt('p3', 'P', { kind: 'onSegment', segmentId: 's1', t: 0.3 });
    const r = serializeObject(P, makeState([A, B, s, P]));
    expect(r).toEqual({
      ok: true,
      entity: { name: 'P', kind: 'onSegment', segmentId: 'AB', t: 0.3 },
    });
  });

  test('point.onLine + point.onCircle', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 0 });
    const B = pt('p2', 'B', { kind: 'free', x: 2, y: 0 });
    const L = shape('l1', 'line', 'd', { p1: 'p1', p2: 'p2' });
    const cir = shape('c1', 'circle', 'k', { center: 'p1', surfacePoint: 'p2' });
    const P = pt('p3', 'P', { kind: 'onLine', lineId: 'l1', t: 0.5 });
    const Q = pt('p4', 'Q', { kind: 'onCircle', circleId: 'c1', theta: 1.2 });

    const state = makeState([A, B, L, cir, P, Q]);
    expect(serializeObject(P, state)).toEqual({
      ok: true, entity: { name: 'P', kind: 'onLine', lineId: 'd', t: 0.5 },
    });
    expect(serializeObject(Q, state)).toEqual({
      ok: true, entity: { name: 'Q', kind: 'onCircle', circleId: 'k', theta: 1.2 },
    });
  });

  test('point.perpFoot', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 3 });
    const B = pt('p2', 'B', { kind: 'free', x: 0, y: 0 });
    const C = pt('p3', 'C', { kind: 'free', x: 4, y: 0 });
    const BC = shape('s1', 'segment', 'BC', { p1: 'p2', p2: 'p3' });
    const H = pt('p4', 'H', { kind: 'perpFoot', from: 'p1', onLine: 's1' });
    const r = serializeObject(H, makeState([A, B, C, BC, H]));
    expect(r).toEqual({
      ok: true, entity: { name: 'H', kind: 'perpFoot', from: 'A', onLine: 'BC' },
    });
  });

  test('point.circleIntersection serializes c1/c2/which', () => {
    const O1 = pt('p1', 'O1', { kind: 'free', x: 0, y: 0 });
    const O2 = pt('p2', 'O2', { kind: 'free', x: 3, y: 0 });
    const k1 = shape('c1', 'circle', 'k1', { center: 'p1', radius: 3 });
    const k2 = shape('c2', 'circle', 'k2', { center: 'p2', radius: 3 });
    const A = pt('p3', 'A', { kind: 'circleIntersection', c1: 'c1', c2: 'c2', which: 1 });
    const r = serializeObject(A, makeState([O1, O2, k1, k2, A]));
    expect(r).toEqual({
      ok: true, entity: { name: 'A', kind: 'circleIntersection', c1: 'k1', c2: 'k2', which: 1 },
    });
  });

  test('point.secondIntersection serializes line/circle/other', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 0 });
    const P = pt('p2', 'P', { kind: 'free', x: 5, y: 0 });
    const O = pt('p3', 'O', { kind: 'free', x: 2, y: 2 });
    const ln = shape('s1', 'segment', 'AP', { p1: 'p1', p2: 'p2' });
    const k = shape('c1', 'circle', 'k', { center: 'p3', radius: 3 });
    const C = pt('p4', 'C', { kind: 'secondIntersection', line: 's1', circle: 'c1', other: 'p1' });
    const r = serializeObject(C, makeState([A, P, O, ln, k, C]));
    expect(r).toEqual({
      ok: true, entity: { name: 'C', kind: 'secondIntersection', line: 'AP', circle: 'k', other: 'A' },
    });
  });

  test('point.tangencyPoint serializes circle/onLine', () => {
    const O = pt('p1', 'O', { kind: 'free', x: 0, y: 0 });
    const T1 = pt('p2', 'T1', { kind: 'free', x: 3, y: 0 });
    const T2 = pt('p3', 'T2', { kind: 'free', x: 3, y: 3 });
    const k = shape('c1', 'circle', 'k', { center: 'p1', radius: 3 });
    const tan = shape('s1', 'segment', 'tan', { p1: 'p2', p2: 'p3' });
    const H = pt('p4', 'H', { kind: 'tangencyPoint', circle: 'c1', onLine: 's1' });
    const r = serializeObject(H, makeState([O, T1, T2, k, tan, H]));
    expect(r).toEqual({
      ok: true, entity: { name: 'H', kind: 'tangencyPoint', circle: 'k', onLine: 'tan' },
    });
  });

  test('point.arcMidpoint serializes circle/a/b/notContaining', () => {
    const A = pt('p1', 'A', { kind: 'free', x: -2, y: 0 });
    const B = pt('p2', 'B', { kind: 'free', x: 2, y: 0 });
    const C = pt('p3', 'C', { kind: 'free', x: 0, y: 3 });
    const O = pt('p4', 'O', { kind: 'free', x: 0, y: 0 });
    const k = shape('c1', 'circle', 'k', { center: 'p4', surfacePoint: 'p1' });
    const M = pt('p5', 'M', { kind: 'arcMidpoint', circle: 'c1', a: 'p1', b: 'p2', notContaining: 'p3' });
    const r = serializeObject(M, makeState([A, B, C, O, k, M]));
    expect(r).toEqual({
      ok: true,
      entity: { name: 'M', kind: 'arcMidpoint', circle: 'k', a: 'A', b: 'B', notContaining: 'C' },
    });
  });

  test('point.excenter serializes vertices/opposite', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 3 });
    const B = pt('p2', 'B', { kind: 'free', x: -2, y: 0 });
    const C = pt('p3', 'C', { kind: 'free', x: 3, y: 0 });
    const Ia = pt('p4', 'Ia', { kind: 'excenter', vertices: ['p1', 'p2', 'p3'], opposite: 'p1' });
    const r = serializeObject(Ia, makeState([A, B, C, Ia]));
    expect(r).toEqual({
      ok: true,
      entity: { name: 'Ia', kind: 'excenter', vertices: ['A', 'B', 'C'], opposite: 'A' },
    });
  });

  test.each(['circumcenter', 'incenter', 'centroid', 'orthocenter'] as const)(
    'point.%s carries 3 vertex labels',
    (kind) => {
      const A = pt('p1', 'A', { kind: 'free', x: 0, y: 3 });
      const B = pt('p2', 'B', { kind: 'free', x: -2, y: 0 });
      const C = pt('p3', 'C', { kind: 'free', x: 3, y: 0 });
      const O = pt('p4', 'O', { kind, vertices: ['p1', 'p2', 'p3'] });
      const r = serializeObject(O, makeState([A, B, C, O]));
      expect(r).toEqual({
        ok: true, entity: { name: 'O', kind, vertices: ['A', 'B', 'C'] },
      });
    },
  );

  test('intersection.lineLine — no branch', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 0 });
    const B = pt('p2', 'B', { kind: 'free', x: 2, y: 2 });
    const C = pt('p3', 'C', { kind: 'free', x: 2, y: 0 });
    const D = pt('p4', 'D', { kind: 'free', x: 0, y: 2 });
    const AB = shape('s1', 'segment', 'AB', { p1: 'p1', p2: 'p2' });
    const CD = shape('s2', 'segment', 'CD', { p1: 'p3', p2: 'p4' });
    const O = shape('i1', 'intersection', 'O', { kind: 'lineLine', ref1: 's1', ref2: 's2' });
    const r = serializeObject(O, makeState([A, B, C, D, AB, CD, O]));
    expect(r).toEqual({
      ok: true, entity: { name: 'O', kind: 'intersection', ref1: 'AB', ref2: 'CD' },
    });
    // KHÔNG có field "branch"
    if (r.ok) expect('branch' in r.entity).toBe(false);
  });

  test('intersection.circleCircle — branch giữ nguyên', () => {
    const O1 = pt('p1', 'O1', { kind: 'free', x: 0, y: 0 });
    const A1 = pt('p2', 'A1', { kind: 'free', x: 2, y: 0 });
    const O2 = pt('p3', 'O2', { kind: 'free', x: 3, y: 0 });
    const A2 = pt('p4', 'A2', { kind: 'free', x: 5, y: 0 });
    const k1 = shape('c1', 'circle', 'k1', { center: 'p1', surfacePoint: 'p2' });
    const k2 = shape('c2', 'circle', 'k2', { center: 'p3', surfacePoint: 'p4' });
    const P = shape('i1', 'intersection', 'P', {
      kind: 'circleCircle', ref1: 'c1', ref2: 'c2', branch: 0,
    });
    const r = serializeObject(P, makeState([O1, A1, O2, A2, k1, k2, P]));
    expect(r).toEqual({
      ok: true,
      entity: { name: 'P', kind: 'intersection', ref1: 'k1', ref2: 'k2', branch: 0 },
    });
  });

  test('segment + ray + polygon + line(p1,p2)', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 0 });
    const B = pt('p2', 'B', { kind: 'free', x: 2, y: 0 });
    const C = pt('p3', 'C', { kind: 'free', x: 0, y: 2 });
    const seg = shape('s1', 'segment', 'AB', { p1: 'p1', p2: 'p2' });
    const ray = shape('r1', 'ray', 'AB2', { origin: 'p1', through: 'p2' });
    const poly = shape('poly1', 'polygon', 'ABC', { vertices: ['p1', 'p2', 'p3'] });
    const lin = shape('l1', 'line', 'd', { p1: 'p1', p2: 'p2' });
    const state = makeState([A, B, C, seg, ray, poly, lin]);
    expect(serializeObject(seg, state)).toEqual({
      ok: true, entity: { name: 'AB', kind: 'segment', p1: 'A', p2: 'B' },
    });
    expect(serializeObject(ray, state)).toEqual({
      ok: true, entity: { name: 'AB2', kind: 'ray', origin: 'A', through: 'B' },
    });
    expect(serializeObject(poly, state)).toEqual({
      ok: true, entity: { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
    });
    expect(serializeObject(lin, state)).toEqual({
      ok: true, entity: { name: 'd', kind: 'line', p1: 'A', p2: 'B' },
    });
  });

  test('line constructions: perpendicular / parallel', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 3 });
    const B = pt('p2', 'B', { kind: 'free', x: 0, y: 0 });
    const C = pt('p3', 'C', { kind: 'free', x: 4, y: 0 });
    const BC = shape('s1', 'segment', 'BC', { p1: 'p2', p2: 'p3' });
    const h = shape('l1', 'line', 'h', {
      construction: { kind: 'perpendicular', throughPoint: 'p1', toLine: 's1' },
    });
    const m = shape('l2', 'line', 'm', {
      construction: { kind: 'parallel', throughPoint: 'p1', toLine: 's1' },
    });
    const state = makeState([A, B, C, BC, h, m]);
    expect(serializeObject(h, state)).toEqual({
      ok: true,
      entity: { name: 'h', kind: 'perpendicular', throughPoint: 'A', toLine: 'BC' },
    });
    expect(serializeObject(m, state)).toEqual({
      ok: true,
      entity: { name: 'm', kind: 'parallel', throughPoint: 'A', toLine: 'BC' },
    });
  });

  test('line constructions: perpBisector / angleBisector', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 3 });
    const B = pt('p2', 'B', { kind: 'free', x: 0, y: 0 });
    const C = pt('p3', 'C', { kind: 'free', x: 4, y: 0 });
    const pb = shape('l1', 'line', 'd', {
      construction: { kind: 'perpBisector', p1: 'p2', p2: 'p3' },
    });
    const ab = shape('l2', 'line', 'b', {
      construction: { kind: 'angleBisector', p1: 'p2', vertex: 'p1', p2: 'p3' },
    });
    const state = makeState([A, B, C, pb, ab]);
    expect(serializeObject(pb, state)).toEqual({
      ok: true, entity: { name: 'd', kind: 'perpBisector', p1: 'B', p2: 'C' },
    });
    expect(serializeObject(ab, state)).toEqual({
      ok: true,
      entity: { name: 'b', kind: 'angleBisector', p1: 'B', vertex: 'A', p2: 'C' },
    });
  });

  test('line construction: tangent — branch optional, preserved khi có', () => {
    const P = pt('p1', 'P', { kind: 'free', x: 5, y: 0 });
    const O = pt('p2', 'O', { kind: 'free', x: 0, y: 0 });
    const A = pt('p3', 'A', { kind: 'free', x: 1, y: 0 });
    const k = shape('c1', 'circle', 'k', { center: 'p2', surfacePoint: 'p3' });

    const t1 = shape('l1', 'line', 't1', {
      construction: { kind: 'tangent', throughPoint: 'p1', toCircle: 'c1' },
    });
    const t2 = shape('l2', 'line', 't2', {
      construction: { kind: 'tangent', throughPoint: 'p1', toCircle: 'c1', branch: 1 },
    });
    const state = makeState([P, O, A, k, t1, t2]);

    const r1 = serializeObject(t1, state);
    expect(r1).toEqual({
      ok: true, entity: { name: 't1', kind: 'tangent', throughPoint: 'P', toCircle: 'k' },
    });
    if (r1.ok) expect('branch' in r1.entity).toBe(false);

    expect(serializeObject(t2, state)).toEqual({
      ok: true,
      entity: { name: 't2', kind: 'tangent', throughPoint: 'P', toCircle: 'k', branch: 1 },
    });
  });

  test('circle: no construction → circleCP', () => {
    const O = pt('p1', 'O', { kind: 'free', x: 0, y: 0 });
    const A = pt('p2', 'A', { kind: 'free', x: 1, y: 0 });
    const k = shape('c1', 'circle', 'k', { center: 'p1', surfacePoint: 'p2' });
    expect(serializeObject(k, makeState([O, A, k]))).toEqual({
      ok: true, entity: { name: 'k', kind: 'circleCP', center: 'O', surfacePoint: 'A' },
    });
  });

  test('circle: construction circumscribed → circle3', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 3 });
    const B = pt('p2', 'B', { kind: 'free', x: -2, y: 0 });
    const C = pt('p3', 'C', { kind: 'free', x: 3, y: 0 });
    const k = shape('c1', 'circle', 'k', {
      construction: { kind: 'circumscribed', p1: 'p1', p2: 'p2', p3: 'p3' },
    });
    expect(serializeObject(k, makeState([A, B, C, k]))).toEqual({
      ok: true, entity: { name: 'k', kind: 'circle3', p1: 'A', p2: 'B', p3: 'C' },
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Fallback paths — out-of-DSL
// ---------------------------------------------------------------------------

describe('serializeObject — fallback', () => {
  test('unknown scene kind (vector/distance/angle/arc/sector) → unsupported-kind', () => {
    for (const k of ['vector', 'distance', 'angle', 'arc', 'sector']) {
      const obj = shape('x1', k, 'v', { p1: 'foo', p2: 'bar' });
      const r = serializeObject(obj, makeState([obj]));
      expect(r).toEqual({ ok: false, reason: 'unsupported-kind', detail: k });
    }
  });

  test('constraint onAxis → unsupported-constraint', () => {
    const obj = pt('p1', 'P', { kind: 'onAxis', axis: 'x', t: 0.5 });
    expect(serializeObject(obj, makeState([obj]))).toEqual({
      ok: false, reason: 'unsupported-constraint', detail: 'onAxis',
    });
  });

  test('constraint onPolygon → unsupported-constraint', () => {
    const poly = shape('poly1', 'polygon', 'P1', { vertices: ['x', 'y', 'z'] });
    const obj = pt('p1', 'Q', { kind: 'onPolygon', polygonId: 'poly1', u: 0.3, v: 0.4 });
    const r = serializeObject(obj, makeState([poly, obj]));
    expect(r).toEqual({ ok: false, reason: 'unsupported-constraint', detail: 'onPolygon' });
  });

  test('constraint transformed → unsupported-constraint', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 0 });
    const obj = pt('p2', 'Aprime', {
      kind: 'transformed', source: 'p1', transform: { kind: 'translate', dx: 1, dy: 2 },
    });
    expect(serializeObject(obj, makeState([A, obj]))).toEqual({
      ok: false, reason: 'unsupported-constraint', detail: 'transformed',
    });
  });

  test('line construction angleBisectorLines → unsupported-construction', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 0 });
    const B = pt('p2', 'B', { kind: 'free', x: 1, y: 0 });
    const C = pt('p3', 'C', { kind: 'free', x: 0, y: 1 });
    const l1 = shape('l1', 'line', 'a', { p1: 'p1', p2: 'p2' });
    const l2 = shape('l2', 'line', 'b', { p1: 'p1', p2: 'p3' });
    const bisect = shape('l3', 'line', 'd', {
      construction: { kind: 'angleBisectorLines', line1: 'l1', line2: 'l2', branch: 0 },
    });
    expect(serializeObject(bisect, makeState([A, B, C, l1, l2, bisect]))).toEqual({
      ok: false, reason: 'unsupported-construction', detail: 'angleBisectorLines',
    });
  });

  test('polygon regular → unsupported-construction', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 0 });
    const B = pt('p2', 'B', { kind: 'free', x: 1, y: 0 });
    const poly = shape('poly1', 'polygon', 'P', {
      construction: { kind: 'regular', p1: 'p1', p2: 'p2', n: 6 },
    });
    expect(serializeObject(poly, makeState([A, B, poly]))).toEqual({
      ok: false, reason: 'unsupported-construction', detail: 'regular',
    });
  });

  test('label không khớp NameZ → invalid-label', () => {
    const obj = pt('p1', '1invalid', { kind: 'free', x: 0, y: 0 });
    expect(serializeObject(obj, makeState([obj]))).toEqual({
      ok: false, reason: 'invalid-label', detail: '1invalid',
    });
  });

  test('ref tới object không tồn tại → unresolved-ref', () => {
    const obj = pt('p1', 'M', { kind: 'midpoint', p1: 'ghost1', p2: 'ghost2' });
    expect(serializeObject(obj, makeState([obj]))).toEqual({
      ok: false, reason: 'unresolved-ref', detail: 'ghost1,ghost2',
    });
  });
});

// ---------------------------------------------------------------------------
// 3. serializeState — orchestrator
// ---------------------------------------------------------------------------

describe('serializeState', () => {
  test('mixed supported + unsupported: cả hai đều report', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 0 });
    const v = shape('v1', 'vector', 'v', { from: 'p1', to: 'p1' });
    const result = serializeState(makeState([A, v]));
    expect(result.dsl.points).toEqual([{ name: 'A', kind: 'free', x: 0, y: 0 }]);
    expect(result.dsl.shapes).toEqual([]);
    expect(result.unsupported).toEqual([
      { id: 'v1', label: 'v', kind: 'vector', reason: 'unsupported-kind', detail: 'vector' },
    ]);
  });

  test('preserve scene order trong point + shape buckets', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 0 });
    const B = pt('p2', 'B', { kind: 'free', x: 1, y: 0 });
    const seg = shape('s1', 'segment', 'AB', { p1: 'p1', p2: 'p2' });
    const C = pt('p3', 'C', { kind: 'free', x: 2, y: 0 });
    // Order: A, B, AB, C — DSL points = [A, B, C], shapes = [AB]
    const r = serializeState(makeState([A, B, seg, C]));
    expect(r.dsl.points.map((p) => p.name)).toEqual(['A', 'B', 'C']);
    expect(r.dsl.shapes.map((s) => s.name)).toEqual(['AB']);
  });

  test('intersection bucket vào points (POINT_KINDS)', () => {
    const A = pt('p1', 'A', { kind: 'free', x: 0, y: 0 });
    const B = pt('p2', 'B', { kind: 'free', x: 2, y: 0 });
    const C = pt('p3', 'C', { kind: 'free', x: 1, y: -1 });
    const D = pt('p4', 'D', { kind: 'free', x: 1, y: 1 });
    const AB = shape('s1', 'segment', 'AB', { p1: 'p1', p2: 'p2' });
    const CD = shape('s2', 'segment', 'CD', { p1: 'p3', p2: 'p4' });
    const X = shape('i1', 'intersection', 'X', { kind: 'lineLine', ref1: 's1', ref2: 's2' });
    const r = serializeState(makeState([A, B, C, D, AB, CD, X]));
    expect(r.dsl.points.map((p) => p.name)).toEqual(['A', 'B', 'C', 'D', 'X']);
    expect(r.dsl.shapes.map((s) => s.name)).toEqual(['AB', 'CD']);
  });
});

// ---------------------------------------------------------------------------
// 4. Roundtrip qua 9 fixtures
// ---------------------------------------------------------------------------

describe('roundtrip fixtures: transpile → serialize ≡ original', () => {
  const ALL = [
    ['triangle-equilateral', equilateral],
    ['triangle-median', median],
    ['triangle-altitude', altitude],
    ['triangle-centroid', centroid],
    ['triangle-orthocenter', orthocenter],
    ['triangle-circumcircle', circumcircle],
    ['triangle-incircle', incircle],
    ['triangle-angle-bisector', angleBisector],
    ['parallelogram', parallelogram],
    ['two-circles-intersect', twoCirclesIntersect],
  ] as const;

  it.each(ALL)('%s roundtrips', (_name, fix) => {
    const tr = transpile(fix.dsl);
    if (!tr.ok) throw new Error(`transpile failed: ${JSON.stringify(tr.errors)}`);
    const ser = serializeState(tr.state);
    expect(ser.unsupported).toEqual([]);
    expect(ser.dsl).toEqual(fix.dsl);
  });
});
