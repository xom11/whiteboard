// src/stamps/graph-2d/editor/handlers.ts
import type { Store } from '../../../core/scene/store';
import type { GraphTool } from './tools';

export interface HandlerCtx {
  store: Store;
  toolRef: { current: GraphTool };
  pendingIdsRef: { current: string[] };
  pushPending: (id: string) => void;
  clearPending: () => void;
  setTool: (t: GraphTool) => void;
  nextLabel: (kind: string) => string;
  /** Lookup nearest function2d id within vertical hit tolerance. */
  getNearestFunctionId: (coord: { x: number; y: number }) => string | null;
  /** Lookup any object at coord via JSXGraph hasPoint (pointOnCurve, point, etc.). */
  getHitObjectId: (coord: { x: number; y: number }) => string | null;
}

export interface Coord { x: number; y: number; }

export function handleDown(ctx: HandlerCtx, coord: Coord): void {
  const tool = ctx.toolRef.current;
  switch (tool) {
    case 'move':
      return;
    case 'point':
      addFreePoint(ctx, coord);
      return;
    case 'slider':
      // Opens dialog separately — handled in EditorPanel. Reset tool.
      ctx.setTool('move');
      return;
    case 'pointOnCurve':
      addPointOnCurve(ctx, coord);
      return;
    case 'intersect':
      handleIntersect(ctx, coord);
      return;
    case 'tangent':
      handleTangent(ctx, coord);
      return;
    case 'slope':
      handleSlope(ctx, coord);
      return;
    case 'extremum':
    case 'root':
      handleAnalysisTool(ctx, coord, tool);
      return;
    case 'segment':
    case 'line':
      handleTwoPointTool(ctx, coord, tool);
      return;
    case 'polygon':
      handlePolygonTool(ctx, coord);
      return;
  }
}

function addFreePoint(ctx: HandlerCtx, coord: Coord): void {
  const id = ctx.nextLabel('point');
  ctx.store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id, kind: 'point', label: id, visible: true, locked: false,
        layer: 'default', schemaVersion: 1,
        attrs: { constraint: { kind: 'free', x: coord.x, y: coord.y } },
      },
    },
  });
  ctx.setTool('move');
}

function addPointOnCurve(ctx: HandlerCtx, coord: Coord): void {
  const fid = ctx.getNearestFunctionId(coord);
  if (!fid) return;
  const id = ctx.nextLabel('pointOnCurve');
  ctx.store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id, kind: 'pointOnCurve', label: id, visible: true, locked: false,
        layer: 'default', schemaVersion: 1,
        attrs: { functionId: fid, x: coord.x },
      },
    },
  });
  ctx.setTool('move');
}

function handleIntersect(ctx: HandlerCtx, coord: Coord): void {
  const fid = ctx.getNearestFunctionId(coord);
  if (!fid) return;
  if (ctx.pendingIdsRef.current.length === 0) {
    ctx.pushPending(fid);
    return;
  }
  const fa = ctx.pendingIdsRef.current[0];
  if (fa === fid) return;
  const id = ctx.nextLabel('intersection');
  ctx.store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id, kind: 'intersection', label: id, visible: true, locked: false,
        layer: 'default', schemaVersion: 1,
        // NOTE: 'lineLine' is semantically imprecise for function2d curves but
        // works as a discriminant tag — TODO refactor to 'curveCurve' kind in
        // a follow-up when intersection kind is extended.
        attrs: { kind: 'lineLine', ref1: fa, ref2: fid },
      },
    },
  });
  ctx.clearPending();
  ctx.setTool('move');
}

function handleTangent(ctx: HandlerCtx, coord: Coord): void {
  const hitId = ctx.getHitObjectId(coord);
  if (!hitId) return;
  const obj = ctx.store.getState().objects[hitId];
  if (!obj || obj.kind !== 'pointOnCurve') return;
  const id = ctx.nextLabel('tangent2d');
  ctx.store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id, kind: 'tangent2d', label: id, visible: true, locked: false,
        layer: 'default', schemaVersion: 1, attrs: { pointId: hitId },
      },
    },
  });
  ctx.setTool('move');
}

