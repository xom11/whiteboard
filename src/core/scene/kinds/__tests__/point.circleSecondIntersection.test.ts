// Render-dispatch tests cho construct "đường tròn đường kính đôi một cắt nhau":
//   - circleDiameter (circle construction) → midpoint ẩn + circle([midpoint, p2])
//   - circleSecondIntersection (point)     → JSXGraph 'otherintersection' [c1, c2, exclude]
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
      if (type === 'circle' && Array.isArray(parents)) el.center = parents[0];
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
const mkPointC = (id: string, constraint: unknown): SceneObject => ({
  id, kind: 'point', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { constraint: constraint as never },
});
const mkCircleDia = (id: string, p1: string, p2: string): SceneObject => ({
  id, kind: 'circle', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { construction: { kind: 'diameter', p1, p2 } },
});
const findByName = (created: any[], name: string) => created.find((e) => e.attrs?.name === name);

describe('point render — diameter-circle-pairwise constructs', () => {
  test('circleDiameter → midpoint ẩn + circle([midpoint, p2]) (bán kính |p1p2|/2)', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('A', 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('B', 4, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkCircleDia('kAB', 'A', 'B') } });

    const mid = created.find((e) => e.type === 'midpoint');
    expect(mid).toBeDefined();
    const A = findByName(created, 'A');
    const B = findByName(created, 'B');
    expect(mid.parents).toEqual([A, B]);
    expect(mid.attrs.visible).toBe(false);

    const circ = findByName(created, 'kAB');
    expect(circ.type).toBe('circle');
    expect(circ.parents[0]).toBe(mid); // tâm = trung điểm
    expect(circ.parents[1]).toBe(B);   // qua B → r = |mid B| = |AB|/2
  });

  test('circleSecondIntersection → otherintersection [c1, c2, exclude]', () => {
    const store = createStore(createEmptyState('2d'));
    const { board, created } = mockBoard();
    new JxgRenderer(store, board as never);
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('A', 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('B', 4, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('C', 2, 4) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkCircleDia('kAB', 'A', 'B') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkCircleDia('kAC', 'A', 'C') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkPointC('M', { kind: 'circleSecondIntersection', c1: 'kAB', c2: 'kAC', exclude: 'A' }) } });

    const kAB = findByName(created, 'kAB');
    const kAC = findByName(created, 'kAC');
    const A = findByName(created, 'A');
    const M = findByName(created, 'M');
    expect(M.type).toBe('otherintersection');
    expect(M.parents[0]).toBe(kAB);
    expect(M.parents[1]).toBe(kAC);
    expect(M.parents[2]).toBe(A);
  });
});
