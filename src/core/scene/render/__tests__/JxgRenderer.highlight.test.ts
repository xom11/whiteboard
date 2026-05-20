import { JxgRenderer } from '../JxgRenderer';
import { createStore } from '../../store';
import { registerKind, getKind } from '../../registry';

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

function mockBoard() {
  return {
    removeObject: jest.fn(),
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
});
