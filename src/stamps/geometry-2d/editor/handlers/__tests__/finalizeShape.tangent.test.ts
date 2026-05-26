import { finalizeShape } from '../finalizeShape';
import type { HandlerCtx } from '../ctx';
import { TOOLS } from '../../tools';

 
function mkPoint(x: number, y: number): any {
  return { X: () => x, Y: () => y, elType: 'point' };
}

 
function mkCircle(cx: number, cy: number, r: number): any {
  return {
    center: mkPoint(cx, cy),
    Radius: () => r,
    elType: 'circle',
  };
}

function makeCtx(picks: unknown[], ids: string[]) {
  const dispatched: unknown[] = [];
  const ctx: Partial<HandlerCtx> = {
    pendingRef: { current: picks },
    pendingIdsRef: { current: ids },
     
    store: {
      getState: () => ({ counter: 0, objects: {} }),
      dispatch: (a: unknown) => { dispatched.push(a); },
    } as any,
    nextLabel: (kind: string) => (kind === 'line' ? 'l1' : 'X'),
    toast: jest.fn(),
  };
  return { ctx: ctx as HandlerCtx, dispatched, toast: ctx.toast as jest.Mock };
}

const tangentDef = TOOLS.find((t) => t.key === 'tangent')!;

describe('finalizeShape: tangent', () => {
  test('point inside circle → 0 ADDs + toast warning', () => {
    const p = mkPoint(0, 0);
    const c = mkCircle(0, 0, 5);
    const { ctx, dispatched, toast } = makeCtx([p, c], ['P', 'C']);
    finalizeShape(ctx, tangentDef);
    expect(dispatched).toHaveLength(0);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][0]).toMatch(/trong đường tròn/);
    expect(toast.mock.calls[0][1]?.variant).toBe('warning');
  });

  test('point on circle → 1 ADD with branch="on"', () => {
    const p = mkPoint(5, 0);
    const c = mkCircle(0, 0, 5);
    const { ctx, dispatched } = makeCtx([p, c], ['P', 'C']);
    finalizeShape(ctx, tangentDef);
    expect(dispatched).toHaveLength(1);
     
    const construction = (dispatched[0] as any).payload.obj.attrs.construction;
    expect(construction.kind).toBe('tangent');
    expect(construction.branch).toBe('on');
    expect(construction.throughPoint).toBe('P');
    expect(construction.toCircle).toBe('C');
  });

  test('point outside circle → 2 ADDs with branch 0 and 1', () => {
    const p = mkPoint(10, 0);
    const c = mkCircle(0, 0, 5);
    const { ctx, dispatched } = makeCtx([p, c], ['P', 'C']);
    finalizeShape(ctx, tangentDef);
    expect(dispatched).toHaveLength(2);
     
    const branches = dispatched.map((a) => (a as any).payload.obj.attrs.construction.branch);
    expect(branches.sort()).toEqual([0, 1]);
  });

  test('order-flexible picks (circle first, point second) still works', () => {
    const p = mkPoint(10, 0);
    const c = mkCircle(0, 0, 5);
    const { ctx, dispatched, toast } = makeCtx([c, p], ['C', 'P']);
    finalizeShape(ctx, tangentDef);
    expect(toast).not.toHaveBeenCalled();
    expect(dispatched).toHaveLength(2);
  });
});
