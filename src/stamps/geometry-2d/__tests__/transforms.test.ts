// src/stamps/geometry-2d/__tests__/transforms.test.ts
import { getDefiningPoints, buildTransformSpec } from '../editor/transforms';
import { createEmptyState } from '../../../core/scene';
import type { SceneObject } from '../../../core/scene';

const state = createEmptyState('2d');

function mk(kind: string, id: string, attrs: Record<string, unknown>): SceneObject {
  return {
    id,
    kind,
    label: id,
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
    attrs,
  };
}

describe('getDefiningPoints', () => {
  it('point trả về chính nó', () => {
    expect(
      getDefiningPoints(mk('point', 'A', { constraint: { kind: 'free', x: 0, y: 0 } }), state),
    ).toEqual(['A']);
  });

  it('intersection trả về chính nó', () => {
    expect(
      getDefiningPoints(
        mk('intersection', 'X', { kind: 'lineLine', ref1: 'l1', ref2: 'l2' }),
        state,
      ),
    ).toEqual(['X']);
  });

  it('segment trả về [p1, p2]', () => {
    expect(getDefiningPoints(mk('segment', 's1', { p1: 'A', p2: 'B' }), state)).toEqual([
      'A',
      'B',
    ]);
  });

  it('line, ray, vector', () => {
    expect(getDefiningPoints(mk('line', 'l1', { p1: 'A', p2: 'B' }), state)).toEqual(['A', 'B']);
    expect(
      getDefiningPoints(mk('ray', 'r1', { origin: 'A', through: 'B' }), state),
    ).toEqual(['A', 'B']);
    expect(getDefiningPoints(mk('vector', 'v1', { from: 'A', to: 'B' }), state)).toEqual([
      'A',
      'B',
    ]);
  });

  it('circle trả về [center, surfacePoint]', () => {
    expect(
      getDefiningPoints(mk('circle', 'c1', { center: 'O', surfacePoint: 'A' }), state),
    ).toEqual(['O', 'A']);
  });

  it('polygon trả về vertices', () => {
    expect(
      getDefiningPoints(mk('polygon', 'p1', { vertices: ['A', 'B', 'C', 'D'] }), state),
    ).toEqual(['A', 'B', 'C', 'D']);
  });

  it('unknown kind trả về []', () => {
    expect(getDefiningPoints(mk('unknownKind', 'u1', {}), state)).toEqual([]);
  });
});

describe('buildTransformSpec', () => {
  it('translate: dx/dy literal từ 2 điểm (serialize-friendly)', () => {
    const a = { X: () => 0, Y: () => 0 };
    const b = { X: () => 3, Y: () => 4 };
    const spec = buildTransformSpec({ kind: 'translate', vectorPoints: [a, b] });
    expect(spec.attrs).toEqual({ type: 'translate' });
    expect(spec.params).toEqual([3, 4]);
  });

  it('rotate: chuyển độ → rad, attach center', () => {
    const c = { X: () => 0 };
    const spec = buildTransformSpec({ kind: 'rotate', center: c, angleDeg: 90 });
    expect(spec.attrs).toEqual({ type: 'rotate' });
    expect(spec.params[0]).toBeCloseTo(Math.PI / 2, 6);
    expect(spec.params[1]).toBe(c);
  });

  it('reflectLine: 1 param là line', () => {
    const l = { elType: 'line' };
    expect(buildTransformSpec({ kind: 'reflectLine', line: l })).toEqual({
      params: [l],
      attrs: { type: 'reflect' },
    });
  });

  it('reflectPoint: rotate(π) quanh center (JSXGraph scale không nhận center → dùng rotate 180°)', () => {
    const c = { X: () => 0 };
    const spec = buildTransformSpec({ kind: 'reflectPoint', center: c });
    expect(spec.attrs).toEqual({ type: 'rotate' });
    expect(spec.params[0]).toBeCloseTo(Math.PI, 6);
    expect(spec.params[1]).toBe(c);
  });

  it('dilate: trả về chain 3 transforms (T(-c) → S(k,k) → T(+c)) vì JSXGraph scale không nhận center', () => {
    const c = { X: () => 3, Y: () => 4 };
    const spec = buildTransformSpec({ kind: 'dilate', center: c, k: 2 });
    expect(spec.attrs).toEqual({ type: 'scale' });
    expect(spec.params).toEqual([]);
    expect(spec.chain).toBeDefined();
    expect(spec.chain).toHaveLength(3);
    expect(spec.chain![0]).toEqual({ params: [-3, -4], attrs: { type: 'translate' } });
    expect(spec.chain![1]).toEqual({ params: [2, 2], attrs: { type: 'scale' } });
    expect(spec.chain![2]).toEqual({ params: [3, 4], attrs: { type: 'translate' } });
  });
});
