import { finalizeShape } from '../finalizeShape';
import type { HandlerCtx } from '../ctx';

function mkCtx(ids: string[]): { ctx: HandlerCtx; dispatched: any[] } {
  const dispatched: any[] = [];
  const objects: Record<string, any> = {};
  const ctx = {
    pendingRef: { current: ids.map(() => ({ elementClass: 1 })) },
    pendingIdsRef: { current: [...ids] },
    store: {
      getState: () => ({ counter: 0, objects, order: [], meta: { domain: '2d', version: 1 } }),
      dispatch: (a: any) => dispatched.push(a),
    },
    nextLabel: (kind: string) => `${kind}_label`,
    flashWarn: jest.fn(),
    refreshPreview: jest.fn(),
    findNearestPointJxg: jest.fn(),
    emitTransform: jest.fn(),
    setPendingCount: jest.fn(),
    clearPending: jest.fn(),
    pendingTransformRef: { current: null },
    jxgIdToSceneId: jest.fn(),
    jxgFromSceneId: jest.fn(),
    toast: jest.fn(),
  } as unknown as HandlerCtx;
  return { ctx, dispatched };
}

describe('finalizeShape — circle tools Tier 2', () => {
  test('semicircle → ADD arc kind với construction semicircle', () => {
    const { ctx, dispatched } = mkCtx(['A', 'B']);
    finalizeShape(ctx, { key: 'semicircle', label: '', hint: '', icon: null as any, group: 'circle', needs: 2 });
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe('ADD');
    expect(dispatched[0].payload.obj.kind).toBe('arc');
    expect(dispatched[0].payload.obj.attrs.construction).toEqual({ kind: 'semicircle', p1: 'A', p2: 'B' });
  });

  test('arcCenter → ADD arc kind với construction byCenter', () => {
    const { ctx, dispatched } = mkCtx(['O', 'A', 'B']);
    finalizeShape(ctx, { key: 'arcCenter', label: '', hint: '', icon: null as any, group: 'circle', needs: 3 });
    expect(dispatched[0].payload.obj.kind).toBe('arc');
    expect(dispatched[0].payload.obj.attrs.construction).toEqual({ kind: 'byCenter', center: 'O', p1: 'A', p2: 'B' });
  });

  test('arc3 → ADD arc kind với construction by3Points', () => {
    const { ctx, dispatched } = mkCtx(['A', 'B', 'C']);
    ctx.pendingRef.current = [
      { X: () => 0, Y: () => 0 },
      { X: () => 1, Y: () => 1 },
      { X: () => 2, Y: () => 0 },
    ] as any;
    finalizeShape(ctx, { key: 'arc3', label: '', hint: '', icon: null as any, group: 'circle', needs: 3 });
    expect(dispatched[0].payload.obj.kind).toBe('arc');
    expect(dispatched[0].payload.obj.attrs.construction).toEqual({ kind: 'by3Points', p1: 'A', p2: 'B', p3: 'C' });
  });

  test('sectorCenter → ADD sector kind với construction byCenter', () => {
    const { ctx, dispatched } = mkCtx(['O', 'A', 'B']);
    finalizeShape(ctx, { key: 'sectorCenter', label: '', hint: '', icon: null as any, group: 'circle', needs: 3 });
    expect(dispatched[0].payload.obj.kind).toBe('sector');
    expect(dispatched[0].payload.obj.attrs.construction).toEqual({ kind: 'byCenter', center: 'O', p1: 'A', p2: 'B' });
  });

  test('semicircle với 2 id trùng → toast + abort, không dispatch', () => {
    const { ctx, dispatched } = mkCtx(['A', 'A']);
    finalizeShape(ctx, { key: 'semicircle', label: '', hint: '', icon: null as any, group: 'circle', needs: 2 });
    expect(dispatched).toHaveLength(0);
    expect(ctx.toast).toHaveBeenCalledWith(
      expect.stringMatching(/phân biệt/i),
      expect.objectContaining({ variant: 'warning' }),
    );
  });

  test('arcCenter với 2 id trùng → toast + abort', () => {
    const { ctx, dispatched } = mkCtx(['O', 'O', 'B']);
    finalizeShape(ctx, { key: 'arcCenter', label: '', hint: '', icon: null as any, group: 'circle', needs: 3 });
    expect(dispatched).toHaveLength(0);
    expect(ctx.toast).toHaveBeenCalled();
  });

  test('sectorCenter với 2 id trùng → toast + abort', () => {
    const { ctx, dispatched } = mkCtx(['O', 'A', 'A']);
    finalizeShape(ctx, { key: 'sectorCenter', label: '', hint: '', icon: null as any, group: 'circle', needs: 3 });
    expect(dispatched).toHaveLength(0);
    expect(ctx.toast).toHaveBeenCalled();
  });

  test('arc3 với 3 điểm thẳng hàng → toast collinear + abort', () => {
    const { ctx, dispatched } = mkCtx(['A', 'B', 'C']);
    ctx.pendingRef.current = [
      { X: () => 0, Y: () => 0 },
      { X: () => 1, Y: () => 0 },
      { X: () => 2, Y: () => 0 },
    ] as any;
    finalizeShape(ctx, { key: 'arc3', label: '', hint: '', icon: null as any, group: 'circle', needs: 3 });
    expect(dispatched).toHaveLength(0);
    expect(ctx.toast).toHaveBeenCalledWith(
      expect.stringMatching(/thẳng hàng/i),
      expect.objectContaining({ variant: 'warning' }),
    );
  });

  test('arc3 với 3 id trùng → toast distinct + abort', () => {
    const { ctx, dispatched } = mkCtx(['A', 'A', 'A']);
    ctx.pendingRef.current = [
      { X: () => 0, Y: () => 0 },
      { X: () => 0, Y: () => 0 },
      { X: () => 0, Y: () => 0 },
    ] as any;
    finalizeShape(ctx, { key: 'arc3', label: '', hint: '', icon: null as any, group: 'circle', needs: 3 });
    expect(dispatched).toHaveLength(0);
    expect(ctx.toast).toHaveBeenCalled();
  });
});

