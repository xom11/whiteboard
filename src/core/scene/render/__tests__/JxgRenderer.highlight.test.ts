import { JxgRenderer } from '../JxgRenderer';
import { createStore } from '../../store';
import { registerKind, getKind } from '../../registry';
import type { SceneObject, State } from '../../types';

const FAKE = 'highlight_test_kind';
try { getKind(FAKE); } catch {
  registerKind({
    type: FAKE,
    schemaVersion: 1,
    migrate: {},
    dependsOn: () => [],
    describe: (o) => o.label,
    render: () => {
      const el: { style: { stroke: string; thick: number }, originalStyle?: { stroke: string; thick: number } } =
        { style: { stroke: '#000', thick: 1 } };
      return el;
    },
  });
}

// Mock kind giả lập một JSXGraph "segment" element: có elType + point1/point2
// để renderer.addHalo() đi vào nhánh tạo halo. Test này verify halo overlay
// được tạo qua board.create (giữ nguyên màu gốc của element).
const FAKE_SEG = 'highlight_segment_kind';
try { getKind(FAKE_SEG); } catch {
  registerKind({
    type: FAKE_SEG,
    schemaVersion: 1,
    migrate: {},
    dependsOn: () => [],
    describe: (o) => o.label,
    render: (obj) => {
      const a = obj.attrs as { color?: string; width?: number };
      const attrs: Record<string, unknown> = {
        strokeColor: a.color ?? '#1e40af',
        strokeWidth: a.width ?? 2,
      };
      return {
        elType: 'segment',
        point1: { id: `${obj.id}_p1` },
        point2: { id: `${obj.id}_p2` },
        attrs,
        getAttribute(k: string) { return attrs[k]; },
        setAttribute(patch: Record<string, unknown>) { Object.assign(attrs, patch); },
      };
    },
  });
}

// Mock một điểm PHÁI SINH kiểu JSXGraph (circumcenter/otherintersection/
// perpendicularpoint...): elType riêng cho mỗi cách dựng NHƯNG elementClass=1
// (OBJECT_CLASS_POINT) cho mọi subtype. addHalo phải nhận diện qua elementClass,
// không phải liệt kê elType.
const FAKE_DERIVED_PT = 'highlight_derived_point_kind';
try { getKind(FAKE_DERIVED_PT); } catch {
  registerKind({
    type: FAKE_DERIVED_PT,
    schemaVersion: 1,
    migrate: {},
    dependsOn: () => [],
    describe: (o) => o.label,
    render: () => {
      const attrs: Record<string, unknown> = { size: 4 };
      return {
        elType: 'circumcenter',
        elementClass: 1,
        X: () => 1,
        Y: () => 2,
        attrs,
        getAttribute(k: string) { return attrs[k]; },
        setAttribute(patch: Record<string, unknown>) { Object.assign(attrs, patch); },
      };
    },
  });
}

// Mock circumcircle/incircle: elType 'circumcircle' (≠ 'circle') nhưng
// elementClass=3 (OBJECT_CLASS_CIRCLE) + center/Radius. addHalo phải nhận diện
// qua elementClass, không chỉ elType === 'circle'.
const FAKE_CIRCUMCIRCLE = 'highlight_circumcircle_kind';
try { getKind(FAKE_CIRCUMCIRCLE); } catch {
  registerKind({
    type: FAKE_CIRCUMCIRCLE,
    schemaVersion: 1,
    migrate: {},
    dependsOn: () => [],
    describe: (o) => o.label,
    render: () => ({
      elType: 'circumcircle',
      elementClass: 3,
      center: { id: 'ctr' },
      Radius: () => 5,
      attrs: {},
      getAttribute() { return undefined; },
      setAttribute() { /* noop */ },
    }),
  });
}

