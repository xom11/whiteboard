// src/core/scene/kinds/__tests__/point.pointAtDistance.test.ts
//
// Render-dispatch test cho pointAtDistance. Mock board cấp X()/Y()/Radius()
// để evaluate functional coords → verify KHÔNG rơi vào fallback [0,0].
import { createStore } from '../../store';
import { createEmptyState } from '../../types';
import { JxgRenderer } from '../../render/JxgRenderer';
import '../../kinds';
import type { SceneObject } from '../../types';

function mockBoard() {
  const created: any[] = [];
  const board = {
    create: jest.fn((type: string, parents: any, attrs: any) => {
      const el: any = { type, parents, attrs, _id: `${type}_${created.length}` };
      if (type === 'point') {
        el.X = () => (typeof parents[0] === 'function' ? parents[0]() : parents[0]);
        el.Y = () => (typeof parents[1] === 'function' ? parents[1]() : parents[1]);
      }
      if (type === 'circle' && Array.isArray(parents)) {
        el.center = parents[0];
        el.Radius = () => (typeof parents[1] === 'function' ? parents[1]() : parents[1]);
      }
      created.push(el);
      return el;
    }),
    removeObject: jest.fn(),
  };
  return { board, created };
}

const mkFree = (id: string, x: number, y: number): SceneObject => ({
  id, kind: 'point', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { constraint: { kind: 'free', x, y } },
});

const mkCircleCR = (id: string, center: string, radius: number): SceneObject => ({
  id, kind: 'circle', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { center, radius },
});

// mkPointC: id doubles as label (matching intersection test convention)
const mkPointC = (id: string, constraint: unknown): SceneObject => ({
  id, kind: 'point', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { constraint: constraint as never },
});

function findByName(created: any[], name: string) {
  return created.find((e) => e.attrs?.name === name);
}

describe('render pointAtDistance', () => {
  it('circleRadius: C = B + R·unit(B-A), KHÔNG (0,0)', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    // A=(3,0), B=(0,3), R=3 → unit(B-A) = (-3/√2, 3/√2)/3 = (-1/√2, 1/√2)
    // C = B + R·unit(B-A) = (0-3/√2, 3+3/√2)
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('p1', 3, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('p2', 0, 3) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkCircleCR('c1', 'p1', 3) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPointC('C', { kind: 'pointAtDistance', from: 'p1', through: 'p2', distance: { kind: 'circleRadius', circle: 'c1' } }) } });
    const c = findByName(created, 'C');
    expect(c).toBeDefined();
    expect(c.X()).toBeCloseTo(-3 / Math.SQRT2, 5);
    expect(c.Y()).toBeCloseTo(3 + 3 / Math.SQRT2, 5);
    expect(c.X() === 0 && c.Y() === 0).toBe(false);
  });

  it('literal: A=(0,0) B=(3,0) d=2 → C=(5,0)', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('p1', 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('p2', 3, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPointC('C', { kind: 'pointAtDistance', from: 'p1', through: 'p2', distance: { kind: 'literal', value: 2 } }) } });
    const c = findByName(created, 'C');
    expect(c).toBeDefined();
    expect(c.X()).toBeCloseTo(5, 5);
    expect(c.Y()).toBeCloseTo(0, 5);
  });

  it('segmentLength: d = |p4 p5| (=3), A=(0,0) B=(0,4) → C=(0,7)', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('p1', 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('p2', 0, 4) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('p4', 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('p5', 3, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPointC('C', { kind: 'pointAtDistance', from: 'p1', through: 'p2', distance: { kind: 'segmentLength', p1: 'p4', p2: 'p5' } }) } });
    const c = findByName(created, 'C');
    expect(c).toBeDefined();
    expect(c.X()).toBeCloseTo(0, 5);
    expect(c.Y()).toBeCloseTo(7, 5);
  });

  // ── Issue #46 nhóm C: scale·base + offset ────────────────────────────────

  it('literal scale 2: A=(0,0) B=(3,0) base=2 scale=2 d=4 → C=(7,0)', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('p1', 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('p2', 3, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPointC('C', { kind: 'pointAtDistance', from: 'p1', through: 'p2', distance: { kind: 'literal', value: 2, scale: 2 } }) } });
    const c = findByName(created, 'C');
    expect(c.X()).toBeCloseTo(7, 5); // 3 + 2·2 = 7
    expect(c.Y()).toBeCloseTo(0, 5);
  });

  it('circleRadius scale 2: R=3 scale=2 d=6, A=(0,0) B=(1,0) → C=(7,0)', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('p1', 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('p2', 1, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkCircleCR('c1', 'p1', 3) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPointC('C', { kind: 'pointAtDistance', from: 'p1', through: 'p2', distance: { kind: 'circleRadius', circle: 'c1', scale: 2 } }) } });
    const c = findByName(created, 'C');
    expect(c.X()).toBeCloseTo(7, 5); // 1 + 2·3 = 7
    expect(c.Y()).toBeCloseTo(0, 5);
  });

  it('circleRadius offset +1: R=3 offset=1 d=4, A=(0,0) B=(1,0) → C=(5,0)', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('p1', 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('p2', 1, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkCircleCR('c1', 'p1', 3) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPointC('C', { kind: 'pointAtDistance', from: 'p1', through: 'p2', distance: { kind: 'circleRadius', circle: 'c1', offset: 1 } }) } });
    const c = findByName(created, 'C');
    expect(c.X()).toBeCloseTo(5, 5); // 1 + (3+1) = 5
    expect(c.Y()).toBeCloseTo(0, 5);
  });

  it('circleRadius scale 2 + offset 1: R=3 → d=7, A=(0,0) B=(1,0) → C=(8,0)', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('p1', 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('p2', 1, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkCircleCR('c1', 'p1', 3) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPointC('C', { kind: 'pointAtDistance', from: 'p1', through: 'p2', distance: { kind: 'circleRadius', circle: 'c1', scale: 2, offset: 1 } }) } });
    const c = findByName(created, 'C');
    expect(c.X()).toBeCloseTo(8, 5); // 1 + (2·3+1) = 8
    expect(c.Y()).toBeCloseTo(0, 5);
  });
});
