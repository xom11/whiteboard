import { JxgRenderer } from '../JxgRenderer';
import { createStore } from '../../store';
import { createEmptyState, type State } from '../../types';
import '../../kinds/point';

// Mock label kéo được: relativeCoords mô phỏng đã kéo +5/+7 screen px.
function makeLabel() {
  const handlers: Record<string, Array<() => void>> = {};
  const dom: Record<string, Array<(ev: Event) => void>> = {};
  return {
    evalVisProp: (k: string) => (k === 'offset' ? [10, 10] : undefined),
    relativeCoords: { scrCoords: [1, 5, 7] },
    rendNode: {
      addEventListener: (e: string, cb: (ev: Event) => void) => { (dom[e] ??= []).push(cb); },
    },
    setAttribute: jest.fn(),
    on: (ev: string, cb: () => void) => { (handlers[ev] ??= []).push(cb); },
    _fire: (ev: string) => (handlers[ev] ?? []).forEach((c) => c()),
    _fireDom: (e: string) => (dom[e] ?? []).forEach((c) => c({ preventDefault() {} } as Event)),
  };
}

function makeBoard(label: ReturnType<typeof makeLabel>) {
  return {
    create: () => ({ label, on: () => {}, elType: 'point', X: () => 0, Y: () => 0 }),
    removeObject: () => {},
    update: () => {},
  };
}

function stateWithPoint(labelOffset?: [number, number]): State {
  const base = createEmptyState('2d');
  return {
    ...base,
    counter: 1,
    order: ['p1'],
    objects: {
      p1: {
        id: 'p1', kind: 'point', label: 'C', visible: true, locked: false, layer: '0',
        schemaVersion: 1, attrs: { constraint: { kind: 'free', x: 0, y: 0 }, labelOffset },
      },
    },
  };
}

it('kéo label → dispatch UPDATE_ATTRS với labelOffset tổng', () => {
  const store = createStore(stateWithPoint());
  const label = makeLabel();
  new JxgRenderer(store, makeBoard(label));
  label._fire('up');
  const off = (store.getState().objects.p1.attrs as { labelOffset?: [number, number] }).labelOffset;
  expect(off).toEqual([15, 3]); // [10+5, 10-7]
  // Sau khi gộp: setAttribute(offset) + zero relativeCoords để không double-count.
  expect(label.setAttribute).toHaveBeenCalledWith({ offset: [15, 3] });
  expect(label.relativeCoords.scrCoords).toEqual([1, 0, 0]);
});

it('right-click label → reset labelOffset về undefined', () => {
  const store = createStore(stateWithPoint([40, 40]));
  const label = makeLabel();
  new JxgRenderer(store, makeBoard(label));
  label._fireDom('contextmenu');
  const off = (store.getState().objects.p1.attrs as { labelOffset?: [number, number] }).labelOffset;
  expect(off).toBeUndefined();
});

it('không đổi offset → không dispatch (no-op)', () => {
  const store = createStore(stateWithPoint([15, 3]));
  const label = makeLabel(); // rel +5/+7, off [10,10] → tổng [15,3] == hiện tại
  new JxgRenderer(store, makeBoard(label));
  label._fire('up');
  const off = (store.getState().objects.p1.attrs as { labelOffset?: [number, number] }).labelOffset;
  expect(off).toEqual([15, 3]); // không đổi, setAttribute không được gọi do early-return
  expect(label.setAttribute).not.toHaveBeenCalled();
});
