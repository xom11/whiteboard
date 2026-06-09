// src/core/scene/kinds/__tests__/point.intersection.test.ts
//
// Render-dispatch tests cho 3 point constraint phái sinh từ đường tròn:
//   - circleIntersection → JSXGraph 'intersection' (2 circle, branch which)
//   - secondIntersection  → JSXGraph 'otherintersection' (circle, line, other)
//   - tangencyPoint       → JSXGraph 'perpendicularpoint' (line, circle.center)
//
// Trước fix, các constraint này không có handler trong point.ts → fallback
// board.create('point', [0,0]) → mọi điểm sụp về gốc toạ độ (NaN cascade ở
// cau-08 và 8 đề PDF khác). Test verify đúng primitive + parents đã resolve.
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
      // Mock JSXGraph circle: expose `.center` (JxgRenderer dùng cho tangencyPoint).
      if (type === 'circle' && Array.isArray(parents)) {
        el.center = parents[0];
      }
      created.push(el);
      return el;
    }),
    removeObject: jest.fn(),
  };
  return { board, created };
}

const mkFree = (id: string, x = 0, y = 0): SceneObject => ({
  id, kind: 'point', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { constraint: { kind: 'free', x, y } },
});

const mkCircleCR = (id: string, center: string, radius: number): SceneObject => ({
  id, kind: 'circle', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { center, radius },
});

const mkIncircle = (id: string, p1: string, p2: string, p3: string): SceneObject => ({
  id, kind: 'circle', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { construction: { kind: 'incircle', p1, p2, p3 } },
});

const mkSegment = (id: string, p1: string, p2: string): SceneObject => ({
  id, kind: 'segment', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { p1, p2 },
});

const mkPointC = (id: string, constraint: unknown): SceneObject => ({
  id, kind: 'point', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { constraint: constraint as never },
});

function findByName(created: any[], name: string) {
  return created.find((e) => e.attrs?.name === name);
}

describe('point render — circle-derived constraints', () => {
  test('circleIntersection → board.create("intersection", [c1, c2, which])', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('O1', 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('O2', 6, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkCircleCR('k1', 'O1', 5) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkCircleCR('k2', 'O2', 5) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPointC('A', { kind: 'circleIntersection', c1: 'k1', c2: 'k2', which: 0 }) } });

    const k1 = findByName(created, 'k1');
    const k2 = findByName(created, 'k2');
    const A = findByName(created, 'A');
    expect(A.type).toBe('intersection');
    expect(A.parents[0]).toBe(k1);
    expect(A.parents[1]).toBe(k2);
    expect(A.parents[2]).toBe(0);
  });

  test('circleIntersection which=1 passes branch 1', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('O1', 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('O2', 6, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkCircleCR('k1', 'O1', 5) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkCircleCR('k2', 'O2', 5) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPointC('B', { kind: 'circleIntersection', c1: 'k1', c2: 'k2', which: 1 }) } });
    const B = findByName(created, 'B');
    expect(B.type).toBe('intersection');
    expect(B.parents[2]).toBe(1);
  });

  test('secondIntersection → board.create("otherintersection", [circle, line, other])', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('O1', 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('P', 10, 3) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('A', 5, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkCircleCR('k1', 'O1', 5) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkSegment('ln', 'A', 'P') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPointC('C', { kind: 'secondIntersection', line: 'ln', circle: 'k1', other: 'A' }) } });

    const k1 = findByName(created, 'k1');
    const ln = findByName(created, 'ln');
    const A = findByName(created, 'A');
    const C = findByName(created, 'C');
    expect(C.type).toBe('otherintersection');
    expect(C.parents[0]).toBe(k1);
    expect(C.parents[1]).toBe(ln);
    expect(C.parents[2]).toBe(A);
  });

  test('tangencyPoint → board.create("perpendicularpoint", [line, circle.center])', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('O1', 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('T1', 5, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('T2', 5, 3) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkCircleCR('k1', 'O1', 5) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkSegment('tan', 'T1', 'T2') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPointC('H', { kind: 'tangencyPoint', circle: 'k1', onLine: 'tan' }) } });

    const k1 = findByName(created, 'k1');
    const O1 = findByName(created, 'O1');
    const tan = findByName(created, 'tan');
    const H = findByName(created, 'H');
    expect(H.type).toBe('perpendicularpoint');
    expect(H.parents[0]).toBe(tan);
    // circle.center === resolved center point O1
    expect(H.parents[1]).toBe(k1.center);
    expect(k1.center).toBe(O1);
  });

  test('tangencyPoint on incircle uses derived incenter instead of raw circle object', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('A', 0, 3) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('B', -2, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('C', 2, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkIncircle('I', 'A', 'B', 'C') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkSegment('BC', 'B', 'C') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPointC('D', { kind: 'tangencyPoint', circle: 'I', onLine: 'BC' }) } });

    const incircle = created.find((e) => e.type === 'incircle' && e.attrs?.name === 'I');
    const incenter = created.find((e) => e.type === 'incenter' && e.attrs?.name === 'I');
    const line = findByName(created, 'BC');
    const D = findByName(created, 'D');
    expect(incircle?.type).toBe('incircle');
    expect(incenter).toBeDefined();
    expect(D.type).toBe('perpendicularpoint');
    expect(D.parents[0]).toBe(line);
    expect(D.parents[1]).toBe(incenter);
    expect(incircle?.center).toBe(incenter);
  });
});
