// src/core/scene/kinds/__tests__/intersection.render.test.ts
//
// Render + update-hook tests cho kind `intersection` (giao đường–đường/…):
//   - màu mặc định XANH (#1e40af) đồng bộ với các điểm khác (trước đây ĐỎ)
//   - đổi tên / đổi màu cập nhật TẠI CHỖ qua setAttribute (không recreate →
//     không làm stale các object phụ thuộc điểm giao)
//   - đổi định nghĩa hình học (ref1/ref2/kind/branch) thì throw → recreate
import { createStore } from '../../store';
import { createEmptyState } from '../../types';
import { JxgRenderer } from '../../render/JxgRenderer';
import '../../kinds';
import type { SceneObject } from '../../types';

function mockBoard() {
  const created: any[] = [];
  const removed: any[] = [];
  const board = {
    create: jest.fn((type: string, parents: any, attrs: any) => {
      const el: any = {
        type,
        parents,
        attrs,
        _id: `${type}_${created.length}`,
        setAttribute: jest.fn(function (this: any, patch: any) {
          Object.assign(this.attrs, patch);
        }),
      };
      created.push(el);
      return el;
    }),
    removeObject: jest.fn((el: any) => {
      removed.push(el);
    }),
  };
  return { board, created, removed };
}

const mkFree = (id: string, x = 0, y = 0): SceneObject => ({
  id, kind: 'point', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { constraint: { kind: 'free', x, y } },
});
const mkSegment = (id: string, p1: string, p2: string): SceneObject => ({
  id, kind: 'segment', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { p1, p2 },
});
const mkIntersection = (id: string, ref1: string, ref2: string): SceneObject => ({
  id, kind: 'intersection', label: id, visible: true, locked: false, layer: 'default',
  schemaVersion: 1, attrs: { kind: 'lineLine', ref1, ref2 },
});
const findByName = (created: any[], name: string) =>
  created.find((e) => e.attrs?.name === name);

function setup() {
  const store = createStore(createEmptyState('2d'));
  const mock = mockBoard();
  new JxgRenderer(store, mock.board as never);
  store.dispatch({ type: 'ADD', payload: { obj: mkFree('A', 0, 0) } });
  store.dispatch({ type: 'ADD', payload: { obj: mkFree('B', 4, 4) } });
  store.dispatch({ type: 'ADD', payload: { obj: mkFree('C', 0, 4) } });
  store.dispatch({ type: 'ADD', payload: { obj: mkFree('D', 4, 0) } });
  store.dispatch({ type: 'ADD', payload: { obj: mkSegment('s1', 'A', 'B') } });
  store.dispatch({ type: 'ADD', payload: { obj: mkSegment('s2', 'C', 'D') } });
  return { store, ...mock };
}

describe('kinds/intersection — màu xanh + đổi tên tại chỗ', () => {
  test('màu mặc định là xanh (#1e40af), không phải đỏ', () => {
    const { store, created } = setup();
    store.dispatch({ type: 'ADD', payload: { obj: mkIntersection('I', 's1', 's2') } });
    const I = findByName(created, 'I');
    expect(I.type).toBe('intersection');
    expect(I.attrs.strokeColor).toBe('#1e40af');
    expect(I.attrs.fillColor).toBe('#1e40af');
  });

  test('đổi tên cập nhật tại chỗ qua setAttribute, không recreate', () => {
    const { store, created, removed } = setup();
    store.dispatch({ type: 'ADD', payload: { obj: mkIntersection('I', 's1', 's2') } });
    const I = findByName(created, 'I');
    const before = created.filter((e) => e.type === 'intersection').length;
    store.dispatch({ type: 'UPDATE', payload: { id: 'I', patch: { label: 'K' } } });
    expect(created.filter((e) => e.type === 'intersection').length).toBe(before);
    expect(removed).not.toContain(I);
    expect(I.setAttribute).toHaveBeenCalledWith(expect.objectContaining({ name: 'K' }));
    expect(I.attrs.name).toBe('K');
  });

  test('đổi màu cập nhật tại chỗ', () => {
    const { store, created } = setup();
    store.dispatch({ type: 'ADD', payload: { obj: mkIntersection('I', 's1', 's2') } });
    const I = findByName(created, 'I');
    store.dispatch({ type: 'UPDATE_ATTRS', payload: { id: 'I', patch: { color: '#0ea5e9' } } });
    expect(I.setAttribute).toHaveBeenCalledWith(
      expect.objectContaining({ strokeColor: '#0ea5e9', fillColor: '#0ea5e9' }),
    );
  });

  test('đổi ref (định nghĩa hình học) thì recreate, tránh stale geometry', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { store, created, removed } = setup();
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('E', 1, 1) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkFree('F', 5, 1) } });
    store.dispatch({ type: 'ADD', payload: { obj: mkSegment('s3', 'E', 'F') } });
    store.dispatch({ type: 'ADD', payload: { obj: mkIntersection('I', 's1', 's2') } });
    const I = findByName(created, 'I');
    store.dispatch({ type: 'UPDATE_ATTRS', payload: { id: 'I', patch: { ref2: 's3' } } });
    expect(removed).toContain(I);
    expect(created.filter((e) => e.type === 'intersection').length).toBe(2);
    warn.mockRestore();
  });
});
