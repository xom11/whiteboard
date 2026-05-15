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

export function handleSolidStep(
  ctx: HandlerContext,
  tool: GeomTool3D,
  hit: ClickHit,
): void {
  switch (tool) {
    case 'tetrahedron': {
      const p = resolvePoint(ctx, hit);
      ctx.pendingPoints.push(p);
      if (ctx.pendingPoints.length === 4) {
        const [a, b, c, d] = ctx.pendingPoints;
        finishPolyhedron(ctx, [
          [a, b, c],
          [a, b, d],
          [a, c, d],
          [b, c, d],
        ]);
        ctx.pendingPoints = [];
      }
      ctx.notify();
      return;
    }

    case 'parallelepiped': {
      const origin = resolvePoint(ctx, hit);
      const v1 = ctx.promptCoords('Vector cạnh 1 (dx, dy, dz)');
      const v2 = ctx.promptCoords('Vector cạnh 2 (dx, dy, dz)');
      const v3 = ctx.promptCoords('Vector cạnh 3 (dx, dy, dz)');
      if (!v1 || !v2 || !v3) return;
      const [ox, oy, oz] = origin.coords;
      // 7 derived points (origin is reused as corner 0)
      const c1 = createPoint3D(ctx, ox + v1.x, oy + v1.y, oz + v1.z);
      const c2 = createPoint3D(ctx, ox + v2.x, oy + v2.y, oz + v2.z);
      const c3 = createPoint3D(ctx, ox + v3.x, oy + v3.y, oz + v3.z);
      const c12 = createPoint3D(
        ctx,
        ox + v1.x + v2.x,
        oy + v1.y + v2.y,
        oz + v1.z + v2.z,
      );
      const c13 = createPoint3D(
        ctx,
        ox + v1.x + v3.x,
        oy + v1.y + v3.y,
        oz + v1.z + v3.z,
      );
      const c23 = createPoint3D(
        ctx,
        ox + v2.x + v3.x,
        oy + v2.y + v3.y,
        oz + v2.z + v3.z,
      );
      const c123 = createPoint3D(
        ctx,
        ox + v1.x + v2.x + v3.x,
        oy + v1.y + v2.y + v3.y,
        oz + v1.z + v2.z + v3.z,
      );
      finishPolyhedron(ctx, [
        [origin, c1, c12, c2],
        [origin, c1, c13, c3],
        [origin, c2, c23, c3],
        [c123, c12, c1, c13],
        [c123, c12, c2, c23],
        [c123, c13, c3, c23],
      ]);
      ctx.pendingPoints = [];
      ctx.notify();
      return;
    }

    case 'prism': {
      if (
        ctx.pendingPoints.length >= 3 &&
        hit.existingPointId === ctx.pendingPoints[0].id
      ) {
        const base = ctx.pendingPoints;
        const height = ctx.promptNumber('Chiều cao (theo trục z)');
        if (!height) return;
        const top = base.map((bp) =>
          createPoint3D(ctx, bp.coords[0], bp.coords[1], bp.coords[2] + height),
        );
        const faces: PendingPoint[][] = [base, top];
        for (let i = 0; i < base.length; i++) {
          const next = (i + 1) % base.length;
          faces.push([base[i], base[next], top[next], top[i]]);
        }
        finishPolyhedron(ctx, faces);
        ctx.pendingPoints = [];
        ctx.notify();
        return;
      }
      const p = resolvePoint(ctx, hit);
      ctx.pendingPoints.push(p);
      ctx.notify();
      return;
    }

    case 'pyramid': {
      const baseDone = ctx.pendingFlags.pyramidBaseDone === true;
      if (
        !baseDone &&
        ctx.pendingPoints.length >= 3 &&
        hit.existingPointId === ctx.pendingPoints[0].id
      ) {
        ctx.pendingFlags.pyramidBaseDone = true;
        ctx.notify();
        return;
      }
      if (baseDone) {
        const base = ctx.pendingPoints;
        const apex = createPoint3D(ctx, hit.x3, hit.y3, hit.z3);
        const faces: PendingPoint[][] = [base];
        for (let i = 0; i < base.length; i++) {
          const next = (i + 1) % base.length;
          faces.push([base[i], base[next], apex]);
        }
        finishPolyhedron(ctx, faces);
        ctx.pendingPoints = [];
        ctx.pendingFlags.pyramidBaseDone = false;
        ctx.notify();
        return;
      }
      const p = resolvePoint(ctx, hit);
      ctx.pendingPoints.push(p);
      ctx.notify();
      return;
    }

    // Curved → B9
    default:
      handleCurvedStep(ctx, tool, hit);
      return;
  }
}

function finishPolyhedron(ctx: HandlerContext, faces: PendingPoint[][]): void {
  const id = ctx.nextId();
  const facesRef = faces.map((f) => f.map((p) => p.ref));
  const ref = ctx.view.create('polyhedron3d', [facesRef], { id });
  ctx.objMap.set(id, ref);
  ctx.pushLog({
    type: 'polyhedron3d',
    parents: [faces.map((f) => f.map((p) => refByPlaceholder(p.id)))],
    attributes: { id },
    id,
  });
}

// Stub — implemented in B9
export function handleCurvedStep(
  _ctx: HandlerContext,
  _tool: GeomTool3D,
  _hit: ClickHit,
): void {
  /* no-op stub */
}

// Helpers exported for B8/B9 to reuse
export {
  createPoint3D,
  resolvePoint,
  refByPlaceholder,
  finishPolygon,
  finishLineLike,
};
