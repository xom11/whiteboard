import { finalizeShape } from '../finalizeShape';
import { TOOLS } from '../../tools';

type Disp = { type: string; payload: { obj?: { kind: string; attrs: Record<string, unknown> } } };

function mkCtx(pickKinds: Array<'point' | 'line' | 'circle'>, ids: string[]) {
  const dispatched: Disp[] = [];
  let n = 0;
  const ctx = {
    pendingRef: { current: pickKinds.map((k) => ({ elementClass: k === 'point' ? 1 : k === 'line' ? 2 : 3 })) },
    pendingIdsRef: { current: ids },
    store: {
      getState: () => ({ counter: n, objects: {} }),
      dispatch: (a: Disp) => { n += 1; dispatched.push(a); },
    },
    nextLabel: () => 'X',
    toast: () => {},
  } as never;
  return { ctx, dispatched };
}
const tool = (key: string) => TOOLS.find((t) => t.key === key)!;

test('excenter dispatch point với constraint excenter, opposite = đỉnh đầu', () => {
  const { ctx, dispatched } = mkCtx(['point', 'point', 'point'], ['a', 'b', 'c']);
  finalizeShape(ctx, tool('excenter'));
  expect(dispatched).toHaveLength(1);
  expect(dispatched[0].payload.obj!.kind).toBe('point');
  expect(dispatched[0].payload.obj!.attrs.constraint).toEqual({
    kind: 'excenter', vertices: ['a', 'b', 'c'], opposite: 'a',
  });
});

test('tangencyPoint dispatch point với constraint tangencyPoint {circle,onLine}', () => {
  const { ctx, dispatched } = mkCtx(['circle', 'line'], ['c1', 'l1']);
  finalizeShape(ctx, tool('tangencyPoint'));
  expect(dispatched[0].payload.obj!.attrs.constraint).toEqual({
    kind: 'tangencyPoint', circle: 'c1', onLine: 'l1',
  });
});

test('secondIntersection dispatch point {line,circle,other}', () => {
  const { ctx, dispatched } = mkCtx(['line', 'circle', 'point'], ['l1', 'c1', 'p1']);
  finalizeShape(ctx, tool('secondIntersection'));
  expect(dispatched[0].payload.obj!.attrs.constraint).toEqual({
    kind: 'secondIntersection', line: 'l1', circle: 'c1', other: 'p1',
  });
});

test('arcMidpoint dispatch point {circle,a,b,notContaining} theo thứ tự click điểm', () => {
  const { ctx, dispatched } = mkCtx(['circle', 'point', 'point', 'point'], ['c1', 'A', 'B', 'N']);
  finalizeShape(ctx, tool('arcMidpoint'));
  expect(dispatched[0].payload.obj!.attrs.constraint).toEqual({
    kind: 'arcMidpoint', circle: 'c1', a: 'A', b: 'B', notContaining: 'N',
  });
});

test('circleIntersection dispatch 2 point (which 0 và 1)', () => {
  const { ctx, dispatched } = mkCtx(['circle', 'circle'], ['c1', 'c2']);
  finalizeShape(ctx, tool('circleIntersection'));
  expect(dispatched).toHaveLength(2);
  expect(dispatched.map((d) => (d.payload.obj!.attrs.constraint as { which: number }).which).sort()).toEqual([0, 1]);
  expect(dispatched[0].payload.obj!.attrs.constraint).toMatchObject({ kind: 'circleIntersection', c1: 'c1', c2: 'c2' });
});

test('tangentPointExt dispatch 2 point (which 0 và 1) {from,circle}', () => {
  const { ctx, dispatched } = mkCtx(['point', 'circle'], ['P', 'c1']);
  finalizeShape(ctx, tool('tangentPointExt'));
  expect(dispatched).toHaveLength(2);
  expect(dispatched[0].payload.obj!.attrs.constraint).toMatchObject({ kind: 'tangentPointExt', from: 'P', circle: 'c1' });
  expect(dispatched.map((d) => (d.payload.obj!.attrs.constraint as { which: number }).which).sort()).toEqual([0, 1]);
});

test('incircle dispatch circle với construction incircle (3 đỉnh)', () => {
  const { ctx, dispatched } = mkCtx(['point', 'point', 'point'], ['A', 'B', 'C']);
  finalizeShape(ctx, tool('incircle'));
  expect(dispatched[0].payload.obj!.kind).toBe('circle');
  expect(dispatched[0].payload.obj!.attrs.construction).toEqual({ kind: 'incircle', p1: 'A', p2: 'B', p3: 'C' });
});

test('excircle dispatch circle với construction excircle, opposite = đỉnh đầu', () => {
  const { ctx, dispatched } = mkCtx(['point', 'point', 'point'], ['A', 'B', 'C']);
  finalizeShape(ctx, tool('excircle'));
  expect(dispatched[0].payload.obj!.kind).toBe('circle');
  expect(dispatched[0].payload.obj!.attrs.construction).toEqual({ kind: 'excircle', p1: 'A', p2: 'B', p3: 'C', opposite: 'A' });
});
