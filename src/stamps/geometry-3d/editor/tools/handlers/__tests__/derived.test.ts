// src/stamps/geometry-3d/editor/tools/handlers/__tests__/derived.test.ts
// Handler build-test cho điểm phái sinh 3D (tool editor → scene object).
import { createStore, createEmptyState } from '../../../../../../core/scene';
import { addPoint } from '../_ensurePoint';
import { buildMidpoint } from '../derived';
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