// Mock regularpolygon (square/đa giác đều): elType 'regularpolygon' (≠ 'polygon')
// — addHalo phải nhận diện polygon qua vertices, không chỉ elType === 'polygon'.
const FAKE_REGPOLY = 'highlight_regularpolygon_kind';
try { getKind(FAKE_REGPOLY); } catch {
  registerKind({
    type: FAKE_REGPOLY,
    schemaVersion: 1,
    migrate: {},
    dependsOn: () => [],
    describe: (o) => o.label,
    render: () => ({
      elType: 'regularpolygon',
      vertices: [{ id: 'v0' }, { id: 'v1' }, { id: 'v2' }, { id: 'v3' }],
      attrs: {},
      getAttribute() { return undefined; },
      setAttribute() { /* noop */ },
    }),
  });
}

// Mock arc/semicircle/circumcirclearc: JSXGraph Arc — center/radiuspoint/anglepoint
// (chữ thường), elementClass=4 (CURVE) nên KHÔNG bắt qua class → dùng elType.
const FAKE_ARC = 'highlight_arc_kind';
try { getKind(FAKE_ARC); } catch {
  registerKind({
    type: FAKE_ARC, schemaVersion: 1, migrate: {}, dependsOn: () => [], describe: (o) => o.label,
    render: () => ({
      elType: 'arc', elementClass: 4,
      center: { id: 'O' }, radiuspoint: { id: 'A' }, anglepoint: { id: 'B' },
      attrs: {}, getAttribute() { return undefined; }, setAttribute() { /* noop */ },
    }),
  });
}

// Mock sector + angle: Sector/Angle — center/radiusPoint/anglePoint (chữ P HOA).
const FAKE_SECTOR = 'highlight_sector_kind';
try { getKind(FAKE_SECTOR); } catch {
  registerKind({
    type: FAKE_SECTOR, schemaVersion: 1, migrate: {}, dependsOn: () => [], describe: (o) => o.label,
    render: () => ({
      elType: 'sector', elementClass: 4,
      center: { id: 'O' }, radiusPoint: { id: 'A' }, anglePoint: { id: 'B' },
      attrs: {}, getAttribute() { return undefined; }, setAttribute() { /* noop */ },
    }),
  });
}
const FAKE_ANGLE = 'highlight_angle_kind';
try { getKind(FAKE_ANGLE); } catch {
  registerKind({
    type: FAKE_ANGLE, schemaVersion: 1, migrate: {}, dependsOn: () => [], describe: (o) => o.label,
    render: () => ({
      elType: 'angle', elementClass: 4,
      center: { id: 'V' }, radiusPoint: { id: 'A' }, anglePoint: { id: 'C' },
      attrs: {}, getAttribute() { return undefined; }, setAttribute() { /* noop */ },
    }),
  });
}

function mockBoard() {
  const created: Array<{ kind: string; parents: unknown[]; attrs?: unknown; id: number }> = [];
  let counter = 0;
  const removed: unknown[] = [];
  return {
    created,
    removed,
    create: jest.fn((kind: string, parents: unknown[], attrs?: unknown) => {
      const el = { __halo: true, id: ++counter, kind, parents, attrs };
      created.push({ kind, parents, attrs, id: counter });
      return el;
    }),
    removeObject: jest.fn((el: unknown) => { removed.push(el); }),
    update: jest.fn(),
  };
}

type AttrEl = { attrs: Record<string, unknown> };

function makeSegObj(id: string, color: string, width: number): SceneObject {
  return {
    id,
    label: id,
    kind: FAKE_SEG,
    visible: true,
    locked: false,
    attrs: { color, width },
  };
}

function makeState(...objs: SceneObject[]): State {
  const map: Record<string, SceneObject> = {};
  for (const o of objs) map[o.id] = o;
  return {
    objects: map,
    order: objs.map((o) => o.id),
    counter: objs.length,
    meta: { domain: '2d', version: 1 },
  };
}

