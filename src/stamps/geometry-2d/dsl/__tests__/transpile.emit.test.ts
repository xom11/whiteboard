// src/stamps/geometry-2d/dsl/__tests__/transpile.emit.test.ts
import { emitPoint } from '../transpile/emitPoint';
import type { DslPointT } from '../schema';

const ids = new Map<string, string>([
  ['A', 'p1'], ['B', 'p2'], ['C', 'p3'],
  ['M', 'p4'], ['H', 'p5'], ['P', 'i1'], ['G', 'g1'],
  ['AB', 's1'], ['BC', 's2'], ['L', 'l1'], ['CR', 'c1'],
  ['T', 'poly1'],
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

import { emitShape } from '../transpile/emitShape';
import type { DslShapeT } from '../schema';

function emitS(s: DslShapeT) {
  return emitShape(s, ids);
}

describe('emitShape', () => {
  it('segment', () => {
    const obj = emitS({ name: 'AB', kind: 'segment', p1: 'A', p2: 'B' });
    expect(obj).toMatchObject({ id: 's1', kind: 'segment', label: 'AB' });
    expect(obj.attrs).toEqual({ p1: 'p1', p2: 'p2' });
  });

  it('line (no construction)', () => {
    const obj = emitS({ name: 'L', kind: 'line', p1: 'A', p2: 'B' });
    expect(obj.kind).toBe('line');
    expect(obj.attrs).toEqual({ p1: 'p1', p2: 'p2' });
  });

  it('ray', () => {
    const obj = emitS({ name: 'L', kind: 'ray', origin: 'A', through: 'B' });
    expect(obj.kind).toBe('ray');
    expect(obj.attrs).toEqual({ origin: 'p1', through: 'p2' });
  });

  it('polygon', () => {
    const obj = emitS({ name: 'T', kind: 'polygon', vertices: ['A','B','C'] });
    expect(obj.kind).toBe('polygon');
    expect(obj.attrs).toEqual({ vertices: ['p1','p2','p3'] });
  });

  it('perpendicular → line.construction', () => {
    const obj = emitS({ name: 'L', kind: 'perpendicular', throughPoint: 'A', toLine: 'BC' });
    expect(obj.kind).toBe('line');
    expect(obj.attrs).toEqual({
      construction: { kind: 'perpendicular', throughPoint: 'p1', toLine: 's2' },
    });
  });

  it('parallel → line.construction', () => {
    const obj = emitS({ name: 'L', kind: 'parallel', throughPoint: 'A', toLine: 'BC' });
    expect((obj.attrs as { construction: { kind: string } }).construction.kind).toBe('parallel');
  });

  it('perpBisector → line.construction', () => {
    const obj = emitS({ name: 'L', kind: 'perpBisector', p1: 'A', p2: 'B' });
    expect(obj.attrs).toEqual({
      construction: { kind: 'perpBisector', p1: 'p1', p2: 'p2' },
    });
  });

  it('angleBisector → line.construction', () => {
    const obj = emitS({ name: 'L', kind: 'angleBisector', p1: 'A', vertex: 'B', p2: 'C' });
    expect(obj.attrs).toEqual({
      construction: { kind: 'angleBisector', p1: 'p1', vertex: 'p2', p2: 'p3' },
    });
  });

  it('tangent with branch', () => {
    const obj = emitS({ name: 'L', kind: 'tangent', throughPoint: 'A', toCircle: 'CR', branch: 1 });
    expect(obj.attrs).toEqual({
      construction: { kind: 'tangent', throughPoint: 'p1', toCircle: 'c1', branch: 1 },
    });
  });

  it('tangent without branch — branch field absent', () => {
    const obj = emitS({ name: 'L', kind: 'tangent', throughPoint: 'A', toCircle: 'CR' });
    const c = (obj.attrs as { construction: Record<string, unknown> }).construction;
    expect('branch' in c).toBe(false);
  });

  it('circleCP → center + surfacePoint', () => {
    const obj = emitS({ name: 'CR', kind: 'circleCP', center: 'A', surfacePoint: 'B' });
    expect(obj.kind).toBe('circle');
    expect(obj.attrs).toEqual({ center: 'p1', surfacePoint: 'p2' });
  });

  it('circle3 → construction circumscribed', () => {
    const obj = emitS({ name: 'CR', kind: 'circle3', p1: 'A', p2: 'B', p3: 'C' });
    expect(obj.kind).toBe('circle');
    expect(obj.attrs).toEqual({
      construction: { kind: 'circumscribed', p1: 'p1', p2: 'p2', p3: 'p3' },
    });
  });

  it('SceneObject base fields set', () => {
    const obj = emitS({ name: 'AB', kind: 'segment', p1: 'A', p2: 'B' });
    expect(obj.visible).toBe(true);
    expect(obj.locked).toBe(false);
    expect(obj.layer).toBe('default');
    expect(obj.schemaVersion).toBe(1);
  });
});
