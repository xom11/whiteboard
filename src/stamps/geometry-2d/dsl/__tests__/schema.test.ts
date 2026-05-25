// src/stamps/geometry-2d/dsl/__tests__/schema.test.ts
import { NameZ, DslInput, DslPoint, DslShape } from '../schema';

describe('NameZ regex', () => {
  it.each([
    'A', 'B', 'AB', 'M_1', "A'", 'O₁', 'O₂', 'P12',
  ])('accepts %s', (s) => {
    expect(NameZ.safeParse(s).success).toBe(true);
  });

  it.each([
    '', '1A', 'a b', 'A.B', 'ThisLabelIsTooLong13',
  ])('rejects %s', (s) => {
    expect(NameZ.safeParse(s).success).toBe(false);
  });
});

describe('DslInput root', () => {
  it('parses empty version-1 input', () => {
    const r = DslInput.safeParse({ version: 1, points: [], shapes: [] });
    expect(r.success).toBe(true);
  });

  it('shapes defaults to []', () => {
    const r = DslInput.safeParse({ version: 1, points: [] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.shapes).toEqual([]);
  });

  it('rejects version other than 1', () => {
    const r = DslInput.safeParse({ version: 2, points: [], shapes: [] });
    expect(r.success).toBe(false);
  });
});

describe('DslPoint kinds', () => {
  const valid: Array<[string, unknown]> = [
    ['free',         { name: 'A', kind: 'free', x: 0, y: 0 }],
    ['midpoint',     { name: 'M', kind: 'midpoint', p1: 'A', p2: 'B' }],
    ['onSegment',    { name: 'P', kind: 'onSegment', segmentId: 'AB', t: 0.5 }],
    ['onLine',       { name: 'P', kind: 'onLine', lineId: 'L', t: 0.5 }],
    ['onCircle',     { name: 'P', kind: 'onCircle', circleId: 'C', theta: 1.2 }],
    ['perpFoot',     { name: 'H', kind: 'perpFoot', from: 'A', onLine: 'BC' }],
    ['circumcenter', { name: 'O', kind: 'circumcenter', vertices: ['A', 'B', 'C'] }],
    ['incenter',     { name: 'I', kind: 'incenter', vertices: ['A', 'B', 'C'] }],
    ['centroid',     { name: 'G', kind: 'centroid', vertices: ['A', 'B', 'C'] }],
    ['orthocenter',  { name: 'H', kind: 'orthocenter', vertices: ['A', 'B', 'C'] }],
    ['intersection', { name: 'P', kind: 'intersection', ref1: 'L1', ref2: 'L2' }],
    ['intersection branch 0', { name: 'P', kind: 'intersection', ref1: 'C1', ref2: 'C2', branch: 0 }],
    ['intersection branch 1', { name: 'P', kind: 'intersection', ref1: 'C1', ref2: 'C2', branch: 1 }],
  ];

  it.each(valid)('accepts %s', (_, obj) => {
    expect(DslPoint.safeParse(obj).success).toBe(true);
  });

  const invalid: Array<[string, unknown]> = [
    ['unknown kind',       { name: 'A', kind: 'wat', x: 0, y: 0 }],
    ['free missing y',     { name: 'A', kind: 'free', x: 0 }],
    ['free non-finite',    { name: 'A', kind: 'free', x: 0, y: NaN }],
    ['midpoint missing p2',{ name: 'M', kind: 'midpoint', p1: 'A' }],
    ['onSegment t<0',      { name: 'P', kind: 'onSegment', segmentId: 'AB', t: -0.1 }],
    ['onSegment t>1',      { name: 'P', kind: 'onSegment', segmentId: 'AB', t: 1.5 }],
    ['centroid 2 vertices',{ name: 'G', kind: 'centroid', vertices: ['A', 'B'] }],
    ['centroid 4 vertices',{ name: 'G', kind: 'centroid', vertices: ['A', 'B', 'C', 'D'] }],
    ['intersection branch 2', { name: 'P', kind: 'intersection', ref1: 'C1', ref2: 'C2', branch: 2 }],
    ['intersection missing ref2', { name: 'P', kind: 'intersection', ref1: 'L1' }],
    ['bad name regex',     { name: '1A', kind: 'free', x: 0, y: 0 }],
  ];

  it.each(invalid)('rejects %s', (_, obj) => {
    expect(DslPoint.safeParse(obj).success).toBe(false);
  });
});

describe('DslShape kinds', () => {
  const valid: Array<[string, unknown]> = [
    ['segment',        { name: 'AB', kind: 'segment', p1: 'A', p2: 'B' }],
    ['line',           { name: 'L',  kind: 'line', p1: 'A', p2: 'B' }],
    ['ray',            { name: 'r',  kind: 'ray', origin: 'A', through: 'B' }],
    ['polygon 3',      { name: 'T',  kind: 'polygon', vertices: ['A','B','C'] }],
    ['polygon 4',      { name: 'Q',  kind: 'polygon', vertices: ['A','B','C','D'] }],
    ['perpendicular',  { name: 'L',  kind: 'perpendicular', throughPoint: 'A', toLine: 'BC' }],
    ['parallel',       { name: 'L',  kind: 'parallel', throughPoint: 'A', toLine: 'BC' }],
    ['perpBisector',   { name: 'd',  kind: 'perpBisector', p1: 'A', p2: 'B' }],
    ['angleBisector',  { name: 'b',  kind: 'angleBisector', p1: 'A', vertex: 'B', p2: 'C' }],
    ['tangent',        { name: 't',  kind: 'tangent', throughPoint: 'P', toCircle: 'C' }],
    ['tangent branch', { name: 't',  kind: 'tangent', throughPoint: 'P', toCircle: 'C', branch: 1 }],
    ['tangent on',     { name: 't',  kind: 'tangent', throughPoint: 'P', toCircle: 'C', branch: 'on' }],
    ['circleCP',       { name: 'c',  kind: 'circleCP', center: 'O', surfacePoint: 'A' }],
    ['circle3',        { name: 'c',  kind: 'circle3', p1: 'A', p2: 'B', p3: 'C' }],
  ];

  it.each(valid)('accepts %s', (_, obj) => {
    expect(DslShape.safeParse(obj).success).toBe(true);
  });

  const invalid: Array<[string, unknown]> = [
    ['unknown kind',    { name: 'X', kind: 'foo', p1: 'A', p2: 'B' }],
    ['polygon 2 verts', { name: 'P', kind: 'polygon', vertices: ['A','B'] }],
    ['segment missing p2', { name: 'AB', kind: 'segment', p1: 'A' }],
    ['tangent branch 2', { name: 't', kind: 'tangent', throughPoint: 'P', toCircle: 'C', branch: 2 }],
    ['circle3 missing p3', { name: 'c', kind: 'circle3', p1: 'A', p2: 'B' }],
  ];

  it.each(invalid)('rejects %s', (_, obj) => {
    expect(DslShape.safeParse(obj).success).toBe(false);
  });
});
