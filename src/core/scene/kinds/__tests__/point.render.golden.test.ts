// src/core/scene/kinds/__tests__/point.render.golden.test.ts
//
// RENDER-LEVEL golden baseline cho point.ts (Mức 3 Phase 4 — issue #45).
//
// Mức 3 golden DSL-level KHÔNG phủ render side-effect (chuỗi board.create). File
// này đóng băng chuỗi `board.create(type, parents, attrs)` + `_helpers` +
// function-coords thực-số cho MỌI constraint kind (+ biến thể). Sinh trên code
// point.ts CHƯA refactor; commit làm baseline. Khi Phase 4 tách switch → registry,
// snapshot phải BYTE-IDENTICAL (0 written) → bằng chứng behavior-preserving.
//
// Mock board ghi mọi board.create + cấp accessor đủ cho mọi kind (X/Y, center/
// Radius, point1/point2, midpoint average). norm() chuẩn hoá created[]:
// element→_id, function parent→invoke ra số (làm lộ đổi closure / function-coords).
import { createStore } from '../../store';
import { createEmptyState } from '../../types';
import { JxgRenderer } from '../../render/JxgRenderer';
import '../../kinds';
import type { SceneObject } from '../../types';


const val = (p: any) => (typeof p === 'function' ? p() : p);

function mockBoard() {

  const created: any[] = [];
  const board = {

    create: jest.fn((type: string, parents: any, attrs: any) => {

      const el: any = { type, parents, attrs, _id: `${type}_${created.length}` };
      if (type === 'point' || type === 'glider') {
        el.X = () => val(parents[0]);
        el.Y = () => val(parents[1]);
      } else if (type === 'midpoint') {
        const [a, b] = parents;
        el.X = () => (a.X() + b.X()) / 2;
        el.Y = () => (a.Y() + b.Y()) / 2;
      } else if (type === 'circle') {
        el.center = parents[0];
        el.Radius = () => {
          const r = parents[1];
          if (typeof r === 'number') return r;
          if (r && typeof r.X === 'function') return Math.hypot(r.X() - parents[0].X(), r.Y() - parents[0].Y());
          return val(r);
        };
      } else if (type === 'line' || type === 'segment' || type === 'perpendicular' || type === 'perpendicularsegment') {
        el.point1 = parents[0];
        el.point2 = parents[1];
      }
      created.push(el);
      return el;
    }),
    removeObject: jest.fn(),
  };
  return { board, created };
}

// Normalize: created element → _id, function parent → invoked number, else passthrough.

function norm(created: any[]) {

  const idOf = (p: any): any => {
    if (p && typeof p === 'object' && '_id' in p) return p._id;
    // Nested array parent (vd dilate: parent = [transform, transform, transform]).
    // Map từng element → _id để snapshot ổn định (KHÔNG serialize closure [Function]).
    if (Array.isArray(p)) return p.map(idOf);
    if (typeof p === 'function') {
      const v = p();
      return typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v;
    }
    if (typeof p === 'number') return Math.round(p * 1e6) / 1e6;
    return p;
  };
  return created.map((e) => ({
    type: e.type,
    name: e.attrs?.name ?? null,
    visible: e.attrs?.visible ?? null,
    parents: Array.isArray(e.parents) ? e.parents.map(idOf) : idOf(e.parents),

    helpers: Array.isArray(e._helpers) ? e._helpers.map((h: any) => h._id) : undefined,
  }));
}

const mkObj = (id: string, kind: string, attrs: unknown): SceneObject => ({
  id, kind, label: id, visible: true, locked: false, layer: 'default', schemaVersion: 1, attrs: attrs as never,
});
const mkFree = (id: string, x: number, y: number) => mkObj(id, 'point', { constraint: { kind: 'free', x, y } });
const mkCircleCR = (id: string, center: string, radius: number) => mkObj(id, 'circle', { center, radius });
const mkSegment = (id: string, p1: string, p2: string) => mkObj(id, 'segment', { p1, p2 });
const mkLine = (id: string, p1: string, p2: string) => mkObj(id, 'line', { p1, p2 });
const mkPolygon = (id: string, vertices: string[]) => mkObj(id, 'polygon', { vertices });
const mkPt = (id: string, constraint: unknown) => mkObj(id, 'point', { constraint });

// Render 1 scenario: dispatch setup objs + the target point, return normalized created[].
function renderScenario(setup: SceneObject[], target: SceneObject) {
  const store = createStore(createEmptyState('2d'));
  const { board, created } = mockBoard();
  new JxgRenderer(store, board as never);
  for (const o of setup) store.dispatch({ type: 'ADD', payload: { obj: o } });
  store.dispatch({ type: 'ADD', payload: { obj: target } });
  return norm(created);
}

