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
});
