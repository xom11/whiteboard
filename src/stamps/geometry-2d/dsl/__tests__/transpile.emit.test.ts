// src/stamps/geometry-2d/dsl/__tests__/transpile.emit.test.ts
import { emitPoint } from '../transpile/emitPoint';
import type { DslPointT } from '../schema';

const ids = new Map<string, string>([
  ['A', 'p1'], ['B', 'p2'], ['C', 'p3'],
  ['M', 'p4'], ['H', 'p5'], ['P', 'i1'], ['G', 'g1'],
  ['AB', 's1'], ['BC', 's2'], ['L', 'l1'], ['CR', 'c1'],
]);

function emit(p: DslPointT) {
  return emitPoint(p, ids, new Map());
}

describe('emitPoint', () => {
  it('free → SceneObject kind=point', () => {
    const obj = emit({ name: 'A', kind: 'free', x: 0, y: 0 });
    expect(obj.id).toBe('p1');
    expect(obj.kind).toBe('point');
    expect(obj.label).toBe('A');
    expect(obj.visible).toBe(true);
    expect(obj.locked).toBe(false);
    expect(obj.schemaVersion).toBe(1);
    expect((obj.attrs as { constraint: { kind: string; x: number; y: number } }).constraint)
      .toEqual({ kind: 'free', x: 0, y: 0 });
  });

  it('midpoint resolves p1/p2 → ids', () => {
    const obj = emit({ name: 'M', kind: 'midpoint', p1: 'A', p2: 'B' });
    expect((obj.attrs as { constraint: { kind: string; p1: string; p2: string } }).constraint)
      .toEqual({ kind: 'midpoint', p1: 'p1', p2: 'p2' });
  });

  it('onSegment maps segmentId', () => {
    const obj = emit({ name: 'P', kind: 'onSegment', segmentId: 'AB', t: 0.5 });
    expect((obj.attrs as { constraint: { kind: string; segmentId: string; t: number } }).constraint)
      .toEqual({ kind: 'onSegment', segmentId: 's1', t: 0.5 });
  });

  it('perpFoot maps from/onLine', () => {
    const obj = emit({ name: 'H', kind: 'perpFoot', from: 'A', onLine: 'BC' });
    expect((obj.attrs as { constraint: { kind: string; from: string; onLine: string } }).constraint)
      .toEqual({ kind: 'perpFoot', from: 'p1', onLine: 's2' });
  });

  it('triangle centers preserve vertices tuple', () => {
    const obj = emit({ name: 'G', kind: 'centroid', vertices: ['A', 'B', 'C'] });
    expect((obj.attrs as { constraint: { kind: string; vertices: string[] } }).constraint)
      .toEqual({ kind: 'centroid', vertices: ['p1', 'p2', 'p3'] });
  });

  it('intersection lineLine inference (2 line-like refs)', () => {
    const kindMap = new Map<string, 'line' | 'segment' | 'ray' | 'lineConstruction' | 'circle'>([
      ['AB', 'segment'], ['BC', 'segment'],
    ]);
    const obj = emitPoint(
      { name: 'P', kind: 'intersection', ref1: 'AB', ref2: 'BC' },
      ids, kindMap,
    );
    expect(obj.kind).toBe('intersection');
    expect(obj.id).toBe('i1');
    expect(obj.attrs).toMatchObject({ kind: 'lineLine', ref1: 's1', ref2: 's2' });
  });

  it('intersection circleCircle inference', () => {
    const kindMap = new Map<string, 'line' | 'segment' | 'ray' | 'lineConstruction' | 'circle'>([
      ['CR', 'circle'], ['L', 'circle'],
    ]);
    const obj = emitPoint(
      { name: 'P', kind: 'intersection', ref1: 'CR', ref2: 'L', branch: 1 },
      ids, kindMap,
    );
    expect(obj.attrs).toMatchObject({ kind: 'circleCircle', ref1: 'c1', ref2: 'l1', branch: 1 });
  });

  it('intersection lineCircle inference + default branch 0', () => {
    const kindMap = new Map<string, 'line' | 'segment' | 'ray' | 'lineConstruction' | 'circle'>([
      ['L', 'line'], ['CR', 'circle'],
    ]);
    const obj = emitPoint(
      { name: 'P', kind: 'intersection', ref1: 'L', ref2: 'CR' },
      ids, kindMap,
    );
    expect(obj.attrs).toMatchObject({ kind: 'lineCircle', branch: 0 });
  });
});
