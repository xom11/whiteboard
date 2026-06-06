import { intentsToDsl, IntentBuilderError } from '../intentToDsl';
import type { IntentT } from '../intent';
import { transpile } from '../../dsl';

describe('intentsToDsl — draw-shape', () => {
  it('triangle any → 3 free points + 1 polygon', () => {
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
    ];
    const dsl = intentsToDsl(intents);
    expect(dsl.points).toHaveLength(3);
    expect(dsl.points.every((p) => p.kind === 'free')).toBe(true);
    expect(dsl.shapes).toHaveLength(1);
    expect(dsl.shapes[0].kind).toBe('polygon');
  });

  it('triangle equilateral has canonical coord (~3.464 for height)', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'equilateral' },
    ]);
    const C = dsl.points.find((p) => p.name === 'C')!;
    expect(C.kind).toBe('free');
    if (C.kind === 'free') {
      expect(C.y).toBeCloseTo(2 * Math.sqrt(3), 3);
    }
  });

  it('triangle right-at-A has actual 90° at A', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'right-at-A' },
    ]);
    const get = (n: string) => {
      const p = dsl.points.find((x) => x.name === n)!;
      if (p.kind !== 'free') throw new Error('expected free');
      return [p.x, p.y] as [number, number];
    };
    const [A, B, C] = [get('A'), get('B'), get('C')];
    const v1 = [B[0] - A[0], B[1] - A[1]];
    const v2 = [C[0] - A[0], C[1] - A[1]];
    expect(v1[0] * v2[0] + v1[1] * v2[1]).toBeCloseTo(0, 6);
  });

  it('square → 4 points, axis-aligned', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'square', labels: ['M', 'N', 'P', 'Q'], variant: 'standard' },
    ]);
    expect(dsl.points).toHaveLength(4);
    const names = dsl.points.map((p) => p.name).sort();
    expect(names).toEqual(['M', 'N', 'P', 'Q']);
  });

  it('explicitCoords override canonical', () => {
    const dsl = intentsToDsl([
      {
        op: 'draw-shape',
        shape: 'triangle',
        labels: ['A', 'B', 'C'],
        variant: 'any',
        explicitCoords: { A: [10, 20], B: [30, 40], C: [50, 60] },
      },
    ]);
    const A = dsl.points.find((p) => p.name === 'A')!;
    if (A.kind === 'free') {
      expect(A.x).toBe(10);
      expect(A.y).toBe(20);
    }
  });

  it('rectangle wide vs tall differ', () => {
    const wide = intentsToDsl([
      { op: 'draw-shape', shape: 'rectangle', labels: ['A', 'B', 'C', 'D'], variant: 'wide' },
    ]);
    const tall = intentsToDsl([
      { op: 'draw-shape', shape: 'rectangle', labels: ['A', 'B', 'C', 'D'], variant: 'tall' },
    ]);
    const wB = wide.points.find((p) => p.name === 'B')!;
    const tB = tall.points.find((p) => p.name === 'B')!;
    if (wB.kind === 'free' && tB.kind === 'free') {
      expect(wB.x).toBeGreaterThan(tB.x);
    }
  });
});

describe('intentsToDsl — add-point', () => {
  it('midpoint of BC → midpoint kind', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'BC' } },
    ]);
    const M = dsl.points.find((p) => p.name === 'M')!;
    expect(M.kind).toBe('midpoint');
    if (M.kind === 'midpoint') {
      expect(M.p1).toBe('B');
      expect(M.p2).toBe('C');
    }
  });

  it('perpFoot from A onLine BC → perpFoot kind with segment ensured', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'H', constraint: { kind: 'perpFoot', from: 'A', onLine: 'BC' } },
    ]);
    const H = dsl.points.find((p) => p.name === 'H')!;
    expect(H.kind).toBe('perpFoot');
    // segment BC tự động ensure
    expect(dsl.shapes.some((s) => s.kind === 'segment' && s.name === 'BC')).toBe(true);
  });

  it('centroid of triangle → centroid kind', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'G', constraint: { kind: 'centroid', of: ['A', 'B', 'C'] } },
    ]);
    const G = dsl.points.find((p) => p.name === 'G')!;
    expect(G.kind).toBe('centroid');
  });
});

