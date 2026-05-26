import { JxgRenderer3D } from '../JxgRenderer3D';
import { createStore } from '../../store';
import { registerKind, getKind } from '../../registry';
import type { SceneObject, State } from '../../types';

const FAKE_LINE3D = 'highlight_line3d_kind';
try { getKind(FAKE_LINE3D); } catch {
  registerKind({
    type: FAKE_LINE3D,
    schemaVersion: 1,
    migrate: {},
    dependsOn: () => [],
    describe: (o) => o.label,
    render: (obj) => {
      const a = obj.attrs as { color?: string; width?: number };
      const attrs: Record<string, unknown> = {
        strokeColor: a.color ?? '#1e40af',
        strokeWidth: a.width ?? 2,
        straightFirst: false,
        straightLast: false,
      };
      return {
        elType: 'line3d',
        point1: { id: `${obj.id}_p1` },
        point2: { id: `${obj.id}_p2` },
        attrs,
        getAttribute(k: string) { return attrs[k]; },
        setAttribute(patch: Record<string, unknown>) { Object.assign(attrs, patch); },
      };
    },
  });
}

function mockView() {
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

function makeLine3dObj(id: string, color: string, width: number): SceneObject {
  return {
    id,
    label: id,
    kind: FAKE_LINE3D,
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
    meta: { domain: '3d', version: 1 },
  };
}

describe('JxgRenderer3D.highlight (halo overlay)', () => {
  it('exposes highlight method', () => {
    const store = createStore({ objects: {}, order: [], counter: 0, meta: { domain: '3d', version: 1 } });
    const r = new JxgRenderer3D(store, mockView());
    expect(typeof r.highlight).toBe('function');
    r.dispose();
  });

  it('highlight(null) on empty does not throw', () => {
    const store = createStore({ objects: {}, order: [], counter: 0, meta: { domain: '3d', version: 1 } });
    const r = new JxgRenderer3D(store, mockView());
    expect(() => r.highlight(null)).not.toThrow();
    r.dispose();
  });

  it('highlight(unknown) does not throw', () => {
    const store = createStore({ objects: {}, order: [], counter: 0, meta: { domain: '3d', version: 1 } });
    const r = new JxgRenderer3D(store, mockView());
    expect(() => r.highlight('nope')).not.toThrow();
    r.dispose();
  });

  it('does NOT mutate original element strokeColor/strokeWidth', () => {
    const A = makeLine3dObj('A', '#1e40af', 2);
    const store = createStore(makeState(A));
    const view = mockView();
    const r = new JxgRenderer3D(store, view);

    const elA = r.listElements().get('A') as AttrEl;

    r.highlight('A');
    expect(elA.attrs.strokeColor).toBe('#1e40af');
    expect(elA.attrs.strokeWidth).toBe(2);

    r.dispose();
  });

  it('creates a gray line3d halo via view.create when highlighting', () => {
    const A = makeLine3dObj('A', '#1e40af', 2);
    const store = createStore(makeState(A));
    const view = mockView();
    const r = new JxgRenderer3D(store, view);

    r.highlight('A');
    const halos = view.created.filter((c) => c.kind === 'line3d');
    expect(halos.length).toBe(1);
    const attrs = halos[0].attrs as Record<string, unknown>;
    expect(attrs.strokeColor).toBe('#475569');
    expect(attrs.strokeWidth).toBe(9);

    r.dispose();
  });

  it('supports multi-id selection', () => {
    const A = makeLine3dObj('A', '#1e40af', 2);
    const B = makeLine3dObj('B', '#16a34a', 3);
    const store = createStore(makeState(A, B));
    const view = mockView();
    const r = new JxgRenderer3D(store, view);

    r.highlight(['A', 'B']);
    expect(view.created.filter((c) => c.kind === 'line3d').length).toBe(2);

    r.highlight(null);
    expect(view.removeObject).toHaveBeenCalledTimes(2);

    r.dispose();
  });

  it('repeated highlight cycles do not leak halos', () => {
    const A = makeLine3dObj('A', '#1e40af', 2);
    const B = makeLine3dObj('B', '#16a34a', 3);
    const store = createStore(makeState(A, B));
    const view = mockView();
    const r = new JxgRenderer3D(store, view);

    for (let i = 0; i < 5; i++) {
      r.highlight('A');
      r.highlight('B');
    }
    r.highlight(null);

    const totalCreated = view.created.filter((c) => c.kind === 'line3d').length;
    const totalRemoved = view.removed.length;
    expect(totalCreated).toBe(totalRemoved);

    const elA = r.listElements().get('A') as AttrEl;
    const elB = r.listElements().get('B') as AttrEl;
    expect(elA.attrs.strokeColor).toBe('#1e40af');
    expect(elA.attrs.strokeWidth).toBe(2);
    expect(elB.attrs.strokeColor).toBe('#16a34a');
    expect(elB.attrs.strokeWidth).toBe(3);

    r.dispose();
  });
});
