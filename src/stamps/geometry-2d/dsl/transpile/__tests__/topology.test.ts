// src/stamps/geometry-2d/dsl/transpile/__tests__/topology.test.ts
//
// Test topological stability: preserve DSL order khi không có constraint,
// chỉ reorder khi cần (vd perpFoot depend on segment).

import { buildSymbols } from '../symbols';
import { topoSort } from '../topology';
import type { DslInputT } from '../../schema';

function order(dsl: DslInputT): string[] {
  const { symbols } = buildSymbols(dsl);
  return topoSort(symbols);
}

describe('topoSort', () => {
  it('không constraint → giữ DSL order (points trước shapes)', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
        { name: 'C', kind: 'free', x: 0, y: 1 },
      ],
      shapes: [
        { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
        { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
      ],
    };
    expect(order(dsl)).toEqual(['A', 'B', 'C', 'ABC', 'BC']);
  });

  it('perpFoot point onLine segment → segment phải trước perpFoot', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 3 },
        { name: 'B', kind: 'free', x: -2, y: 0 },
        { name: 'C', kind: 'free', x: 2, y: 0 },
        { name: 'H', kind: 'perpFoot', from: 'A', onLine: 'BC' },
      ],
      shapes: [
        { name: 'ABC', kind: 'polygon', vertices: ['A', 'B', 'C'] },
        { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
        { name: 'AH', kind: 'segment', p1: 'A', p2: 'H' },
      ],
    };
    const o = order(dsl);
    // BC must come BEFORE H
    expect(o.indexOf('BC')).toBeLessThan(o.indexOf('H'));
    // H must come BEFORE AH (AH depends on H)
    expect(o.indexOf('H')).toBeLessThan(o.indexOf('AH'));
    // DSL stability: ABC stays before BC (no constraint between them)
    expect(o.indexOf('ABC')).toBeLessThan(o.indexOf('BC'));
  });

  it('intersection point depends on 2 lines → cả 2 line trước intersection', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 4, y: 0 },
        { name: 'C', kind: 'free', x: 4, y: 3 },
        { name: 'D', kind: 'free', x: 0, y: 3 },
        { name: 'O', kind: 'intersection', ref1: 'AC', ref2: 'BD' },
      ],
      shapes: [
        { name: 'ABCD', kind: 'polygon', vertices: ['A', 'B', 'C', 'D'] },
        { name: 'AC', kind: 'segment', p1: 'A', p2: 'C' },
        { name: 'BD', kind: 'segment', p1: 'B', p2: 'D' },
      ],
    };
    const o = order(dsl);
    expect(o.indexOf('AC')).toBeLessThan(o.indexOf('O'));
    expect(o.indexOf('BD')).toBeLessThan(o.indexOf('O'));
  });

  it('chuỗi phụ thuộc dài → resolve đủ', () => {
    // A,B free → BC segment → H perpFoot onLine BC → AH segment from H
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 3 },
        { name: 'B', kind: 'free', x: -2, y: 0 },
        { name: 'C', kind: 'free', x: 2, y: 0 },
        { name: 'H', kind: 'perpFoot', from: 'A', onLine: 'BC' },
        { name: 'M', kind: 'midpoint', p1: 'A', p2: 'H' },
      ],
      shapes: [
        { name: 'BC', kind: 'segment', p1: 'B', p2: 'C' },
        { name: 'AH', kind: 'segment', p1: 'A', p2: 'H' },
      ],
    };
    const o = order(dsl);
    expect(o).toHaveLength(7);
    expect(o.indexOf('BC')).toBeLessThan(o.indexOf('H'));
    expect(o.indexOf('H')).toBeLessThan(o.indexOf('M'));
    expect(o.indexOf('H')).toBeLessThan(o.indexOf('AH'));
  });

  it('output luôn có đủ số phần tử (defensive với cycle)', () => {
    const dsl: DslInputT = {
      version: 1,
      points: [
        { name: 'A', kind: 'free', x: 0, y: 0 },
        { name: 'B', kind: 'free', x: 1, y: 0 },
      ],
      shapes: [],
    };
    expect(order(dsl)).toHaveLength(2);
  });
});