describe('finalizeShape — angleBisector dual mode', () => {
  test('3 picks point → 1 ADD line với construction angleBisector', () => {
    const { ctx, dispatched } = mkCtx(['A', 'V', 'B']);
    // pendingRef mặc định là 3 point (elementClass: 1).
    finalizeShape(ctx, { key: 'angleBisector', label: '', hint: '', icon: null as any, group: 'construct', needs: 3, accepts: ['pointOrLine', 'pointOrLine', 'pointOrLine'] });
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].payload.obj.kind).toBe('line');
    expect(dispatched[0].payload.obj.attrs.construction).toEqual({
      kind: 'angleBisector', p1: 'A', vertex: 'V', p2: 'B',
    });
  });

  test('2 picks line → 2 ADD line với construction angleBisectorLines (branch 0 + 1)', () => {
    const { ctx, dispatched } = mkCtx(['L1', 'L2']);
    ctx.pendingRef.current = [
      { elementClass: 2 }, // line
      { elementClass: 2 },
    ] as any;
    finalizeShape(ctx, { key: 'angleBisector', label: '', hint: '', icon: null as any, group: 'construct', needs: 3, accepts: ['pointOrLine', 'pointOrLine', 'pointOrLine'] });
    expect(dispatched).toHaveLength(2);
    expect(dispatched[0].payload.obj.attrs.construction).toEqual({
      kind: 'angleBisectorLines', line1: 'L1', line2: 'L2', branch: 0,
    });
    expect(dispatched[1].payload.obj.attrs.construction).toEqual({
      kind: 'angleBisectorLines', line1: 'L1', line2: 'L2', branch: 1,
    });
  });
});