describe('intentsToDsl — connect', () => {
  it('segment AM appends segment shape', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'BC' } },
      { op: 'connect', from: 'A', to: 'M', style: 'segment' },
    ]);
    expect(dsl.shapes.some((s) => s.kind === 'segment' && s.name === 'AM')).toBe(true);
  });

  it('angleBisector style throws (cần 3 điểm)', () => {
    expect(() =>
      intentsToDsl([
        { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
        { op: 'connect', from: 'A', to: 'B', style: 'angleBisector' },
      ]),
    ).toThrow(IntentBuilderError);
  });
});

describe('intentsToDsl — draw-circle', () => {
  it('centerThrough → circleCP kind', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      {
        op: 'draw-circle',
        name: 'O',
        spec: 'centerThrough',
        center: 'A',
        through: 'B',
      },
    ]);
    expect(dsl.shapes.some((s) => s.kind === 'circleCP' && s.name === 'O')).toBe(true);
  });

  it('through3 → circle3 kind', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      {
        op: 'draw-circle',
        name: 'O',
        spec: 'through3',
        points: ['A', 'B', 'C'],
      },
    ]);
    expect(dsl.shapes.some((s) => s.kind === 'circle3' && s.name === 'O')).toBe(true);
  });
});

// === Tier 4+5 additions ===
describe('intentsToDsl — Tier 4+5', () => {
  it('handles draw-circle centerRadius (numeric R)', () => {
    const dsl = intentsToDsl([
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 3 },
    ] as never);
    expect(dsl.points.find((p) => p.name === 'O' && p.kind === 'free')).toBeDefined();
    const c = dsl.shapes.find((s) => s.kind === 'circleCR');
    expect(c).toMatchObject({ name: 'O', kind: 'circleCR', center: 'O', radius: 3 });
  });

  it('handles draw-circle inscribedIn', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'draw-circle', name: 'I', spec: 'inscribedIn', triangle: ['A','B','C'] },
    ] as never);
    const c = dsl.shapes.find((s) => s.kind === 'incircle');
    expect(c).toMatchObject({ name: 'I', kind: 'incircle', vertices: ['A','B','C'] });
  });

  it('handles add-point secondIntersection', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A','B','C'] },
      { op: 'add-point', name: 'D', constraint: { kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' } },
      { op: 'add-point', name: 'E', constraint: { kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'A' } },
    ] as never);
    expect(dsl.points.find((p) => p.kind === 'secondIntersection' && p.name === 'E'))
      .toMatchObject({ line: 'AD', circle: 'O', other: 'A' });
  });

  it('handles add-point circleIntersection', () => {
    const dsl = intentsToDsl([
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 2 },
      { op: 'draw-circle', name: 'Op', spec: 'centerRadius', center: 'Op', radius: 2 },
      { op: 'add-point', name: 'A', constraint: { kind: 'circleIntersection', c1: 'O', c2: 'Op', which: 0 } },
      { op: 'add-point', name: 'B', constraint: { kind: 'circleIntersection', c1: 'O', c2: 'Op', which: 1 } },
    ] as never);
    expect(dsl.points.filter((p) => p.kind === 'circleIntersection')).toHaveLength(2);
  });

  it('handles add-point tangencyPoint', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'draw-circle', name: 'I', spec: 'inscribedIn', triangle: ['A','B','C'] },
      { op: 'add-point', name: 'D', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'BC' } },
    ] as never);
    expect(dsl.points.find((p) => p.kind === 'tangencyPoint' && p.name === 'D'))
      .toMatchObject({ circle: 'I', onLine: 'BC' });
  });

  it('handles add-point tangentPoint (which=0 + which=1)', () => {
    const dsl = intentsToDsl([
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 2 },
      { op: 'add-point', name: 'A', constraint: { kind: 'free', at: [5, 0] } },
      { op: 'add-point', name: 'B', constraint: { kind: 'tangentPoint', from: 'A', circle: 'O', which: 0 } },
      { op: 'add-point', name: 'C', constraint: { kind: 'tangentPoint', from: 'A', circle: 'O', which: 1 } },
    ] as never);
    const tangentPts = dsl.points.filter((p) => p.kind === 'tangentPointExt');
    expect(tangentPts).toHaveLength(2);
  });

  it('handles add-point angleBisectorFoot', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'add-point', name: 'D', constraint: { kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' } },
    ] as never);
    expect(dsl.shapes.find((s) => s.kind === 'angleBisector')).toBeDefined();
    expect(dsl.points.find((p) => p.name === 'D' && p.kind === 'intersection')).toBeDefined();
  });

  it('handles draw-line perpThrough', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'BC' } },
      { op: 'draw-line', name: 'd', kind: 'perpThrough', through: 'M', to: 'BC' },
    ] as never);
    expect(dsl.shapes.find((s) => s.kind === 'perpendicular' && s.name === 'd'))
      .toBeDefined();
  });

  it('perpThrough fallback: `to` là 1-letter POINT → auto build segment qua (through, to)', () => {
    // Cau-12-style: AI nhầm "Đường vuông góc với AB tại B" → to:"A" thay vì to:"AB".
    // Builder phải auto detect 2 single-letter POINTS và ensureSegment giữa chúng.
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'draw-line', name: 'd', kind: 'perpThrough', through: 'B', to: 'A' },
    ] as never);
    // Segment AB phải tồn tại
    const segAB = dsl.shapes.find(
      (s) => s.kind === 'segment' && ((s.p1 === 'A' && s.p2 === 'B') || (s.p1 === 'B' && s.p2 === 'A')),
    );
    expect(segAB).toBeDefined();
    // perpendicular shape phải reference segment vừa tạo (không phải point 'A')
    const perp = dsl.shapes.find((s) => s.kind === 'perpendicular' && s.name === 'd');
    expect(perp).toBeDefined();
    expect(perp!.toLine).toBe(segAB!.name);
  });

  it('parallelThrough fallback: `to` là 1-letter POINT → auto build segment', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'AB' } },
      { op: 'draw-line', name: 'd', kind: 'parallelThrough', through: 'M', to: 'B' },
    ] as never);
    const par = dsl.shapes.find((s) => s.kind === 'parallel' && s.name === 'd');
    expect(par).toBeDefined();
    // toLine phải resolve thành segment MB (hoặc BM) chứ không phải point 'B'
    const seg = dsl.shapes.find((s) => s.name === par!.toLine && s.kind === 'segment');
    expect(seg).toBeDefined();
  });

  it('perpThrough 2-letter `to` vẫn auto-ensure segment khi cần', () => {
    // AB chưa được tạo bởi intent nào → cần ensureSegment khi resolve "AB".
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'draw-line', name: 'd', kind: 'perpThrough', through: 'C', to: 'AB' },
    ] as never);
    const perp = dsl.shapes.find((s) => s.kind === 'perpendicular' && s.name === 'd');
    expect(perp).toBeDefined();
    // Segment AB hoặc BA phải tồn tại để toLine ref hợp lệ
    const seg = dsl.shapes.find((s) => s.name === perp!.toLine && s.kind === 'segment');
    expect(seg).toBeDefined();
  });

  it('handles draw-line tangentAt', () => {
    const dsl = intentsToDsl([
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 2 },
      { op: 'add-point', name: 'A', constraint: { kind: 'free', at: [2, 0] } },
      { op: 'draw-line', name: 't', kind: 'tangentAt', through: 'A', circle: 'O' },
    ] as never);
    const t = dsl.shapes.find((s) => s.kind === 'tangent' && s.name === 't');
    expect(t).toBeDefined();
  });

  it('handles draw-line tangentFromExt which=both', () => {
    const dsl = intentsToDsl([
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 2 },
      { op: 'add-point', name: 'P', constraint: { kind: 'free', at: [5, 0] } },
      { op: 'draw-line', name: 't', kind: 'tangentFromExt', from: 'P', circle: 'O', which: 'both' },
    ] as never);
    const tangents = dsl.shapes.filter((s) => s.kind === 'tangent');
    expect(tangents).toHaveLength(2);
  });

  it('handles mark-shape on existing labels', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'right-at-A' },
      { op: 'add-point', name: 'H', constraint: { kind: 'perpFoot', from: 'A', onLine: 'BC' } },
      { op: 'mark-shape', shape: 'triangle', labels: ['A','B','H'] },
    ] as never);
    const polys = dsl.shapes.filter((s) => s.kind === 'polygon');
    const abh = polys.find((s) => {
      const vs = (s as any).vertices;
      return Array.isArray(vs) && vs.join('') === 'ABH';
    });
    expect(abh).toBeDefined();
  });

  it('throws on mark-shape referencing unknown label', () => {
    expect(() => intentsToDsl([
      { op: 'mark-shape', shape: 'triangle', labels: ['X','Y','Z'] },
    ] as never)).toThrow(/mark-shape/);
  });
});

