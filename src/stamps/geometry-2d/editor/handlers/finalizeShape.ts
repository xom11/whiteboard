import { objKind, type ToolDef } from '../tools';
import type { HandlerCtx } from './ctx';
import { dispatchAddIntersection, freshId, mkSceneObj } from './utils';
import { classifyPointVsCircle } from './classifyPointVsCircle';

// ─── Finalize shape (dispatch ADD per tool) ──────────────────────────────────

/**
 * Tìm scene id của pending pick theo `objKind`. Dùng cho tool order-flexible
 * (perpendicular, parallel, tangent): user có thể click điểm trước hay đường
 * trước, finalizeShape dò pendingRef theo kind để biết role.
 */
function findPickIdByKind(ctx: HandlerCtx, kind: 'point' | 'line' | 'circle'): string | null {
  const picks = ctx.pendingRef.current;
  const ids = ctx.pendingIdsRef.current;
  for (let i = 0; i < picks.length; i += 1) {
    if (objKind(picks[i]) === kind && ids[i]) return ids[i];
  }
  return null;
}

// ─── Helpers cho special-shape constraint promotion ─────────────────────────

type Vec = { x: number; y: number };

function readJxgPos(ctx: HandlerCtx, id: string): Vec {

  const j = ctx.jxgFromSceneId(id) as any;
  if (!j || typeof j.X !== 'function') return { x: 0, y: 0 };
  return { x: j.X(), y: j.Y() };
}

/** Signed scalar offset của P từ T dọc theo perp(A→B) chuẩn hoá. */
function computePerpendicularT(P: Vec, T: Vec, A: Vec, B: Vec): number {
  const dx = B.x - A.x, dy = B.y - A.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return 0;
  const ux = -dy / len, uy = dx / len;
  return (P.x - T.x) * ux + (P.y - T.y) * uy;
}

/** Signed scalar offset của P từ midpoint(A,B) dọc theo perp(A→B) chuẩn hoá. */
function computePerpBisectorT(P: Vec, A: Vec, B: Vec): number {
  const Mx = (A.x + B.x) / 2, My = (A.y + B.y) / 2;
  const dx = B.x - A.x, dy = B.y - A.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return 0;
  const ux = -dy / len, uy = dx / len;
  return (P.x - Mx) * ux + (P.y - My) * uy;
}

function computeCircleTheta(P: Vec, C: Vec): number {
  return Math.atan2(P.y - C.y, P.x - C.x);
}