// Triangle setup reused bởi circumcenter/incenter/centroid/orthocenter/excenter.
const triangle = () => [mkFree('A', 0, 0), mkFree('B', 6, 0), mkFree('C', 2, 5)];

const SCENARIOS: { name: string; setup: SceneObject[]; target: SceneObject }[] = [
  // — native point —
  { name: 'free', setup: [], target: mkPt('P', { kind: 'free', x: 2, y: 3 }) },
  { name: 'onAxis-x', setup: [], target: mkPt('P', { kind: 'onAxis', axis: 'x', t: 4 }) },
  { name: 'onAxis-y', setup: [], target: mkPt('P', { kind: 'onAxis', axis: 'y', t: 4 }) },

  // — gliders trên đối tượng —
  { name: 'onLine', setup: [mkFree('p1', 0, 0), mkFree('p2', 4, 2), mkLine('ln', 'p1', 'p2')],
    target: mkPt('G', { kind: 'onLine', lineId: 'ln', t: 0.3 }) },
  { name: 'onSegment', setup: [mkFree('p1', 0, 0), mkFree('p2', 4, 2), mkSegment('sg', 'p1', 'p2')],
    target: mkPt('G', { kind: 'onSegment', segmentId: 'sg', t: 0.4 }) },
  { name: 'onCircle', setup: [mkFree('O', 1, 1), mkCircleCR('k', 'O', 5)],
    target: mkPt('G', { kind: 'onCircle', circleId: 'k', theta: 0.5 }) },
  { name: 'onPolygon', setup: [mkFree('V1', 0, 0), mkFree('V2', 4, 0), mkFree('V3', 2, 3), mkPolygon('pg', ['V1', 'V2', 'V3'])],
    target: mkPt('G', { kind: 'onPolygon', polygonId: 'pg', u: 0.2, v: 0.3 }) },

  // — derived native —
  { name: 'midpoint', setup: [mkFree('A', 0, 0), mkFree('B', 4, 6)],
    target: mkPt('M', { kind: 'midpoint', p1: 'A', p2: 'B' }) },
  { name: 'perpFoot', setup: [mkFree('p1', 0, 0), mkFree('p2', 6, 0), mkLine('ln', 'p1', 'p2'), mkFree('P', 3, 4)],
    target: mkPt('H', { kind: 'perpFoot', from: 'P', onLine: 'ln' }) },
  { name: 'circumcenter', setup: triangle(),
    target: mkPt('O', { kind: 'circumcenter', vertices: ['A', 'B', 'C'] }) },
  { name: 'incenter', setup: triangle(),
    target: mkPt('I', { kind: 'incenter', vertices: ['A', 'B', 'C'] }) },
  { name: 'centroid', setup: triangle(),
    target: mkPt('G', { kind: 'centroid', vertices: ['A', 'B', 'C'] }) },
  { name: 'orthocenter', setup: triangle(),
    target: mkPt('H', { kind: 'orthocenter', vertices: ['A', 'B', 'C'] }) },

  // — transformed ×5 (rẽ theo transform.kind) —
  { name: 'transformed-translate', setup: [mkFree('S', 1, 1)],
    target: mkPt('S2', { kind: 'transformed', source: 'S', transform: { kind: 'translate', dx: 1, dy: 2 } }) },
  { name: 'transformed-rotate', setup: [mkFree('S', 1, 1), mkFree('O', 0, 0)],
    target: mkPt('S2', { kind: 'transformed', source: 'S', transform: { kind: 'rotate', angleRad: 1.5708, center: 'O' } }) },
  { name: 'transformed-reflectPoint', setup: [mkFree('S', 1, 1), mkFree('O', 0, 0)],
    target: mkPt('S2', { kind: 'transformed', source: 'S', transform: { kind: 'reflectPoint', center: 'O' } }) },
  { name: 'transformed-reflectLine', setup: [mkFree('p1', 0, 0), mkFree('p2', 1, 1), mkLine('L', 'p1', 'p2'), mkFree('S', 2, 0)],
    target: mkPt('S2', { kind: 'transformed', source: 'S', transform: { kind: 'reflectLine', line: 'L' } }) },
  { name: 'transformed-dilate', setup: [mkFree('S', 3, 4), mkFree('O', 1, 1)],
    target: mkPt('S2', { kind: 'transformed', source: 'S', transform: { kind: 'dilate', k: 2, center: 'O' } }) },

  // — tiếp điểm tiếp tuyến ngoài ×2 (which 0/1, _helpers=[mid,thales]) —
  { name: 'tangentPointExt-0', setup: [mkFree('O', 0, 0), mkCircleCR('k', 'O', 3), mkFree('P', 10, 0)],
    target: mkPt('T', { kind: 'tangentPointExt', from: 'P', circle: 'k', which: 0 }) },
  { name: 'tangentPointExt-1', setup: [mkFree('O', 0, 0), mkCircleCR('k', 'O', 3), mkFree('P', 10, 0)],
    target: mkPt('T', { kind: 'tangentPointExt', from: 'P', circle: 'k', which: 1 }) },

  // — giao 2 đường tròn ×2 (which 0/1) —
  { name: 'circleIntersection-0', setup: [mkFree('O1', 0, 0), mkFree('O2', 6, 0), mkCircleCR('k1', 'O1', 5), mkCircleCR('k2', 'O2', 5)],
    target: mkPt('X', { kind: 'circleIntersection', c1: 'k1', c2: 'k2', which: 0 }) },
  { name: 'circleIntersection-1', setup: [mkFree('O1', 0, 0), mkFree('O2', 6, 0), mkCircleCR('k1', 'O1', 5), mkCircleCR('k2', 'O2', 5)],
    target: mkPt('X', { kind: 'circleIntersection', c1: 'k1', c2: 'k2', which: 1 }) },

  // — giao thứ 2 line∩circle —
  { name: 'secondIntersection', setup: [mkFree('O', 0, 0), mkFree('A', 5, 0), mkFree('P', 10, 3), mkCircleCR('k', 'O', 5), mkSegment('ln', 'A', 'P')],
    target: mkPt('C', { kind: 'secondIntersection', line: 'ln', circle: 'k', other: 'A' }) },

  // — tiếp điểm (chân vuông góc tâm→tiếp tuyến) —
  { name: 'tangencyPoint', setup: [mkFree('O', 0, 0), mkFree('T1', 5, 0), mkFree('T2', 5, 3), mkCircleCR('k', 'O', 5), mkSegment('tan', 'T1', 'T2')],
    target: mkPt('H', { kind: 'tangencyPoint', circle: 'k', onLine: 'tan' }) },

  // — function-coords —
  { name: 'arcMidpoint', setup: [mkFree('O', 0, 0), mkCircleCR('k', 'O', 5), mkFree('A', 5, 0), mkFree('B', 0, 5), mkFree('N', -5, 0)],
    target: mkPt('Mid', { kind: 'arcMidpoint', circle: 'k', a: 'A', b: 'B', notContaining: 'N' }) },
  { name: 'excenter', setup: triangle(),
    target: mkPt('J', { kind: 'excenter', vertices: ['A', 'B', 'C'], opposite: 'A' }) },
  { name: 'pointAtDistance-literal', setup: [mkFree('A', 0, 0), mkFree('B', 3, 0)],
    target: mkPt('C', { kind: 'pointAtDistance', from: 'A', through: 'B', distance: { kind: 'literal', value: 3 } }) },
  { name: 'pointAtDistance-circleRadius', setup: [mkFree('A', 0, 0), mkFree('B', 3, 0), mkFree('O', 0, 0), mkCircleCR('k', 'O', 4)],
    target: mkPt('C', { kind: 'pointAtDistance', from: 'A', through: 'B', distance: { kind: 'circleRadius', circle: 'k' } }) },
  { name: 'pointAtDistance-segmentLength', setup: [mkFree('A', 0, 0), mkFree('B', 3, 0), mkFree('P', 0, 0), mkFree('Q', 0, 5)],
    target: mkPt('C', { kind: 'pointAtDistance', from: 'A', through: 'B', distance: { kind: 'segmentLength', p1: 'P', p2: 'Q' } }) },

  // — aux + glider drag-sync (_helpers) —
  { name: 'onPerpendicular', setup: [mkFree('T', 1, 1), mkFree('A', 0, 0), mkFree('B', 4, 0)],
    target: mkPt('G', { kind: 'onPerpendicular', through: 'T', perpToA: 'A', perpToB: 'B', t: 1 }) },
  { name: 'onPerpBisector', setup: [mkFree('A', 0, 0), mkFree('B', 4, 0)],
    target: mkPt('G', { kind: 'onPerpBisector', p1: 'A', p2: 'B', t: 1 }) },
  { name: 'onCircleAroundPoint', setup: [mkFree('C', 1, 1), mkFree('R', 4, 1)],
    target: mkPt('G', { kind: 'onCircleAroundPoint', center: 'C', radiusPoint: 'R', theta: 0.7 }) },
];

describe('point render — golden (Phase 4 behavior-preserving)', () => {
  for (const sc of SCENARIOS) {
    test(sc.name, () => {
      expect(renderScenario(sc.setup, sc.target)).toMatchSnapshot();
    });
  }
});