// === Bug fix: segment ref auto-creation ===
describe('intentsToDsl — auto-ensure segments for new constraints', () => {
  it('secondIntersection auto-creates segment for line ref', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'draw-circle', name: 'cA', spec: 'centerThrough', center: 'A', through: 'B' },
      { op: 'add-point', name: 'P', constraint: { kind: 'secondIntersection', line: 'AB', circle: 'cA', other: 'A' } },
    ] as never);
    // Segment AB must exist as a shape (auto-created by builder)
    const seg = dsl.shapes.find((s) => s.kind === 'segment' && ((s as any).p1 === 'A' && (s as any).p2 === 'B'));
    expect(seg).toBeDefined();
  });

  it('tangencyPoint auto-creates segment for onLine ref', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'any' },
      { op: 'draw-circle', name: 'I', spec: 'inscribedIn', triangle: ['A','B','C'] },
      { op: 'add-point', name: 'D', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'BC' } },
    ] as never);
    const seg = dsl.shapes.find((s) => s.kind === 'segment' && ((s as any).p1 === 'B' && (s as any).p2 === 'C'));
    expect(seg).toBeDefined();
  });

  it('tangencyPoint on BH (sub-triangle side) auto-creates segment', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A','B','C'], variant: 'right-at-A' },
      { op: 'add-point', name: 'H', constraint: { kind: 'perpFoot', from: 'A', onLine: 'BC' } },
      { op: 'mark-shape', shape: 'triangle', labels: ['A','B','H'] },
      { op: 'draw-circle', name: 'I1', spec: 'inscribedIn', triangle: ['A','B','H'] },
      { op: 'add-point', name: 'D', constraint: { kind: 'tangencyPoint', circle: 'I1', onLine: 'BH' } },
    ] as never);
    const seg = dsl.shapes.find((s) => s.kind === 'segment' && ((s as any).p1 === 'B' && (s as any).p2 === 'H'));
    expect(seg).toBeDefined();
  });
});

