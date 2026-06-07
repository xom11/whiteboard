import type { GeometryToolModule } from './_types';
import { freshId, mkSceneObj } from '../utils';

export const circleCenterTool: GeometryToolModule = {
  key: 'circleCenter',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const id = freshId(ctx, 'c');
    const label = ctx.nextLabel('circle');
    ctx.store.dispatch({
      type: 'ADD',
      payload: {
        obj: mkSceneObj(id, 'circle', label, {
          center: ids[0],
          surfacePoint: ids[1],
        }),
      },
    });
  },
};

export const circle3Tool: GeometryToolModule = {
  key: 'circle3',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const id = freshId(ctx, 'cc');
    const label = ctx.nextLabel('circle');
    ctx.store.dispatch({
      type: 'ADD',
      payload: {
        obj: mkSceneObj(id, 'circle', label, {
          construction: { kind: 'circumscribed', p1: ids[0], p2: ids[1], p3: ids[2] },
        }),
      },
    });
  },
};

export const semicircleTool: GeometryToolModule = {
  key: 'semicircle',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    if (ids[0] === ids[1]) {
      ctx.toast?.('Cần 2 điểm phân biệt', { variant: 'warning', id: 'semicircle-dup' });
      return;
    }
    const id = freshId(ctx, 'arc');
    const label = ctx.nextLabel('arc');
    ctx.store.dispatch({
      type: 'ADD',
      payload: {
        obj: mkSceneObj(id, 'arc', label, {
          construction: { kind: 'semicircle', p1: ids[0], p2: ids[1] },
        }),
      },
    });
  },
};

export const arcCenterTool: GeometryToolModule = {
  key: 'arcCenter',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    if (ids[0] === ids[1] || ids[0] === ids[2] || ids[1] === ids[2]) {
      ctx.toast?.('Cần 3 điểm phân biệt', { variant: 'warning', id: 'arc-center-dup' });
      return;
    }
    const id = freshId(ctx, 'arc');
    const label = ctx.nextLabel('arc');
    ctx.store.dispatch({
      type: 'ADD',
      payload: {
        obj: mkSceneObj(id, 'arc', label, {
          construction: { kind: 'byCenter', center: ids[0], p1: ids[1], p2: ids[2] },
        }),
      },
    });
  },
};

export const arc3Tool: GeometryToolModule = {
  key: 'arc3',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    if (ids[0] === ids[1] || ids[0] === ids[2] || ids[1] === ids[2]) {
      ctx.toast?.('Cần 3 điểm phân biệt', { variant: 'warning', id: 'arc3-dup' });
      return;
    }
    const picks = ctx.pendingRef.current;
    const ax = picks[0].X(), ay = picks[0].Y();
    const bx = picks[1].X(), by = picks[1].Y();
    const cx = picks[2].X(), cy = picks[2].Y();
    const cross = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(cross) < 1e-6) {
      ctx.toast?.('Không vẽ được cung qua 3 điểm thẳng hàng', {
        variant: 'warning', id: 'arc3-collinear',
      });
      return;
    }
    const id = freshId(ctx, 'arc');
    const label = ctx.nextLabel('arc');
    ctx.store.dispatch({
      type: 'ADD',
      payload: {
        obj: mkSceneObj(id, 'arc', label, {
          construction: { kind: 'by3Points', p1: ids[0], p2: ids[1], p3: ids[2] },
        }),
      },
    });
  },
};

export const sectorCenterTool: GeometryToolModule = {
  key: 'sectorCenter',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    if (ids[0] === ids[1] || ids[0] === ids[2] || ids[1] === ids[2]) {
      ctx.toast?.('Cần 3 điểm phân biệt', { variant: 'warning', id: 'sector-center-dup' });
      return;
    }
    const id = freshId(ctx, 'sec');
    const label = ctx.nextLabel('sector');
    ctx.store.dispatch({
      type: 'ADD',
      payload: {
        obj: mkSceneObj(id, 'sector', label, {
          construction: { kind: 'byCenter', center: ids[0], p1: ids[1], p2: ids[2] },
        }),
      },
    });
  },
};

export const incircleTool: GeometryToolModule = {
  key: 'incircle',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const id = freshId(ctx, 'ic');
    const label = ctx.nextLabel('circle');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'circle', label, {
        construction: { kind: 'incircle', p1: ids[0], p2: ids[1], p3: ids[2] },
      }) },
    });
  },
};

export const excircleTool: GeometryToolModule = {
  key: 'excircle',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const id = freshId(ctx, 'exc');
    const label = ctx.nextLabel('circle');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'circle', label, {
        construction: { kind: 'excircle', p1: ids[0], p2: ids[1], p3: ids[2], opposite: ids[0] },
      }) },
    });
  },
};
