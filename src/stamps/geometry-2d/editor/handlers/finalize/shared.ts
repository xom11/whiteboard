// finalize/shared.ts
import { objKind } from '../../tools';
import type { HandlerCtx } from '../ctx';

/**
 * Tìm scene id của pending pick theo `objKind`. Dùng cho tool order-flexible
 * (perpendicular, parallel, tangent): user có thể click điểm trước hay đường
 * trước, finalizeShape dò pendingRef theo kind để biết role.
 */
export function findPickIdByKind(ctx: HandlerCtx, kind: 'point' | 'line' | 'circle'): string | null {
  const picks = ctx.pendingRef.current;
  const ids = ctx.pendingIdsRef.current;
  for (let i = 0; i < picks.length; i += 1) {
    if (objKind(picks[i]) === kind && ids[i]) return ids[i];
  }
  return null;
}

// ─── Helpers cho special-shape constraint promotion ─────────────────────────

export type Vec = { x: number; y: number };

export function readJxgPos(ctx: HandlerCtx, id: string): Vec {

  const j = ctx.jxgFromSceneId(id) as any;
  if (!j || typeof j.X !== 'function') return { x: 0, y: 0 };
  return { x: j.X(), y: j.Y() };
}

/** Signed scalar offset của P từ T dọc theo perp(A→B) chuẩn hoá. */
export function computePerpendicularT(P: Vec, T: Vec, A: Vec, B: Vec): number {
  const dx = B.x - A.x, dy = B.y - A.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return 0;
  const ux = -dy / len, uy = dx / len;
  return (P.x - T.x) * ux + (P.y - T.y) * uy;
}

/** Signed scalar offset của P từ midpoint(A,B) dọc theo perp(A→B) chuẩn hoá. */
export function computePerpBisectorT(P: Vec, A: Vec, B: Vec): number {
  const Mx = (A.x + B.x) / 2, My = (A.y + B.y) / 2;
  const dx = B.x - A.x, dy = B.y - A.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return 0;
  const ux = -dy / len, uy = dx / len;
  return (P.x - Mx) * ux + (P.y - My) * uy;
}

export function computeCircleTheta(P: Vec, C: Vec): number {
  return Math.atan2(P.y - C.y, P.x - C.x);
}
