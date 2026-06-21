/**
 * Regression: auto-named shapes (onSegmentEdge edge, connect segment) phải KHÔNG đăng ký
 * label vào nameToId, tránh ghi đè id của đỉnh điểm (vertex collision).
 *
 * Trước fix: nextLabel('segment3d') trả 'A' (chữ HOA đầu tiên còn trống) và
 * registerInNameMap=true (mặc định) → nameToId['A'] = <segment-id>, phá resolveId('A').
 */
import { intentToScene3d } from '../intentToScene3d';
import { solid, addPoint3d, connect3d } from '../intent';

const pyramid = solid({
  flavor: 'pyramid',
  baseLabels: ['A', 'B', 'C', 'D'],
  baseVariant: 'square',
  apex: 'S',
  apexVariant: 'regular',
});

describe('nameToId no-collision — auto-named shapes do not overwrite vertex entries', () => {
  it('connect3d A→S: segment p1/p2 resolve to vertex point3d objects', () => {
    const st = intentToScene3d([
      pyramid,
      connect3d('A', 'S'),
    ]);

    // Locate the segment that connects A to S (segment3d with both p1,p2 present)
    const seg = Object.values(st.objects).find(
      (o) => o.kind === 'segment3d',
    ) as any;
    expect(seg).toBeDefined();

    const p1Obj = st.objects[seg.attrs.p1];
    const p2Obj = st.objects[seg.attrs.p2];

    // Both endpoints must be point3d vertices — NOT a segment/line/etc.
    expect(p1Obj?.kind).toBe('point3d');
    expect(p2Obj?.kind).toBe('point3d');

    // The two endpoint labels must be the vertex labels (order may vary)
    const epLabels = [p1Obj.label, p2Obj.label].sort();
    expect(epLabels).toEqual(['A', 'S']);
  });

  it('vertex A is still findable as point3d after connect auto-names a segment', () => {
    const st = intentToScene3d([
      pyramid,
      connect3d('A', 'S'),
    ]);
    const A = Object.values(st.objects).find((o) => o.label === 'A');
    expect(A?.kind).toBe('point3d');
  });

  it('onSegmentEdge sugar: auto edge segment does not clobber vertex labels', () => {
    const st = intentToScene3d([
      pyramid,
      addPoint3d('N', { kind: 'onSegmentEdge', a: 'C', b: 'D', t: 0.5 }),
      connect3d('A', 'S'),
    ]);

    // N must be a point on the C-D edge
    const N = Object.values(st.objects).find((o) => o.label === 'N') as any;
    expect(N?.kind).toBe('point3d');

    // Vertex C and D still resolvable
    const C = Object.values(st.objects).find((o) => o.label === 'C');
    const D = Object.values(st.objects).find((o) => o.label === 'D');
    expect(C?.kind).toBe('point3d');
    expect(D?.kind).toBe('point3d');

    // connect segment endpoints correctly reference vertex point3ds
    const seg = Object.values(st.objects).find(
      (o) =>
        o.kind === 'segment3d' &&
        st.objects[(o as any).attrs.p1]?.label === 'A',
    ) as any;
    expect(seg).toBeDefined();
    expect(st.objects[seg.attrs.p1].kind).toBe('point3d');
    expect(st.objects[seg.attrs.p1].label).toBe('A');
    expect(st.objects[seg.attrs.p2].kind).toBe('point3d');
    expect(st.objects[seg.attrs.p2].label).toBe('S');
  });
});
