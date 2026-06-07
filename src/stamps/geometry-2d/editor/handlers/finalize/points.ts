import type { GeometryToolModule } from './_types';
import { objKind } from '../../tools';
import { freshId, mkSceneObj } from '../utils';
import { findPickIdByKind } from './shared';

export const midpointTool: GeometryToolModule = {
  key: 'midpoint',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const id = freshId(ctx, 'mp');
    const label = ctx.nextLabel('point');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'point', label, {
        constraint: { kind: 'midpoint', p1: ids[0], p2: ids[1] },
      }) },
    });
  },
};

export const perpFootTool: GeometryToolModule = {
  key: 'perpFoot',
  finalize(ctx) {
    const fromPoint = findPickIdByKind(ctx, 'point');
    const onLine = findPickIdByKind(ctx, 'line');
    if (!fromPoint || !onLine) return;
    const id = freshId(ctx, 'pf');
    const label = ctx.nextLabel('point');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'point', label, {
        constraint: { kind: 'perpFoot', from: fromPoint, onLine },
      }) },
    });
  },
};

export const centroidTool: GeometryToolModule = {
  key: 'centroid',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const id = freshId(ctx, 'g');
    const label = ctx.nextLabel('point');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'point', label, {
        constraint: { kind: 'centroid', vertices: [ids[0], ids[1], ids[2]] },
      }) },
    });
  },
};

export const circumcenterTool: GeometryToolModule = {
  key: 'circumcenter',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const id = freshId(ctx, 'o');
    const label = ctx.nextLabel('point');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'point', label, {
        constraint: { kind: 'circumcenter', vertices: [ids[0], ids[1], ids[2]] },
      }) },
    });
  },
};

export const incenterTool: GeometryToolModule = {
  key: 'incenter',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const id = freshId(ctx, 'i');
    const label = ctx.nextLabel('point');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'point', label, {
        constraint: { kind: 'incenter', vertices: [ids[0], ids[1], ids[2]] },
      }) },
    });
  },
};

export const orthocenterTool: GeometryToolModule = {
  key: 'orthocenter',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const id = freshId(ctx, 'h');
    const label = ctx.nextLabel('point');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'point', label, {
        constraint: { kind: 'orthocenter', vertices: [ids[0], ids[1], ids[2]] },
      }) },
    });
  },
};

export const excenterTool: GeometryToolModule = {
  key: 'excenter',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const id = freshId(ctx, 'ex');
    const label = ctx.nextLabel('point');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'point', label, {
        constraint: { kind: 'excenter', vertices: [ids[0], ids[1], ids[2]], opposite: ids[0] },
      }) },
    });
  },
};

export const tangencyPointTool: GeometryToolModule = {
  key: 'tangencyPoint',
  finalize(ctx) {
    const circleId = findPickIdByKind(ctx, 'circle');
    const lineId = findPickIdByKind(ctx, 'line');
    if (!circleId || !lineId) return;
    const id = freshId(ctx, 'tp');
    const label = ctx.nextLabel('point');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'point', label, {
        constraint: { kind: 'tangencyPoint', circle: circleId, onLine: lineId },
      }) },
    });
  },
};

export const secondIntersectionTool: GeometryToolModule = {
  key: 'secondIntersection',
  finalize(ctx) {
    const lineId = findPickIdByKind(ctx, 'line');
    const circleId = findPickIdByKind(ctx, 'circle');
    const otherId = findPickIdByKind(ctx, 'point');
    if (!lineId || !circleId || !otherId) return;
    const id = freshId(ctx, 'X');
    const label = ctx.nextLabel('point');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'point', label, {
        constraint: { kind: 'secondIntersection', line: lineId, circle: circleId, other: otherId },
      }) },
    });
  },
};

export const arcMidpointTool: GeometryToolModule = {
  key: 'arcMidpoint',
  finalize(ctx) {
    const circleId = findPickIdByKind(ctx, 'circle');
    const picks = ctx.pendingRef.current;
    const allIds = ctx.pendingIdsRef.current;
    const ptIds: string[] = [];
    for (let i = 0; i < picks.length; i += 1) {
      if (objKind(picks[i]) === 'point' && allIds[i]) ptIds.push(allIds[i]);
    }
    if (!circleId || ptIds.length < 3) return;
    const id = freshId(ctx, 'M');
    const label = ctx.nextLabel('point');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'point', label, {
        constraint: { kind: 'arcMidpoint', circle: circleId, a: ptIds[0], b: ptIds[1], notContaining: ptIds[2] },
      }) },
    });
  },
};

export const circleIntersectionTool: GeometryToolModule = {
  key: 'circleIntersection',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    for (const which of [0, 1] as const) {
      const id = freshId(ctx, 'X');
      const label = ctx.nextLabel('point');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'point', label, {
          constraint: { kind: 'circleIntersection', c1: ids[0], c2: ids[1], which },
        }) },
      });
    }
  },
};

export const tangentPointExtTool: GeometryToolModule = {
  key: 'tangentPointExt',
  finalize(ctx) {
    const fromId = findPickIdByKind(ctx, 'point');
    const circleId = findPickIdByKind(ctx, 'circle');
    if (!fromId || !circleId) return;
    for (const which of [0, 1] as const) {
      const id = freshId(ctx, 'T');
      const label = ctx.nextLabel('point');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'point', label, {
          constraint: { kind: 'tangentPointExt', from: fromId, circle: circleId, which },
        }) },
      });
    }
  },
};

export const pointOnTool: GeometryToolModule = {
  key: 'pointOn',
  finalize(ctx, _toolDef, clickXY) {
    const obj = ctx.pendingRef.current[0];
    const objId = ctx.pendingIdsRef.current[0];
    if (!obj || !objId) return;
    const kind = objKind(obj);
    const id = freshId(ctx, 'p');
    const label = ctx.nextLabel('point');
    const px = clickXY?.x ?? 0;
    const py = clickXY?.y ?? 0;
    let constraint: Record<string, unknown> | null = null;
    if (kind === 'circle') {

      const o = (obj as any).center ?? (obj as any).midpoint;
      const ox = o ? o.X() : 0; const oy = o ? o.Y() : 0;
      constraint = { kind: 'onCircle', circleId: objId, theta: Math.atan2(py - oy, px - ox) };
    } else if (kind === 'line') {

      const elType = ((obj as any).elType || '').toString().toLowerCase();

      const p1 = (obj as any).point1; const p2 = (obj as any).point2;
      let t = 0;
      if (p1 && p2) {
        const dx = p2.X() - p1.X(); const dy = p2.Y() - p1.Y();
        const len2 = dx * dx + dy * dy || 1;
        t = ((px - p1.X()) * dx + (py - p1.Y()) * dy) / len2;
      }
      constraint = elType === 'segment'
        ? { kind: 'onSegment', segmentId: objId, t }
        : { kind: 'onLine', lineId: objId, t };
    }
    if (!constraint) return;
    ctx.store.dispatch({ type: 'ADD', payload: { obj: mkSceneObj(id, 'point', label, { constraint }) } });
  },
};
