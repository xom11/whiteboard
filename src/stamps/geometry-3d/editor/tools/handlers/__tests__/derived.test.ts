// src/stamps/geometry-3d/editor/tools/handlers/__tests__/derived.test.ts
// Handler build-test cho điểm phái sinh 3D (tool editor → scene object).
import { createStore, createEmptyState } from '../../../../../../core/scene';
import { addPoint } from '../_ensurePoint';
import {
  buildMidpoint,
  buildCentroid,
  buildIntersectionLines,
  buildPerpFootLine,
  buildIntersectionLinePlane,
  buildPerpFootPlane,
} from '../derived';
import type { CollectedArg } from '../../spec';
import type { Point3DAttrs } from '../../../../../../core/scene/kinds/point3d';

const pointStep = { type: 'point', allowExisting: true, allowNewOn: [], hint: '' } as const;
const existing = (pointId: string): CollectedArg =>
  ({ step: pointStep as never, hit: { kind: 'existingPoint', pointId } });
const objectStep = { type: 'object', kinds: ['plane'], hint: '' } as const;
const planeHit = (planeId: string): CollectedArg =>
  ({ step: objectStep as never, hit: { kind: 'onPlane', planeId, u: 0, v: 0, world: [0, 0, 0] } });
const groundStep = { type: 'point', allowExisting: true, allowNewOn: ['ground'], hint: '' } as const;
// Hit đặt điểm MỚI trên mặt Oxy → ensurePoint sẽ TẠO điểm (side-effect).
const ground = (x: number, y: number): CollectedArg =>
  ({ step: groundStep as never, hit: { kind: 'onGround', world: [x, y, 0] } });

const objectCount = (store: ReturnType<typeof createStore>): number =>
  Object.keys(store.getState().objects).length;

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

describe('buildIntersectionLinePlane', () => {
  it('tạo point3d intersectionLinePlane{a,b,plane} từ 2 điểm + mặt phẳng', () => {
    const store = createStore(createEmptyState('3d'));
    const a = addPoint(store, { kind: 'free', x: 0, y: 0, z: -1 });
    const b = addPoint(store, { kind: 'free', x: 0, y: 0, z: 1 });
    const id = buildIntersectionLinePlane([existing(a), existing(b), planeHit('pl')], store);
    expect(id).toBeTruthy();
    expect((store.getState().objects[id!].attrs as Point3DAttrs).constraint)
      .toEqual({ kind: 'intersectionLinePlane', a, b, plane: 'pl' });
  });

  it('trả null nếu thiếu mặt phẳng', () => {
    const store = createStore(createEmptyState('3d'));
    const a = addPoint(store, { kind: 'free', x: 0, y: 0, z: -1 });
    const b = addPoint(store, { kind: 'free', x: 0, y: 0, z: 1 });
    expect(buildIntersectionLinePlane([existing(a), existing(b)], store)).toBeNull();
  });

  it('trả null nếu đường suy biến (a ≡ b)', () => {
    const store = createStore(createEmptyState('3d'));
    const a = addPoint(store, { kind: 'free', x: 0, y: 0, z: -1 });
    expect(buildIntersectionLinePlane([existing(a), existing(a), planeHit('pl')], store)).toBeNull();
  });
});

describe('buildPerpFootPlane', () => {
  it('tạo point3d perpFootPlane{from,plane} từ điểm + mặt phẳng', () => {
    const store = createStore(createEmptyState('3d'));
    const p = addPoint(store, { kind: 'free', x: 1, y: 2, z: 3 });
    const id = buildPerpFootPlane([existing(p), planeHit('pl')], store);
    expect(id).toBeTruthy();
    expect((store.getState().objects[id!].attrs as Point3DAttrs).constraint)
      .toEqual({ kind: 'perpFootPlane', from: p, plane: 'pl' });
  });

  it('trả null nếu thiếu mặt phẳng', () => {
    const store = createStore(createEmptyState('3d'));
    const p = addPoint(store, { kind: 'free', x: 1, y: 2, z: 3 });
    expect(buildPerpFootPlane([existing(p)], store)).toBeNull();
  });
});

// Build bị từ chối (suy biến / thiếu input) KHÔNG được để lại điểm mới mồ côi
// trong scene — guard suy biến phải chạy TRƯỚC ensurePoint (review 2026-06-21).
describe('không tạo điểm mồ côi khi build bị từ chối', () => {
  it('intersectionLines: đường 1 suy biến (điểm có sẵn click 2 lần) + điểm mới', () => {
    const store = createStore(createEmptyState('3d'));
    const a1 = addPoint(store, { kind: 'free', x: 0, y: 0, z: 0 });
    const before = objectCount(store);
    const r = buildIntersectionLines([existing(a1), existing(a1), ground(1, 1), ground(2, 2)], store);
    expect(r).toBeNull();
    expect(objectCount(store)).toBe(before); // không leak 2 điểm mặt đất
  });

  it('perpFootLine: đường suy biến (a≡b) + điểm from mới', () => {
    const store = createStore(createEmptyState('3d'));
    const a = addPoint(store, { kind: 'free', x: 0, y: 0, z: 0 });
    const before = objectCount(store);
    const r = buildPerpFootLine([ground(5, 5), existing(a), existing(a)], store);
    expect(r).toBeNull();
    expect(objectCount(store)).toBe(before); // không leak điểm from
  });

  it('centroid: < 3 đỉnh phân biệt + điểm mới', () => {
    const store = createStore(createEmptyState('3d'));
    const a = addPoint(store, { kind: 'free', x: 0, y: 0, z: 0 });
    const before = objectCount(store);
    const r = buildCentroid([existing(a), existing(a), ground(9, 9)], store);
    expect(r).toBeNull();
    expect(objectCount(store)).toBe(before); // không leak điểm mặt đất
  });

  it('intersectionLinePlane: thiếu mặt phẳng + điểm đường mới', () => {
    const store = createStore(createEmptyState('3d'));
    const before = objectCount(store);
    const r = buildIntersectionLinePlane([ground(1, 1), ground(2, 2)], store); // không có planeHit
    expect(r).toBeNull();
    expect(objectCount(store)).toBe(before); // không leak (kiểm plane TRƯỚC)
  });
});
