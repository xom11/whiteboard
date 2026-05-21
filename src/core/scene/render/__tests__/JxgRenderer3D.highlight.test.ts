import { JxgRenderer3D } from '../JxgRenderer3D';
import { createStore } from '../../store';
import { registerKind, getKind } from '../../registry';
import type { SceneObject, State } from '../../types';

const FAKE_ATTR_3D = 'highlight_attr_kind_3d';
try { getKind(FAKE_ATTR_3D); } catch {
  registerKind({
    type: FAKE_ATTR_3D,
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
        attrs,
        getAttribute(k: string) { return attrs[k]; },
        setAttribute(patch: Record<string, unknown>) { Object.assign(attrs, patch); },
      };
    },
  });
}

function mockView() {
  return { removeObject: jest.fn() };
}

type AttrEl = { attrs: Record<string, unknown> };

function makeAttrObj(id: string, color: string, width: number): SceneObject {
  return {
    id,
    label: id,
    kind: FAKE_ATTR_3D,
    visible: true,
    locked: false,
    attrs: { color, width },
  };
}

function makeAttrState(...objs: SceneObject[]): State {
  const map: Record<string, SceneObject> = {};
  for (const o of objs) map[o.id] = o;
  return {
    objects: map,
    order: objs.map((o) => o.id),
    counter: objs.length,
    meta: { domain: '3d', version: 1 },
  };
}

describe('JxgRenderer3D.highlight', () => {
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

  it('restores original strokeColor + strokeWidth after switching highlight', () => {
    const A = makeAttrObj('A', '#1e40af', 2);
    const B = makeAttrObj('B', '#16a34a', 3);
    const store = createStore(makeAttrState(A, B));
    const r = new JxgRenderer3D(store, mockView());

    const elA = r.listElements().get('A') as AttrEl;
    const elB = r.listElements().get('B') as AttrEl;

    r.highlight('A');
    expect(elA.attrs.strokeColor).toBe('#ef4444');
    expect(elA.attrs.strokeWidth).toBe(4);

    r.highlight('B');
    expect(elA.attrs.strokeColor).toBe('#1e40af');
    expect(elA.attrs.strokeWidth).toBe(2);
    expect(elB.attrs.strokeColor).toBe('#ef4444');
    expect(elB.attrs.strokeWidth).toBe(5);

    r.dispose();
  });

  it('does not accumulate strokeWidth across repeated highlight cycles', () => {
    const A = makeAttrObj('A', '#1e40af', 2);
    const B = makeAttrObj('B', '#16a34a', 3);
    const store = createStore(makeAttrState(A, B));
    const r = new JxgRenderer3D(store, mockView());

    const elA = r.listElements().get('A') as AttrEl;
    const elB = r.listElements().get('B') as AttrEl;

    for (let i = 0; i < 5; i++) {
      r.highlight('A');
      r.highlight('B');
    }
    r.highlight(null);

    expect(elA.attrs.strokeColor).toBe('#1e40af');
    expect(elA.attrs.strokeWidth).toBe(2);
    expect(elB.attrs.strokeColor).toBe('#16a34a');
    expect(elB.attrs.strokeWidth).toBe(3);

    r.dispose();
  });
});
