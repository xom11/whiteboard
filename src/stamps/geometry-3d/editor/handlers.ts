import type { GeomTool3D } from './tools';
import type { SerializedElement3D, Element3DType } from '../serialize';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export interface HandlerContextDeps {
  view: { create: (kind: string, parents: unknown[], attrs: unknown) => JxgObj };
  pushLog: (e: SerializedElement3D) => void;
  objMap: Map<string, JxgObj>;
  nextId: () => string;
  isDark: boolean;
  promptCoords: (label: string) => { x: number; y: number; z: number } | null;
  promptNumber: (label: string) => number | null;
  promptText: (label: string) => string | null;
  notify: () => void;
}

export interface PendingPoint {
  id: string;
  ref: JxgObj;
  coords: [number, number, number];
}

export interface HandlerContext extends HandlerContextDeps {
  pendingPoints: PendingPoint[];
  /** Internal state flag for multi-stage tools (pyramid base done, etc.) */
  pendingFlags: Record<string, unknown>;
}

export interface ClickHit {
  x3: number;
  y3: number;
  z3: number;
  /** Existing point id if the click landed on an existing point. */
  existingPointId?: string;
}

export function createHandlerContext(deps: HandlerContextDeps): HandlerContext {
  return { ...deps, pendingPoints: [], pendingFlags: {} };
}

function refByPlaceholder(id: string): string {
  return `@id:${id}`;
}

function createPoint3D(
  ctx: HandlerContext,
  x: number,
  y: number,
  z: number,
  label?: string,
): PendingPoint {
  const id = ctx.nextId();
  const attrs: Record<string, unknown> = { id, size: 3 };
  if (label) attrs.name = label;
  const ref = ctx.view.create('point3d', [x, y, z], attrs);
  ctx.objMap.set(id, ref);
  ctx.pushLog({
    type: 'point3d',
    parents: [x, y, z],
    attributes: attrs,
    id,
    label,
  });
  return { id, ref, coords: [x, y, z] };
}

function resolvePoint(ctx: HandlerContext, hit: ClickHit): PendingPoint {
  if (hit.existingPointId && ctx.objMap.has(hit.existingPointId)) {
    return {
      id: hit.existingPointId,
      ref: ctx.objMap.get(hit.existingPointId),
      coords: [hit.x3, hit.y3, hit.z3],
    };
  }
  return createPoint3D(ctx, hit.x3, hit.y3, hit.z3);
}

function finishPolygon(ctx: HandlerContext, points: PendingPoint[]): void {
  const id = ctx.nextId();
  const refs = points.map((p) => p.ref);
  const ref = ctx.view.create('polygon3d', [refs], { id });
  ctx.objMap.set(id, ref);
  ctx.pushLog({
    type: 'polygon3d',
    parents: [points.map((p) => refByPlaceholder(p.id))],
    attributes: { id },
    id,
  });
}

function finishLineLike(
  ctx: HandlerContext,
  elType: Element3DType,
  points: PendingPoint[],
): void {
  const id = ctx.nextId();
  const refs = points.map((p) => p.ref);
  const ref = ctx.view.create(elType, refs, { id });
  ctx.objMap.set(id, ref);
  ctx.pushLog({
    type: elType,
    parents: points.map((p) => refByPlaceholder(p.id)),
    attributes: { id },
    id,
  });
}

export function handleToolStep(
  ctx: HandlerContext,
  tool: GeomTool3D,
  hit: ClickHit,
): void {
  switch (tool) {
    case 'move':
      return;

    case 'point': {
      const coords = ctx.promptCoords('Toạ độ điểm (x, y, z)');
      if (!coords) return;
      createPoint3D(ctx, coords.x, coords.y, coords.z);
      ctx.notify();
      return;
    }

    case 'segment':
    case 'line': {
      const p = resolvePoint(ctx, hit);
      ctx.pendingPoints.push(p);
      if (ctx.pendingPoints.length === 2) {
        finishLineLike(ctx, tool === 'segment' ? 'segment3d' : 'line3d', ctx.pendingPoints);
        ctx.pendingPoints = [];
      }
      ctx.notify();
      return;
    }

    case 'plane': {
      const p = resolvePoint(ctx, hit);
      ctx.pendingPoints.push(p);
      if (ctx.pendingPoints.length === 3) {
        finishLineLike(ctx, 'plane3d', ctx.pendingPoints);
        ctx.pendingPoints = [];
      }
      ctx.notify();
      return;
    }

    case 'triangle': {
      const p = resolvePoint(ctx, hit);
      ctx.pendingPoints.push(p);
      if (ctx.pendingPoints.length === 3) {
        finishPolygon(ctx, ctx.pendingPoints);
        ctx.pendingPoints = [];
      }
      ctx.notify();
      return;
    }

    case 'polygon': {
      if (
        ctx.pendingPoints.length >= 3 &&
        hit.existingPointId === ctx.pendingPoints[0].id
      ) {
        finishPolygon(ctx, ctx.pendingPoints);
        ctx.pendingPoints = [];
        ctx.notify();
        return;
      }
      const p = resolvePoint(ctx, hit);
      ctx.pendingPoints.push(p);
      ctx.notify();
      return;
    }

    case 'label': {
      if (!hit.existingPointId) return;
      const text = ctx.promptText('Nội dung nhãn');
      if (!text) return;
      const id = ctx.nextId();
      const pointRef = ctx.objMap.get(hit.existingPointId);
      const ref = ctx.view.create('text3d', [pointRef, text], { id });
      ctx.objMap.set(id, ref);
      ctx.pushLog({
        type: 'text3d',
        parents: [refByPlaceholder(hit.existingPointId), text],
        attributes: { id },
        id,
        label: text,
      });
      ctx.notify();
      return;
    }

    // Solids + curved handled in B8, B9
    default:
      handleSolidStep(ctx, tool, hit);
      return;
  }
}

// Stub — implemented in B8
export function handleSolidStep(
  _ctx: HandlerContext,
  _tool: GeomTool3D,
  _hit: ClickHit,
): void {
  // no-op stub
}

// Helpers exported for B8/B9 to reuse
export {
  createPoint3D,
  resolvePoint,
  refByPlaceholder,
  finishPolygon,
  finishLineLike,
};
