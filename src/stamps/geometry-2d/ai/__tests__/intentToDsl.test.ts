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
