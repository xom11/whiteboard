// src/core/scene/render/__tests__/JxgRenderer.test.ts
import { createStore } from '../../store';
import { createEmptyState } from '../../types';
import { JxgRenderer } from '../JxgRenderer';
import '../../kinds';
import type { SceneObject } from '../../types';

function mockBoard() {
  const created: any[] = [];
  const removed: any[] = [];
  const board = {
    create: jest.fn((type: string, parents: any, attrs: any) => {
      const el: any = { type, parents, attrs, _id: `${type}_${created.length}` };
      // Mock JSXGraph polygon: auto-tạo borders array (sub-segment per edge).
      // Cho phép resolveRef("<polyId>:border:<i>") trả về object đại diện cạnh.
      if (type === 'polygon' && Array.isArray(parents)) {
        el.borders = parents.map((_v, idx) => ({ type: 'segment_border', _borderIdx: idx, _polyParent: el }));
      }
      created.push(el);
      return el;
    }),
    removeObject: jest.fn((el: any) => { removed.push(el); }),
  };
  return { board, created, removed };
}

const mkPoint = (id: string, x = 0, y = 0): SceneObject => ({
  id, kind: 'point', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1,
  attrs: { constraint: { kind: 'free', x, y } },
});

const mkSegment = (id: string, p1: string, p2: string): SceneObject => ({
  id, kind: 'segment', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1,
  attrs: { p1, p2 },
});

const mkPolygon = (id: string, vertices: string[]): SceneObject => ({
  id, kind: 'polygon', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1,
  attrs: { vertices },
});

describe('JxgRenderer (2D)', () => {
  test('ADD point → board.create("point", [x, y], ...)', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A', 1, 2) } });
    expect(created).toHaveLength(1);
    expect(created[0].type).toBe('point');
    expect(created[0].parents).toEqual([1, 2]);
  });

  test('ADD segment sau 2 point → parents resolved đúng', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkSegment('s1', 'A', 'B') } });
    expect(created).toHaveLength(3);
    expect(created[2].type).toBe('segment');
    expect(created[2].parents[0]).toBe(created[0]);
    expect(created[2].parents[1]).toBe(created[1]);
  });

  test('ADD polygon sau 3 point → parents là array refs', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('C') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPolygon('poly1', ['A', 'B', 'C']) } });
    expect(created).toHaveLength(4);
    expect(created[3].type).toBe('polygon');
    expect(created[3].parents).toEqual([created[0], created[1], created[2]]);
  });

  test('DELETE point cascade → segment cũng remove', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, removed } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkSegment('s1', 'A', 'B') } });
    store.dispatch({ type: 'DELETE', payload: { id: 'A' } });
    expect(removed.length).toBeGreaterThanOrEqual(2);
  });

  test('UPDATE_ATTRS free→free point → giữ identity (không recreate)', () => {
    // Point kind có `update` hook xử lý free→free coordinate change qua
    // setPositionDirectly + setAttribute. Giữ JxgObj identity là yêu cầu
    // để các object phụ thuộc (segment/line/polygon) không bị stale parent
    // ref khi user kéo điểm bằng tay.
    const store = createStore(createEmptyState('2d'));
    const { board, created, removed } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A', 0, 0) } });
    store.dispatch({ type: 'UPDATE_ATTRS', payload: { id: 'A', patch: { constraint: { kind: 'free', x: 5, y: 5 } } } });
    expect(removed).toHaveLength(0);
    expect(created).toHaveLength(1);
  });

  test('dispose unsubscribe + remove tất cả', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, removed } = mockBoard();
    const renderer = new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A') } });
    renderer.dispose();
    expect(removed).toHaveLength(1);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B') } });
    expect(removed).toHaveLength(1);
  });

  test('LOAD state từ empty → render toàn bộ theo state.order', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    const loaded = {
      objects: {
        A: mkPoint('A', 1, 1),
        B: mkPoint('B', 2, 2),
        s1: mkSegment('s1', 'A', 'B'),
      },
      order: ['A', 'B', 's1'],
      counter: 3,
      meta: { domain: '2d' as const, version: 1 },
    };
    store.dispatch({ type: 'LOAD', payload: { state: loaded } });
    expect(created).toHaveLength(3);
    expect(created.map(c => c.type)).toEqual(['point', 'point', 'segment']);
  });

  test('UNDO sau ADD → element bị remove', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, removed } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A') } });
    expect(removed).toHaveLength(0);
    store.undo();
    expect(removed).toHaveLength(1);
  });

  // Polygon edges (sub-segment do JSXGraph auto-tạo) không có scene id riêng.
  // Synthetic id "<polyId>:border:<i>" cho phép construct tools tham chiếu
  // cạnh đa giác như một line input (perpendicular, parallel).
  describe('polygon border (synthetic "<polyId>:border:<N>")', () => {
    const mkPerp = (id: string, through: string, toLine: string): SceneObject => ({
      id, kind: 'line', label: id, visible: true, locked: false, layer: 'default',
      schemaVersion: 1,
      attrs: { construction: { kind: 'perpendicular', throughPoint: through, toLine } },
    });

    test('resolveRef "<polyId>:border:<N>" → polygon.borders[N]', () => {
      const store = createStore(createEmptyState('2d'));
      const { board, created } = mockBoard();
      new JxgRenderer(store, board as never);
      store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A') } });
      store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B') } });
      store.dispatch({ type: 'ADD', payload: { obj: mkPoint('C') } });
      store.dispatch({ type: 'ADD', payload: { obj: mkPoint('P', 5, 5) } });
      store.dispatch({ type: 'ADD', payload: { obj: mkPolygon('poly1', ['A', 'B', 'C']) } });
      store.dispatch({ type: 'ADD', payload: { obj: mkPerp('l1', 'P', 'poly1:border:1') } });

      const polyEl = created.find(c => c.type === 'polygon');
      const lineEl = created.find(c => c.type === 'perpendicular');
      expect(polyEl).toBeDefined();
      expect(lineEl).toBeDefined();
      // JSXGraph: create('perpendicular', [line, point]) → parents[0] là line.
      expect(lineEl!.parents[0]).toBe(polyEl!.borders[1]);
      expect(lineEl!.parents[1]).toBe(created.find(c => c._id.startsWith('point_') && c.parents[0] === 5));
    });

    test('DELETE polygon cascade → perpendicular qua border cũng remove', () => {
      const store = createStore(createEmptyState('2d'));
      const { board, removed } = mockBoard();
      new JxgRenderer(store, board as never);
      store.dispatch({ type: 'ADD', payload: { obj: mkPoint('A') } });
      store.dispatch({ type: 'ADD', payload: { obj: mkPoint('B') } });
      store.dispatch({ type: 'ADD', payload: { obj: mkPoint('C') } });
      store.dispatch({ type: 'ADD', payload: { obj: mkPoint('P', 5, 5) } });
      store.dispatch({ type: 'ADD', payload: { obj: mkPolygon('poly1', ['A', 'B', 'C']) } });
      store.dispatch({ type: 'ADD', payload: { obj: mkPerp('l1', 'P', 'poly1:border:0') } });

      const before = removed.length;
      store.dispatch({ type: 'DELETE', payload: { id: 'poly1' } });
      // Cascade phải xoá cả polygon + line phụ thuộc cạnh polygon.
      expect(removed.length).toBeGreaterThanOrEqual(before + 2);
    });
  });
});