export function finalizeShape(ctx: HandlerCtx, toolDef: ToolDef): void {
  const ids = ctx.pendingIdsRef.current;
  const key = toolDef.key;
  switch (key) {
    case 'segment': {
      const id = freshId(ctx, 's');
      const label = ctx.nextLabel('segment');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'segment', label, { p1: ids[0], p2: ids[1] }) },
      });
      return;
    }
    case 'line': {
      const id = freshId(ctx, 'l');
      const label = ctx.nextLabel('line');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'line', label, { p1: ids[0], p2: ids[1] }) },
      });
      return;
    }
    case 'perpendicular':
    case 'parallel': {
      const throughPoint = findPickIdByKind(ctx, 'point');
      const toLine = findPickIdByKind(ctx, 'line');
      if (!throughPoint || !toLine) return;
      const id = freshId(ctx, key === 'perpendicular' ? 'perp' : 'par');
      const label = ctx.nextLabel('line');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'line', label, {
          construction: { kind: key, throughPoint, toLine },
        }) },
      });
      return;
    }
    case 'perpBisector': {
      const id = freshId(ctx, 'pb');
      const label = ctx.nextLabel('line');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'line', label, {
          construction: { kind: 'perpBisector', p1: ids[0], p2: ids[1] },
        }) },
      });
      return;
    }
    case 'angleBisector': {
      const picks = ctx.pendingRef.current;
      // Mode 2-line: 2 picks đều là line/segment → tạo 2 scene line (2 tia
      // phân giác vuông góc với nhau qua giao điểm 2 đường).
      if (picks.length === 2 && objKind(picks[0]) === 'line' && objKind(picks[1]) === 'line') {
        for (const branch of [0, 1] as const) {
          const id = freshId(ctx, 'ab');
          const label = ctx.nextLabel('line');
          ctx.store.dispatch({
            type: 'ADD',
            payload: { obj: mkSceneObj(id, 'line', label, {
              construction: { kind: 'angleBisectorLines', line1: ids[0], line2: ids[1], branch },
            }) },
          });
        }
        return;
      }
      // Mode 3-point: behavior cũ.
      const id = freshId(ctx, 'ab');
      const label = ctx.nextLabel('line');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'line', label, {
          construction: { kind: 'angleBisector', p1: ids[0], vertex: ids[1], p2: ids[2] },
        }) },
      });
      return;
    }
    case 'tangent': {
      const throughId = findPickIdByKind(ctx, 'point');
      const circleId = findPickIdByKind(ctx, 'circle');
      if (!throughId || !circleId) return;
      // Lấy JXG object tương ứng để classify vị trí P vs đường tròn.
      // pendingRef + pendingIdsRef cùng index → match qua indexOf id.
      const picks = ctx.pendingRef.current;
      const ids = ctx.pendingIdsRef.current;
      const through = picks[ids.indexOf(throughId)];
      const circle = picks[ids.indexOf(circleId)];
      const pos = classifyPointVsCircle(through, circle);
      if (pos === 'inside') {
        ctx.toast?.('Điểm nằm trong đường tròn — không có tiếp tuyến', {
          variant: 'warning',
          id: 'tangent-invalid-inside',
        });
        return;
      }
      if (pos === 'on') {
        const id = freshId(ctx, 't');
        const label = ctx.nextLabel('line');
        ctx.store.dispatch({
          type: 'ADD',
          payload: { obj: mkSceneObj(id, 'line', label, {
            construction: { kind: 'tangent', throughPoint: throughId, toCircle: circleId, branch: 'on' },
          }) },
        });
        return;
      }
      // outside → 2 scene element riêng, mỗi cái 1 nhánh tiếp tuyến.
      for (const branch of [0, 1] as const) {
        const id = freshId(ctx, 't');
        const label = ctx.nextLabel('line');
        ctx.store.dispatch({
          type: 'ADD',
          payload: { obj: mkSceneObj(id, 'line', label, {
            construction: { kind: 'tangent', throughPoint: throughId, toCircle: circleId, branch },
          }) },
        });
      }
      return;
    }
    case 'ray': {
      const id = freshId(ctx, 'r');
      const label = ctx.nextLabel('ray');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'ray', label, { origin: ids[0], through: ids[1] }) },
      });
      return;
    }
    case 'vector': {
      const id = freshId(ctx, 'v');
      const label = ctx.nextLabel('vector');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'vector', label, { from: ids[0], to: ids[1] }) },
      });
      return;
    }
    case 'circleCenter': {
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
      return;
    }
    case 'circle3': {
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
      return;
    }
    case 'semicircle': {
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
      return;
    }
    case 'arcCenter': {
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
      return;
    }
    case 'arc3': {
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
      return;
    }
    case 'sectorCenter': {
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
      return;
    }
    case 'midpoint': {
      const id = freshId(ctx, 'mp');
      const label = ctx.nextLabel('point');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'point', label, {
          constraint: { kind: 'midpoint', p1: ids[0], p2: ids[1] },
        }) },
      });
      return;
    }
    case 'perpFoot': {
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
      return;
    }
    case 'centroid': {
      const id = freshId(ctx, 'g');
      const label = ctx.nextLabel('point');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'point', label, {
          constraint: { kind: 'centroid', vertices: [ids[0], ids[1], ids[2]] },
        }) },
      });
      return;
    }
    case 'circumcenter': {
      const id = freshId(ctx, 'o');
      const label = ctx.nextLabel('point');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'point', label, {
          constraint: { kind: 'circumcenter', vertices: [ids[0], ids[1], ids[2]] },
        }) },
      });
      return;
    }
    case 'incenter': {
      const id = freshId(ctx, 'i');
      const label = ctx.nextLabel('point');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'point', label, {
          constraint: { kind: 'incenter', vertices: [ids[0], ids[1], ids[2]] },
        }) },
      });
      return;
    }
    case 'orthocenter': {
      const id = freshId(ctx, 'h');
      const label = ctx.nextLabel('point');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'point', label, {
          constraint: { kind: 'orthocenter', vertices: [ids[0], ids[1], ids[2]] },
        }) },
      });
      return;
    }
    case 'angle': {
      // ids = [p1, vertex, p2] — tool def 'accepts: ["point", "point", "point"]'
      // và LeftPanel hint "Click 3 điểm có sẵn (đỉnh ở giữa)". User click theo
      // thứ tự: cạnh-A, đỉnh, cạnh-B.
      const id = freshId(ctx, 'ang');
      const label = ctx.nextLabel('angle');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'angle', label, {
          p1: ids[0], vertex: ids[1], p2: ids[2],
        }) },
      });
      return;
    }
    case 'distance': {
      const id = freshId(ctx, 'd');
      const label = ctx.nextLabel('distance');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'distance', label, { p1: ids[0], p2: ids[1] }) },
      });
      return;
    }
    case 'intersect': {
      // ids[0], ids[1] là line hoặc circle theo accept 'lineOrCircle'.
      // Resolve kind từ pendingRef để biết lineLine / lineCircle / circleCircle.
      const picks = ctx.pendingRef.current;
      const pendIds = ctx.pendingIdsRef.current;
      const aIdx = pendIds.indexOf(ids[0]);
      const bIdx = pendIds.indexOf(ids[1]);
      if (aIdx < 0 || bIdx < 0) return;
      const aKind = objKind(picks[aIdx]);
      const bKind = objKind(picks[bIdx]);
      if (aKind === 'line' && bKind === 'line') {
        dispatchAddIntersection(ctx, { kind: 'lineLine', ref1: ids[0], ref2: ids[1] });
        return;
      }
      const isLineCircle =
        (aKind === 'line' && bKind === 'circle') || (aKind === 'circle' && bKind === 'line');
      const isCircleCircle = aKind === 'circle' && bKind === 'circle';
      if (!isLineCircle && !isCircleCircle) return;
      // 2 nhánh → tạo 2 scene intersection (giống GeoGebra "Intersect Two Objects").
      for (const branch of [0, 1] as const) {
        dispatchAddIntersection(ctx, {
          kind: isLineCircle ? 'lineCircle' : 'circleCircle',
          ref1: ids[0],
          ref2: ids[1],
          branch,
        });
      }
      return;
    }
    // ===== Hình đặc biệt (parametric) =====
    case 'square': {
      const id = freshId(ctx, 'sq');
      const label = ctx.nextLabel('polygon');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'polygon', label, {
          construction: { kind: 'square', p1: ids[0], p2: ids[1] },
        }) },
      });
      return;
    }
    case 'rectangle': {
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
      return;
    }
    case 'rhombus': {
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
      return;
    }
    case 'parallelogram':
    case 'isoTrapezoid': {
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
      return;
    }
    case 'isoTriangle': {
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
      return;
    }
    case 'rightTriangle': {
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
      return;
    }
    default:
      return;
  }
}
