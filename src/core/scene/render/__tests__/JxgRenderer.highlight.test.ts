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

// JSXGraph-mock kind: element exposes getAttribute/setAttribute on a real
// attrs bag, so we can assert that highlight() restores using the correct
// JSXGraph attribute names.
const FAKE_ATTR = 'highlight_attr_kind';
try { getKind(FAKE_ATTR); } catch {
  registerKind({
    type: FAKE_ATTR,
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

function mockBoard() {
  return {
    removeObject: jest.fn(),
  };
}

type AttrEl = { attrs: Record<string, unknown> };

function makeAttrObj(id: string, color: string, width: number): SceneObject {
  return {
    id,
    label: id,
    kind: FAKE_ATTR,
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
    meta: { domain: '2d', version: 1 },
  };
}

describe('JxgRenderer.highlight', () => {
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

  it('restores original strokeColor + strokeWidth after switching highlight', () => {
    const A = makeAttrObj('A', '#1e40af', 2);
    const B = makeAttrObj('B', '#16a34a', 3);
    const store = createStore(makeAttrState(A, B));
    const r = new JxgRenderer(store, mockBoard());

    const elA = r.listElements().get('A') as AttrEl;
    const elB = r.listElements().get('B') as AttrEl;

    r.highlight('A');
    expect(elA.attrs.strokeColor).toBe('#ef4444');
    expect(elA.attrs.strokeWidth).toBe(4);

    r.highlight('B');
    // A must be reverted to its original colors — not stay red.
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
    const r = new JxgRenderer(store, mockBoard());

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
