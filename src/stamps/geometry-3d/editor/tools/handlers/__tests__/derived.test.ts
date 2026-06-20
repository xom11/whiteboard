// src/stamps/geometry-3d/editor/tools/handlers/__tests__/derived.test.ts
// Handler build-test cho điểm phái sinh 3D (tool editor → scene object).
import { createStore, createEmptyState } from '../../../../../../core/scene';
import { addPoint } from '../_ensurePoint';
import {
  buildMidpoint,
  buildCentroid,
  buildIntersectionLines,
  buildPerpFootLine,
} from '../derived';
import type { CollectedArg } from '../../spec';
import type { Point3DAttrs } from '../../../../../../core/scene/kinds/point3d';

const pointStep = { type: 'point', allowExisting: true, allowNewOn: [], hint: '' } as const;
const existing = (pointId: string): CollectedArg =>
  ({ step: pointStep as never, hit: { kind: 'existingPoint', pointId } });

describe('buildMidpoint', () => {
  it('tạo point3d midpoint{p1,p2} từ 2 điểm có sẵn', () => {
    const store = createStore(createEmptyState('3d'));
    const a = addPoint(store, { kind: 'free', x: 0, y: 0, z: 0 });
    const b = addPoint(store, { kind: 'free', x: 2, y: 0, z: 0 });
    const id = buildMidpoint([existing(a), existing(b)], store);
    expect(id).toBeTruthy();
    const obj = store.getState().objects[id!];
    expect(obj.kind).toBe('point3d');
    expect((obj.attrs as Point3DAttrs).constraint).toEqual({ kind: 'midpoint', p1: a, p2: b });
  });

  it('trả null nếu thiếu điểm thứ hai', () => {
    const store = createStore(createEmptyState('3d'));
    const a = addPoint(store, { kind: 'free', x: 0, y: 0, z: 0 });
    expect(buildMidpoint([existing(a)], store)).toBeNull();
  });

  it('trả null nếu 2 điểm trùng nhau', () => {
    const store = createStore(createEmptyState('3d'));
    const a = addPoint(store, { kind: 'free', x: 0, y: 0, z: 0 });
    expect(buildMidpoint([existing(a), existing(a)], store)).toBeNull();
  });
});

describe('buildCentroid', () => {
  it('tạo point3d centroid{vertices} từ 3 điểm có sẵn', () => {
    const store = createStore(createEmptyState('3d'));
    const a = addPoint(store, { kind: 'free', x: 0, y: 0, z: 0 });
    const b = addPoint(store, { kind: 'free', x: 3, y: 0, z: 0 });
    const c = addPoint(store, { kind: 'free', x: 0, y: 3, z: 0 });
    const id = buildCentroid([existing(a), existing(b), existing(c)], store);
    expect(id).toBeTruthy();
    expect((store.getState().objects[id!].attrs as Point3DAttrs).constraint)
      .toEqual({ kind: 'centroid', vertices: [a, b, c] });
  });

  it('trả null nếu < 3 đỉnh phân biệt', () => {
    const store = createStore(createEmptyState('3d'));
    const a = addPoint(store, { kind: 'free', x: 0, y: 0, z: 0 });
    const b = addPoint(store, { kind: 'free', x: 3, y: 0, z: 0 });
    expect(buildCentroid([existing(a), existing(b)], store)).toBeNull();
    expect(buildCentroid([existing(a), existing(b), existing(a)], store)).toBeNull();
  });
});

describe('buildIntersectionLines', () => {
  it('tạo point3d intersectionLines{a1,b1,a2,b2} từ 4 điểm (theo thứ tự chọn)', () => {
    const store = createStore(createEmptyState('3d'));
    const a1 = addPoint(store, { kind: 'free', x: 0, y: 0, z: 0 });
    const b1 = addPoint(store, { kind: 'free', x: 2, y: 0, z: 0 });
    const a2 = addPoint(store, { kind: 'free', x: 1, y: -1, z: 0 });
    const b2 = addPoint(store, { kind: 'free', x: 1, y: 1, z: 0 });
    const id = buildIntersectionLines([existing(a1), existing(b1), existing(a2), existing(b2)], store);
    expect(id).toBeTruthy();
    expect((store.getState().objects[id!].attrs as Point3DAttrs).constraint)
      .toEqual({ kind: 'intersectionLines', a1, b1, a2, b2 });
  });

  it('trả null nếu thiếu điểm (< 4)', () => {
    const store = createStore(createEmptyState('3d'));
    const a1 = addPoint(store, { kind: 'free', x: 0, y: 0, z: 0 });
    const b1 = addPoint(store, { kind: 'free', x: 2, y: 0, z: 0 });
    const a2 = addPoint(store, { kind: 'free', x: 1, y: -1, z: 0 });
    expect(buildIntersectionLines([existing(a1), existing(b1), existing(a2)], store)).toBeNull();
  });

  it('trả null nếu một đường suy biến (2 đầu mút trùng)', () => {
    const store = createStore(createEmptyState('3d'));
    const a1 = addPoint(store, { kind: 'free', x: 0, y: 0, z: 0 });
    const a2 = addPoint(store, { kind: 'free', x: 1, y: -1, z: 0 });
    const b2 = addPoint(store, { kind: 'free', x: 1, y: 1, z: 0 });
    // đường 1 = (a1,a1) suy biến
    expect(buildIntersectionLines([existing(a1), existing(a1), existing(a2), existing(b2)], store)).toBeNull();
  });
});

describe('buildPerpFootLine', () => {
  it('tạo point3d perpFootLine{from,a,b} từ điểm + 2 điểm xác định đường', () => {
    const store = createStore(createEmptyState('3d'));
    const p = addPoint(store, { kind: 'free', x: 0, y: 2, z: 0 });
    const a = addPoint(store, { kind: 'free', x: 0, y: 0, z: 0 });
    const b = addPoint(store, { kind: 'free', x: 1, y: 0, z: 0 });
    const id = buildPerpFootLine([existing(p), existing(a), existing(b)], store);
    expect(id).toBeTruthy();
    expect((store.getState().objects[id!].attrs as Point3DAttrs).constraint)
      .toEqual({ kind: 'perpFootLine', from: p, a, b });
  });

  it('trả null nếu thiếu điểm (< 3)', () => {
    const store = createStore(createEmptyState('3d'));
    const p = addPoint(store, { kind: 'free', x: 0, y: 2, z: 0 });
    const a = addPoint(store, { kind: 'free', x: 0, y: 0, z: 0 });
    expect(buildPerpFootLine([existing(p), existing(a)], store)).toBeNull();
  });

  it('trả null nếu đường suy biến (a ≡ b)', () => {
    const store = createStore(createEmptyState('3d'));
    const p = addPoint(store, { kind: 'free', x: 0, y: 2, z: 0 });
    const a = addPoint(store, { kind: 'free', x: 0, y: 0, z: 0 });
    expect(buildPerpFootLine([existing(p), existing(a), existing(a)], store)).toBeNull();
  });
});
