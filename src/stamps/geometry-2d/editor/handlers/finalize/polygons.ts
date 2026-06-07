import type { GeometryToolModule } from './_types';
import type { HandlerCtx } from '../ctx';
import { freshId, mkSceneObj } from '../utils';
import {
  readJxgPos,
  computePerpendicularT,
  computePerpBisectorT,
  computeCircleTheta,
} from './shared';

export const squareTool: GeometryToolModule = {
  key: 'square',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const id = freshId(ctx, 'sq');
    const label = ctx.nextLabel('polygon');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'polygon', label, {
        construction: { kind: 'square', p1: ids[0], p2: ids[1] },
      }) },
    });
  },
};

export const rectangleTool: GeometryToolModule = {
  key: 'rectangle',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const [aId, bId, cId] = ids;
    const P = readJxgPos(ctx, cId);
    const Aj = readJxgPos(ctx, aId);
    const Bj = readJxgPos(ctx, bId);
    const t = computePerpendicularT(P, Bj, Aj, Bj);
    const polyId = freshId(ctx, 'rect');
    const label = ctx.nextLabel('polygon');
    ctx.store.dispatch({
      type: 'TRANSACTION',
      payload: { actions: [
        { type: 'UPDATE_ATTRS', payload: { id: cId, patch: {
            constraint: { kind: 'onPerpendicular', through: bId, perpToA: aId, perpToB: bId, t },
        } } },
        { type: 'ADD', payload: { obj: mkSceneObj(polyId, 'polygon', label, {
            construction: { kind: 'rectangle', p1: aId, p2: bId, p3: cId },
        }) } },
      ] },
    });
  },
};

export const rhombusTool: GeometryToolModule = {
  key: 'rhombus',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    const [aId, bId, cId] = ids;
    const P = readJxgPos(ctx, cId);
    const Bj = readJxgPos(ctx, bId);
    const theta = computeCircleTheta(P, Bj);
    const polyId = freshId(ctx, 'rho');
    const label = ctx.nextLabel('polygon');
    ctx.store.dispatch({
      type: 'TRANSACTION',
      payload: { actions: [
        { type: 'UPDATE_ATTRS', payload: { id: cId, patch: {
            constraint: { kind: 'onCircleAroundPoint', center: bId, radiusPoint: aId, theta },
        } } },
        { type: 'ADD', payload: { obj: mkSceneObj(polyId, 'polygon', label, {
            construction: { kind: 'rhombus', p1: aId, p2: bId, p3: cId },
        }) } },
      ] },
    });
  },
};

/** Shared body cho parallelogram & isoTrapezoid (cùng construction shape, khác kind). */
function finalizePgmTrap(ctx: HandlerCtx, key: 'parallelogram' | 'isoTrapezoid'): void {
  const ids = ctx.pendingIdsRef.current;
  const [aId, bId, cId] = ids;
  const prefix = key === 'parallelogram' ? 'pgm' : 'trap';
  const polyId = freshId(ctx, prefix);
  const label = ctx.nextLabel('polygon');
  ctx.store.dispatch({
    type: 'ADD',
    payload: { obj: mkSceneObj(polyId, 'polygon', label, {
      construction: { kind: key, p1: aId, p2: bId, p3: cId },
    }) },
  });
}

export const parallelogramTool: GeometryToolModule = {
  key: 'parallelogram',
  finalize(ctx) {
    finalizePgmTrap(ctx, 'parallelogram');
  },
};

export const isoTrapezoidTool: GeometryToolModule = {
  key: 'isoTrapezoid',
  finalize(ctx) {
    finalizePgmTrap(ctx, 'isoTrapezoid');
  },
};

export const isoTriangleTool: GeometryToolModule = {
  key: 'isoTriangle',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    // ids = [base1, base2, apex] (theo thứ tự click — hint UI nói rõ).
    const [b1Id, b2Id, apexId] = ids;
    const P = readJxgPos(ctx, apexId);
    const B1 = readJxgPos(ctx, b1Id);
    const B2 = readJxgPos(ctx, b2Id);
    const t = computePerpBisectorT(P, B1, B2);
    const polyId = freshId(ctx, 'iso');
    const label = ctx.nextLabel('polygon');
    ctx.store.dispatch({
      type: 'TRANSACTION',
      payload: { actions: [
        { type: 'UPDATE_ATTRS', payload: { id: apexId, patch: {
            constraint: { kind: 'onPerpBisector', p1: b1Id, p2: b2Id, t },
        } } },
        { type: 'ADD', payload: { obj: mkSceneObj(polyId, 'polygon', label, {
            construction: { kind: 'isoTriangle', base1: b1Id, base2: b2Id, apex: apexId },
        }) } },
      ] },
    });
  },
};

export const rightTriangleTool: GeometryToolModule = {
  key: 'rightTriangle',
  finalize(ctx) {
    const ids = ctx.pendingIdsRef.current;
    // ids = [rightAngle, leg1End, leg2End].
    const [rId, p1Id, p2Id] = ids;
    const P = readJxgPos(ctx, p2Id);
    const R = readJxgPos(ctx, rId);
    const P1 = readJxgPos(ctx, p1Id);
    const t = computePerpendicularT(P, R, R, P1);
    const polyId = freshId(ctx, 'rtri');
    const label = ctx.nextLabel('polygon');
    ctx.store.dispatch({
      type: 'TRANSACTION',
      payload: { actions: [
        { type: 'UPDATE_ATTRS', payload: { id: p2Id, patch: {
            constraint: { kind: 'onPerpendicular', through: rId, perpToA: rId, perpToB: p1Id, t },
        } } },
        { type: 'ADD', payload: { obj: mkSceneObj(polyId, 'polygon', label, {
            construction: { kind: 'rightTriangle', rightAngle: rId, leg1End: p1Id, leg2End: p2Id },
        }) } },
      ] },
    });
  },
};