function handleSlope(ctx: HandlerCtx, coord: Coord): void {
  const hitId = ctx.getHitObjectId(coord);
  if (!hitId) return;
  const obj = ctx.store.getState().objects[hitId];
  if (!obj || obj.kind !== 'pointOnCurve') return;
  const id = ctx.nextLabel('slope2d');
  ctx.store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id, kind: 'slope2d', label: id, visible: true, locked: false,
        layer: 'default', schemaVersion: 1, attrs: { pointId: hitId },
      },
    },
  });
  ctx.setTool('move');
}

function handleAnalysisTool(ctx: HandlerCtx, coord: Coord, tool: 'extremum' | 'root'): void {
  const fid = ctx.getNearestFunctionId(coord);
  if (!fid) return;
  // MVP: use default domain [-10, 10]. UI can override via properties post-creation.
  if (tool === 'extremum') {
    const id = ctx.nextLabel('extremum2d');
    ctx.store.dispatch({
      type: 'ADD',
      payload: {
        obj: {
          id, kind: 'extremum2d', label: id, visible: true, locked: false,
          layer: 'default', schemaVersion: 1,
          attrs: { functionId: fid, interval: { min: -10, max: 10 }, mode: 'min' },
        },
      },
    });
  } else {
    const id = ctx.nextLabel('root2d');
    ctx.store.dispatch({
      type: 'ADD',
      payload: {
        obj: {
          id, kind: 'root2d', label: id, visible: true, locked: false,
          layer: 'default', schemaVersion: 1,
          attrs: { functionId: fid, interval: { min: -10, max: 10 } },
        },
      },
    });
  }
  ctx.setTool('move');
}

function handleTwoPointTool(ctx: HandlerCtx, coord: Coord, tool: 'segment' | 'line'): void {
  const hitId = ctx.getHitObjectId(coord);
  const pid = hitId ?? (() => {
    // Auto-add free point at click location
    const id = ctx.nextLabel('point');
    ctx.store.dispatch({
      type: 'ADD',
      payload: {
        obj: {
          id, kind: 'point', label: id, visible: true, locked: false,
          layer: 'default', schemaVersion: 1,
          attrs: { constraint: { kind: 'free', x: coord.x, y: coord.y } },
        },
      },
    });
    return id;
  })();
  if (ctx.pendingIdsRef.current.length === 0) {
    ctx.pushPending(pid);
    return;
  }
  const p1 = ctx.pendingIdsRef.current[0];
  if (p1 === pid) return;
  const id = ctx.nextLabel(tool);
  ctx.store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id, kind: tool, label: id, visible: true, locked: false,
        layer: 'default', schemaVersion: 1, attrs: { p1, p2: pid },
      },
    },
  });
  ctx.clearPending();
  ctx.setTool('move');
}

function handlePolygonTool(ctx: HandlerCtx, coord: Coord): void {
  const hitId = ctx.getHitObjectId(coord);
  // Close polygon if clicking first pending point and have ≥3 vertices
  if (hitId && ctx.pendingIdsRef.current[0] === hitId && ctx.pendingIdsRef.current.length >= 3) {
    const id = ctx.nextLabel('polygon');
    ctx.store.dispatch({
      type: 'ADD',
      payload: {
        obj: {
          id, kind: 'polygon', label: id, visible: true, locked: false,
          layer: 'default', schemaVersion: 1,
          attrs: { points: [...ctx.pendingIdsRef.current] },
        },
      },
    });
    ctx.clearPending();
    ctx.setTool('move');
    return;
  }
  // Otherwise add new point + push to pending
  const pid = hitId ?? (() => {
    const id = ctx.nextLabel('point');
    ctx.store.dispatch({
      type: 'ADD',
      payload: {
        obj: {
          id, kind: 'point', label: id, visible: true, locked: false,
          layer: 'default', schemaVersion: 1,
          attrs: { constraint: { kind: 'free', x: coord.x, y: coord.y } },
        },
      },
    });
    return id;
  })();
  ctx.pushPending(pid);
}
