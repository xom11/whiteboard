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