describe('JxgRenderer.highlight (halo overlay)', () => {
  it('exposes highlight method', () => {
    const store = createStore({ objects: {}, order: [], counter: 0, meta: { domain: '2d', version: 1 } });
    const r = new JxgRenderer(store, mockBoard());
    expect(typeof r.highlight).toBe('function');
    r.dispose();
  });

  it('calling highlight(null) on empty does not throw', () => {
    const store = createStore({ objects: {}, order: [], counter: 0, meta: { domain: '2d', version: 1 } });
    const r = new JxgRenderer(store, mockBoard());
    expect(() => r.highlight(null)).not.toThrow();
    r.dispose();
  });

  it('calling highlight(unknownId) does not throw', () => {
    const store = createStore({ objects: {}, order: [], counter: 0, meta: { domain: '2d', version: 1 } });
    const r = new JxgRenderer(store, mockBoard());
    expect(() => r.highlight('nope')).not.toThrow();
    r.dispose();
  });

  it('does NOT mutate original element strokeColor/strokeWidth', () => {
    const A = makeSegObj('A', '#1e40af', 2);
    const store = createStore(makeState(A));
    const board = mockBoard();
    const r = new JxgRenderer(store, board);

    const elA = r.listElements().get('A') as AttrEl;

    r.highlight('A');
    // Halo overlay model giữ nguyên màu gốc.
    expect(elA.attrs.strokeColor).toBe('#1e40af');
    expect(elA.attrs.strokeWidth).toBe(2);

    r.dispose();
  });

  it('creates a point halo for DERIVED points (circumcenter/otherintersection) via elementClass', () => {
    const A: SceneObject = {
      id: 'A', label: 'O', kind: FAKE_DERIVED_PT, visible: true, locked: false, attrs: {},
    };
    const store = createStore(makeState(A));
    const board = mockBoard();
    const r = new JxgRenderer(store, board);

    r.highlight('A');
    // Dù elType là 'circumcenter' (không nằm trong danh sách cũ), vẫn tạo point halo.
    const ptHalos = board.created.filter((c) => c.kind === 'point');
    expect(ptHalos.length).toBe(1);

    r.dispose();
  });

  it('creates a circle halo for circumcircle/incircle via elementClass (elType ≠ "circle")', () => {
    const A: SceneObject = {
      id: 'A', label: 'O_c', kind: FAKE_CIRCUMCIRCLE, visible: true, locked: false, attrs: {},
    };
    const store = createStore(makeState(A));
    const board = mockBoard();
    const r = new JxgRenderer(store, board);

    r.highlight('A');
    const circHalos = board.created.filter((c) => c.kind === 'circle');
    expect(circHalos.length).toBe(1);

    r.dispose();
  });

  it('creates a polygon halo for regularpolygon (square) via vertices (elType ≠ "polygon")', () => {
    const A: SceneObject = {
      id: 'A', label: 'sq', kind: FAKE_REGPOLY, visible: true, locked: false, attrs: {},
    };
    const store = createStore(makeState(A));
    const board = mockBoard();
    const r = new JxgRenderer(store, board);

    r.highlight('A');
    const polyHalos = board.created.filter((c) => c.kind === 'polygon');
    expect(polyHalos.length).toBe(1);

    r.dispose();
  });

  it('creates an arc halo (center/radiuspoint/anglepoint) for arc/semicircle/circumcirclearc', () => {
    const A: SceneObject = { id: 'A', label: 'arc', kind: FAKE_ARC, visible: true, locked: false, attrs: {} };
    const board = mockBoard();
    const r = new JxgRenderer(createStore(makeState(A)), board);
    r.highlight('A');
    const arcHalos = board.created.filter((c) => c.kind === 'arc');
    expect(arcHalos.length).toBe(1);
    expect((arcHalos[0].parents as Array<{ id: string }>).map((p) => p.id)).toEqual(['O', 'A', 'B']);
    r.dispose();
  });

  it('creates a sector halo (center/radiusPoint/anglePoint — chữ P hoa) for sector', () => {
    const A: SceneObject = { id: 'A', label: 'sec', kind: FAKE_SECTOR, visible: true, locked: false, attrs: {} };
    const board = mockBoard();
    const r = new JxgRenderer(createStore(makeState(A)), board);
    r.highlight('A');
    expect(board.created.filter((c) => c.kind === 'sector').length).toBe(1);
    r.dispose();
  });

  it('creates an angle halo for angle (vertex = center, arms = radiusPoint/anglePoint)', () => {
    const A: SceneObject = { id: 'A', label: 'ang', kind: FAKE_ANGLE, visible: true, locked: false, attrs: {} };
    const board = mockBoard();
    const r = new JxgRenderer(createStore(makeState(A)), board);
    r.highlight('A');
    const angHalos = board.created.filter((c) => c.kind === 'angle');
    expect(angHalos.length).toBe(1);
    // angle(p1, vertex, p2): vertex = center, arms = radiusPoint/anglePoint
    expect((angHalos[0].parents as Array<{ id: string }>).map((p) => p.id)).toEqual(['A', 'V', 'C']);
    r.dispose();
  });

  it('creates a gray segment halo via board.create when highlighting a segment', () => {
    const A = makeSegObj('A', '#1e40af', 2);
    const store = createStore(makeState(A));
    const board = mockBoard();
    const r = new JxgRenderer(store, board);

    r.highlight('A');
    // Tạo đúng 1 halo segment.
    const seghalos = board.created.filter((c) => c.kind === 'segment');
    expect(seghalos.length).toBe(1);
    const attrs = seghalos[0].attrs as Record<string, unknown>;
    expect(attrs.strokeColor).toBe('#475569');
    expect(attrs.strokeWidth).toBe(9);

    r.dispose();
  });

  it('switches halo from one id to another (removes old, creates new)', () => {
    const A = makeSegObj('A', '#1e40af', 2);
    const B = makeSegObj('B', '#16a34a', 3);
    const store = createStore(makeState(A, B));
    const board = mockBoard();
    const r = new JxgRenderer(store, board);

    r.highlight('A');
    expect(board.created.filter((c) => c.kind === 'segment').length).toBe(1);

    r.highlight('B');
    // Halo A bị removeObject, halo B mới được create.
    expect(board.removeObject).toHaveBeenCalledTimes(1);
    expect(board.created.filter((c) => c.kind === 'segment').length).toBe(2);

    r.dispose();
  });

  it('supports multi-id selection: creates N halos for N selected ids', () => {
    const A = makeSegObj('A', '#1e40af', 2);
    const B = makeSegObj('B', '#16a34a', 3);
    const store = createStore(makeState(A, B));
    const board = mockBoard();
    const r = new JxgRenderer(store, board);

    r.highlight(['A', 'B']);
    expect(board.created.filter((c) => c.kind === 'segment').length).toBe(2);

    r.highlight(null);
    expect(board.removeObject).toHaveBeenCalledTimes(2);

    r.dispose();
  });

  it('repeated highlight cycles do not leak halos', () => {
    const A = makeSegObj('A', '#1e40af', 2);
    const B = makeSegObj('B', '#16a34a', 3);
    const store = createStore(makeState(A, B));
    const board = mockBoard();
    const r = new JxgRenderer(store, board);

    for (let i = 0; i < 5; i++) {
      r.highlight('A');
      r.highlight('B');
    }
    r.highlight(null);

    // Mỗi lần switch tạo 1 halo, remove 1 halo → net 0.
    const totalCreated = board.created.filter((c) => c.kind === 'segment').length;
    const totalRemoved = board.removed.length;
    expect(totalCreated).toBe(totalRemoved);

    // Element gốc giữ nguyên màu.
    const elA = r.listElements().get('A') as AttrEl;
    const elB = r.listElements().get('B') as AttrEl;
    expect(elA.attrs.strokeColor).toBe('#1e40af');
    expect(elA.attrs.strokeWidth).toBe(2);
    expect(elB.attrs.strokeColor).toBe('#16a34a');
    expect(elB.attrs.strokeWidth).toBe(3);

    r.dispose();
  });
});
