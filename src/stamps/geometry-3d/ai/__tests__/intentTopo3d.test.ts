import { orderIntents3dByDependency } from '../intentTopo3d';
import { solid, addPoint3d } from '../intent';

describe('orderIntents3dByDependency', () => {
  it('moves a midpoint after the solid that defines its refs', () => {
    const mid = addPoint3d('M', { kind: 'midpoint', p1: 'B', p2: 'C' });
    const sol = solid({
      flavor: 'pyramid',
      baseLabels: ['A', 'B', 'C', 'D'],
      baseVariant: 'square',
      apex: 'S',
      apexVariant: 'regular',
    });
    const out = orderIntents3dByDependency([mid, sol]);
    expect(out.indexOf(sol)).toBeLessThan(out.indexOf(mid));
  });

  it('keeps already-valid order stable', () => {
    const sol = solid({
      flavor: 'tetrahedron',
      baseLabels: ['A', 'B', 'C'],
      baseVariant: 'triangle',
      apex: 'D',
      apexVariant: 'regular',
    });
    const mid = addPoint3d('M', { kind: 'midpoint', p1: 'A', p2: 'B' });
    expect(orderIntents3dByDependency([sol, mid])).toEqual([sol, mid]);
  });

  it('cycle fallback — mutually referencing intents are returned in original order without dropping or duplicating', () => {
    // M refs N, N refs M — a true cycle; topo can't resolve it so both
    // must be returned in original order.
    const m = addPoint3d('M', { kind: 'onSegment', p1: 'N', p2: 'X' });
    const n = addPoint3d('N', { kind: 'onSegment', p1: 'M', p2: 'Y' });
    const out = orderIntents3dByDependency([m, n]);
    // Both are present exactly once.
    expect(out.length).toBe(2);
    expect(out).toContain(m);
    expect(out).toContain(n);
    // Original order preserved (cycle fallback appends in input order).
    expect(out.indexOf(m)).toBeLessThan(out.indexOf(n));
  });

  it('prism top-labels — a prism solid produces synthetic top labels so a downstream intent referencing A1 is ordered after the solid', () => {
    // addPoint3d referencing prism top vertex A1 must come after the prism.
    const ref = addPoint3d('P', { kind: 'midpoint', p1: 'A1', p2: 'B1' });
    const prism = solid({
      flavor: 'prism',
      baseLabels: ['A', 'B', 'C'],
      baseVariant: 'triangle',
      apex: 'A1', // not used by prism flavor but topLabels auto-generates A1,B1,C1
      apexVariant: 'regular',
    });
    const out = orderIntents3dByDependency([ref, prism]);
    expect(out.indexOf(prism)).toBeLessThan(out.indexOf(ref));
  });
});