describe('intentsToDsl — transpile compatibility', () => {
  it('produced DSL transpile thành công cho 1 hình tam giác', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
    ]);
    const t = transpile(dsl);
    expect(t.ok).toBe(true);
  });

  it('triangle + midpoint + segment transpile thành công', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'BC' } },
      { op: 'connect', from: 'A', to: 'M', style: 'segment' },
    ]);
    const t = transpile(dsl);
    expect(t.ok).toBe(true);
  });

  it('rhombus 4 đỉnh transpile thành công', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'rhombus', labels: ['A', 'B', 'C', 'D'], variant: 'standard' },
    ]);
    const t = transpile(dsl);
    expect(t.ok).toBe(true);
  });
});

describe('intentsToDsl Cụm A', () => {
  it('arcMidpoint giữ nguyên field', () => {
    const dsl = intentsToDsl([
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A', 'B', 'C'] },
      { op: 'add-point', name: 'M', constraint: { kind: 'arcMidpoint', circle: 'O', a: 'B', b: 'C', notContaining: 'A' } },
    ] as IntentT[]);
    expect(dsl.points.find((p) => p.name === 'M')).toMatchObject({
      kind: 'arcMidpoint', circle: 'O', a: 'B', b: 'C', notContaining: 'A',
    });
  });

  it('reflectLine resolve through thành segment ref', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'H', constraint: { kind: 'orthocenter', of: ['A', 'B', 'C'] } },
      { op: 'add-point', name: 'D', constraint: { kind: 'reflectLine', of: 'H', through: 'BC' } },
    ] as IntentT[]);
    const d = dsl.points.find((p) => p.name === 'D')!;
    expect(d).toMatchObject({ kind: 'reflectLine', of: 'H' });
    // through đã resolve sang tên segment (ensureSegment tạo 'BC')
    expect((d as { through: string }).through).toBe('BC');
    expect(dsl.shapes.some((s) => s.kind === 'segment' && s.name === 'BC')).toBe(true);
  });

  it('excenter giữ vertices + opposite', () => {
    const dsl = intentsToDsl([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'J', constraint: { kind: 'excenter', of: ['A', 'B', 'C'], opposite: 'A' } },
    ] as IntentT[]);
    expect(dsl.points.find((p) => p.name === 'J')).toMatchObject({
      kind: 'excenter', vertices: ['A', 'B', 'C'], opposite: 'A',
    });
  });
});
