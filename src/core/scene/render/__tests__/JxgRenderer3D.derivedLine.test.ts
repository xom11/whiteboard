// src/core/scene/render/__tests__/JxgRenderer3D.derivedLine.test.ts
// Render-dispatch test cho ĐƯỜNG PHÁI SINH 3D (construction-variant) qua
// JxgRenderer3D thật + mockView. Verify line3d construction:
// (1) parents là 2 HÀM trả toạ độ tính (KHÔNG throw, KHÔNG (0,0,0)),
// (2) needsRegularUpdate bật, (3) đọc STATE SỐNG nên cập nhật khi mặt phẳng đổi.
import { JxgRenderer3D } from '../JxgRenderer3D';
import { createStore } from '../../store';
import { createEmptyState } from '../../types';
import '../../kinds';
import type { SceneObject } from '../../types';

function mockView() {
  const created: any[] = [];
  const view = {
    create: jest.fn((kind: string, parents: any, attrs: any) => {
      const el: any = { kind, parents, attrs, _id: `${kind}_${created.length}` };
      created.push(el);
      return el;
    }),
    removeObject: jest.fn(),
    update: jest.fn(),
  };
  return { view, created };
}

const free = (id: string, x: number, y: number, z: number): SceneObject => ({
  id, kind: 'point3d', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { constraint: { kind: 'free', x, y, z } },
});
const plane = (id: string, p1: string, p2: string, p3: string): SceneObject => ({
  id, kind: 'plane3d', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { p1, p2, p3 } as never,
});
const derivedLine = (id: string, construction: unknown): SceneObject => ({
  id, kind: 'line3d', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { construction } as never,
});
const ev = (fn: unknown): number[] => (typeof fn === 'function' ? (fn as () => number[])() : (fn as number[]));

describe('JxgRenderer3D render đường phái sinh (planePlaneIntersection)', () => {
  function setup() {
    const store = createStore(createEmptyState('3d'));
    const { view, created } = mockView();
    new JxgRenderer3D(store, view as never);
    // mp z=0 (A,B,C) và mp y=0 (E,F,H) — KHÔNG chia sẻ điểm (để di mp1 độc lập).
    store.dispatch({ type: 'ADD', payload: { obj: free('A', 0, 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: free('B', 1, 0, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: free('C', 0, 1, 0) } });
    store.dispatch({ type: 'ADD', payload: { obj: plane('z0', 'A', 'B', 'C') } });
    store.dispatch({ type: 'ADD', payload: { obj: free('E', 0, 0, 3) } });
    store.dispatch({ type: 'ADD', payload: { obj: free('F', 1, 0, 3) } });
    store.dispatch({ type: 'ADD', payload: { obj: free('H', 0, 0, 5) } });
    store.dispatch({ type: 'ADD', payload: { obj: plane('y0', 'E', 'F', 'H') } });
    store.dispatch({ type: 'ADD', payload: { obj: derivedLine('g', { kind: 'planePlaneIntersection', plane1: 'z0', plane2: 'y0' }) } });
    const line = created.find((e) => e.kind === 'line3d');
    return { store, line };
  }

  it('parents là 2 hàm trả điểm trên giao tuyến (trục x), needsRegularUpdate bật', () => {
    const { line } = setup();
    expect(line).toBeDefined();
    expect(typeof line.parents[0]).toBe('function');
    expect(typeof line.parents[1]).toBe('function');
    const a = ev(line.parents[0]);
    const b = ev(line.parents[1]);
    // giao tuyến (z=0)∩(y=0) = trục x: cả a,b có y≈0,z≈0
    expect(a[1]).toBeCloseTo(0, 9); expect(a[2]).toBeCloseTo(0, 9);
    expect(b[1]).toBeCloseTo(0, 9); expect(b[2]).toBeCloseTo(0, 9);
    expect(a.every(Number.isFinite) && b.every(Number.isFinite)).toBe(true);
    // KHÔNG sụp (0,0,0)-(0,0,0): 2 điểm phân biệt
    expect(a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2]).toBe(true);
    expect(line.attrs.needsRegularUpdate).toBe(true);
  });

  it('live-update: nâng mp z=0 lên z=2 → giao tuyến lên z=2 (đọc state sống)', () => {
    const { store, line } = setup();
    expect(ev(line.parents[0])[2]).toBeCloseTo(0, 9); // z ban đầu = 0
    // nâng cả 3 điểm của mp1 lên z=2 → mặt z=2; giao với mp y=0 → {y=0, z=2}
    for (const [id, x, y] of [['A', 0, 0], ['B', 1, 0], ['C', 0, 1]] as const) {
      store.dispatch({ type: 'UPDATE_ATTRS', payload: { id, patch: { constraint: { kind: 'free', x, y, z: 2 } } } });
    }
    const a = ev(line.parents[0]);
    expect(a[2]).toBeCloseTo(2, 9); // toạ độ tính lại từ state mới
    expect(a[1]).toBeCloseTo(0, 9);
  });
});
