import { JxgRenderer3D } from '../JxgRenderer3D';
import { createStore } from '../../store';

function mockView() {
  return { removeObject: jest.fn() };
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
});
