import '../point';
import '../segment';
import '../circle';
import { getKind } from '../../registry';
import type { SceneObject, State } from '../../types';

const emptyState: State = {
  objects: {},
  order: [],
  counter: 0,
  meta: { domain: '2d', version: 1 },
};

function makePoint(label: string, x: number, y: number): SceneObject {
  return {
    id: label,
    label,
    kind: 'point',
    visible: true,
    locked: false,
    attrs: { constraint: { kind: 'free', x, y } },
  };
}

describe('point.measure', () => {
  it('returns x, y for free point', () => {
    const obj = makePoint('A', 1.234, -2.567);
    const result = getKind('point').measure!(obj, emptyState);
    expect(result).toEqual([
      { label: 'x', value: 1.234 },
      { label: 'y', value: -2.567 },
    ]);
  });

  it('returns null for non-free point (midpoint)', () => {
    const obj: SceneObject = {
      id: 'M',
      label: 'M',
      kind: 'point',
      visible: true,
      locked: false,
      attrs: { constraint: { kind: 'midpoint', p1: 'A', p2: 'B' } },
    };
    const result = getKind('point').measure!(obj, emptyState);
    expect(result).toBeNull();
  });
});

describe('segment.measure', () => {
  it('returns length for two free points', () => {
    const A = makePoint('A', 0, 0);
    const B = makePoint('B', 3, 4);
    const state: State = { ...emptyState, objects: { A, B }, order: ['A', 'B'] };
    const seg: SceneObject = {
      id: 'f',
      label: 'f',
      kind: 'segment',
      visible: true,
      locked: false,
      attrs: { p1: 'A', p2: 'B' },
    };
    const result = getKind('segment').measure!(seg, state);
    expect(result).toEqual([{ label: 'length', value: 5 }]);
  });

  it('returns null if endpoint missing', () => {
    const seg: SceneObject = {
      id: 'f',
      label: 'f',
      kind: 'segment',
      visible: true,
      locked: false,
      attrs: { p1: 'A', p2: 'B' },
    };
    const result = getKind('segment').measure!(seg, emptyState);
    expect(result).toBeNull();
  });
});

describe('circle.measure', () => {
  it('returns radius from center + surfacePoint', () => {
    const A = makePoint('A', 0, 0);
    const B = makePoint('B', 0, 5);
    const state: State = { ...emptyState, objects: { A, B }, order: ['A', 'B'] };
    const c: SceneObject = {
      id: 'c',
      label: 'c',
      kind: 'circle',
      visible: true,
      locked: false,
      attrs: { center: 'A', surfacePoint: 'B' },
    };
    const result = getKind('circle').measure!(c, state);
    expect(result).toEqual([{ label: 'r', value: 5 }]);
  });

  it('returns null if surfacePoint missing', () => {
    const A = makePoint('A', 0, 0);
    const state: State = { ...emptyState, objects: { A }, order: ['A'] };
    const c: SceneObject = {
      id: 'c',
      label: 'c',
      kind: 'circle',
      visible: true,
      locked: false,
      attrs: { center: 'A', surfacePoint: 'B' },
    };
    const result = getKind('circle').measure!(c, state);
    expect(result).toBeNull();
  });

  it('returns null for circumscribed construction', () => {
    const c: SceneObject = {
      id: 'c',
      label: 'c',
      kind: 'circle',
      visible: true,
      locked: false,
      attrs: { construction: { kind: 'circumscribed', p1: 'A', p2: 'B', p3: 'C' } },
    };
    const result = getKind('circle').measure!(c, emptyState);
    expect(result).toBeNull();
  });
});

// ---------- 3D ----------

import '../point3d';
import '../segment3d';

const empty3DState: State = {
  objects: {},
  order: [],
  counter: 0,
  meta: { domain: '3d', version: 1 },
};

function makePoint3D(label: string, x: number, y: number, z: number): SceneObject {
  return {
    id: label,
    label,
    kind: 'point3d',
    visible: true,
    locked: false,
    attrs: { constraint: { kind: 'free', x, y, z } },
  };
}

describe('point3d.measure', () => {
  it('returns x, y, z for free 3D point', () => {
    const obj = makePoint3D('P', 1.1, 2.2, 3.3);
    const result = getKind('point3d').measure!(obj, empty3DState);
    expect(result).toEqual([
      { label: 'x', value: 1.1 },
      { label: 'y', value: 2.2 },
      { label: 'z', value: 3.3 },
    ]);
  });

  it('returns null for non-free 3D point', () => {
    const obj: SceneObject = {
      id: 'P',
      label: 'P',
      kind: 'point3d',
      visible: true,
      locked: false,
      attrs: { constraint: { kind: 'onAxis', axis: 'x', t: 1 } },
    };
    const result = getKind('point3d').measure!(obj, empty3DState);
    expect(result).toBeNull();
  });
});

describe('segment3d.measure', () => {
  it('returns 3D length', () => {
    const P = makePoint3D('P', 0, 0, 0);
    const Q = makePoint3D('Q', 1, 2, 2);
    const state: State = { ...empty3DState, objects: { P, Q }, order: ['P', 'Q'] };
    const seg: SceneObject = {
      id: 'f',
      label: 'f',
      kind: 'segment3d',
      visible: true,
      locked: false,
      attrs: { p1: 'P', p2: 'Q' },
    };
    const result = getKind('segment3d').measure!(seg, state);
    expect(result).toEqual([{ label: 'length', value: 3 }]);
  });

  it('returns null if endpoint missing', () => {
    const seg: SceneObject = {
      id: 'f',
      label: 'f',
      kind: 'segment3d',
      visible: true,
      locked: false,
      attrs: { p1: 'P', p2: 'Q' },
    };
    const result = getKind('segment3d').measure!(seg, empty3DState);
    expect(result).toBeNull();
  });
});
