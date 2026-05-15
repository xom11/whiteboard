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
  /** World coords keyed by point id — used by label tool to anchor text3d. */
  pushedPointCoords: Map<string, [number, number, number]>;
}

export interface ClickHit {
  x3: number;
  y3: number;
  z3: number;
  /** Existing point id if the click landed on an existing point. */
  existingPointId?: string;
}

export function createHandlerContext(deps: HandlerContextDeps): HandlerContext {
  return {
    ...deps,
    pendingPoints: [],
    pendingFlags: {},
    pushedPointCoords: new Map(),
  };
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
  ctx.pushedPointCoords.set(id, [x, y, z]);
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
    // Prefer the stored world coords (the click hit is screen-projected and
    // may differ); fall back to hit coords if the point predates this session.
    const stored = ctx.pushedPointCoords.get(hit.existingPointId);
    return {
      id: hit.existingPointId,
      ref: ctx.objMap.get(hit.existingPointId),
      coords: stored ?? [hit.x3, hit.y3, hit.z3],
    };
  }
  return createPoint3D(ctx, hit.x3, hit.y3, hit.z3);
}

function finishPolygon(
  ctx: HandlerContext,
  points: PendingPoint[],
  extraAttrs: Record<string, unknown> = {},
): void {
  const id = ctx.nextId();
  const refs = points.map((p) => p.ref);
  const attrs = { id, ...extraAttrs };
  const ref = ctx.view.create('polygon3d', [refs], attrs);
  ctx.objMap.set(id, ref);
  ctx.pushLog({
    type: 'polygon3d',
    parents: [points.map((p) => refByPlaceholder(p.id))],
    attributes: attrs,
    id,
  });
}

function finishLineLike(
  ctx: HandlerContext,
  elType: Element3DType,
  points: PendingPoint[],
  extraAttrs: Record<string, unknown> = {},
): void {
  const id = ctx.nextId();
  const refs = points.map((p) => p.ref);
  const attrs = { id, ...extraAttrs };
  const ref = ctx.view.create(elType, refs, attrs);
  ctx.objMap.set(id, ref);
  ctx.pushLog({
    type: elType,
    parents: points.map((p) => refByPlaceholder(p.id)),
    attributes: attrs,
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
        // JSXGraph 3D has no `segment3d`; bound a `line3d` with straight* off for segment.
        // Explicit stroke + fixed to force visible render (default render is invisible
        // in view3d unless attrs are set — see Bug #9).
        const lineColor = ctx.isDark ? '#9ecbff' : '#0066cc';
        const baseAttrs: Record<string, unknown> = {
          strokeColor: lineColor,
          strokeWidth: 2,
          visible: true,
          fixed: true,
        };
        if (tool === 'segment') {
          baseAttrs.straightFirst = false;
          baseAttrs.straightLast = false;
        }
        finishLineLike(ctx, 'line3d', ctx.pendingPoints, baseAttrs);
        ctx.pendingPoints = [];
      }
      ctx.notify();
      return;
    }

    case 'plane': {
      const p = resolvePoint(ctx, hit);
      ctx.pendingPoints.push(p);
      if (ctx.pendingPoints.length === 3) {
        // plane3d in JSXGraph expects [point, direction1, direction2] but accepts
        // 3-point form for "plane through A, B, C".
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
      // JSXGraph 1.12 `text3d` requires `[[x,y,z], text]` or `[x,y,z,text]`; the
      // `[pointRef, text]` form silently renders empty. Anchor coords come from
      // the host point (we already have its world coords from createPoint3D log).
      // Points are immutable in this editor (no drag-edit) so static coords are
      // safe.
      const pointLog = ctx.pushedPointCoords.get(hit.existingPointId);
      if (!pointLog) return;
      const [x, y, z] = pointLog;
      const attrs: Record<string, unknown> = {
        id,
        fontSize: 14,
        strokeColor: ctx.isDark ? '#f5f5f5' : '#111111',
      };
      const ref = ctx.view.create('text3d', [x, y, z, text], attrs);
      ctx.objMap.set(id, ref);
      ctx.pushLog({
        type: 'text3d',
        parents: [x, y, z, text],
        attributes: attrs,
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
  // JSXGraph 1.12 `polyhedron3d` API requires `[vertices[], faceIndices[]]` (coords
  // + index arrays) — the previous `[facesAsPointRefs]` form throws `Cannot read
  // 'length' of undefined` at runtime. Emit one `polygon3d` per face instead;
  // polygon3d is proven to render (triangle test) and round-trips cleanly through
  // the existing render.ts path. See Bug #7.
  const faceColor = ctx.isDark ? 'rgba(150, 180, 220, 0.35)' : 'rgba(60, 120, 200, 0.25)';
  const edgeColor = ctx.isDark ? '#9ecbff' : '#0066cc';
  for (const face of faces) {
    finishPolygon(ctx, face, {
      fillColor: faceColor,
      fillOpacity: 1,
      strokeColor: edgeColor,
      strokeWidth: 1.5,
      visible: true,
    });
  }
}

const CURVED_SEGMENTS = 16;

export function handleCurvedStep(
  ctx: HandlerContext,
  tool: GeomTool3D,
  hit: ClickHit,
): void {
  switch (tool) {
    case 'sphere': {
      const radius = ctx.promptNumber('Bán kính mặt cầu');
      if (radius == null) return;
      const center = resolvePoint(ctx, hit);
      const id = ctx.nextId();
      const ref = ctx.view.create('sphere3d', [center.ref, radius], { id });
      ctx.objMap.set(id, ref);
      ctx.pushLog({
        type: 'sphere3d',
        parents: [refByPlaceholder(center.id), radius],
        attributes: { id },
        id,
      });
      ctx.notify();
      return;
    }

    case 'cone': {
      const baseDone = ctx.pendingFlags.coneBaseDone === true;
      if (!baseDone) {
        const radius = ctx.promptNumber('Bán kính đáy');
        if (radius == null) return;
        const center = resolvePoint(ctx, hit);
        ctx.pendingFlags.coneCenter = center;
        ctx.pendingFlags.coneRadius = radius;
        ctx.pendingFlags.coneBaseDone = true;
        ctx.notify();
        return;
      }
      // Second click = apex
      const center = ctx.pendingFlags.coneCenter as PendingPoint;
      const radius = ctx.pendingFlags.coneRadius as number;
      const apex = createPoint3D(ctx, hit.x3, hit.y3, hit.z3);
      const [cx, cy, cz] = center.coords;
      const basePoints: PendingPoint[] = [];
      for (let i = 0; i < CURVED_SEGMENTS; i++) {
        const theta = (i / CURVED_SEGMENTS) * Math.PI * 2;
        basePoints.push(
          createPoint3D(
            ctx,
            cx + radius * Math.cos(theta),
            cy + radius * Math.sin(theta),
            cz,
          ),
        );
      }
      const faces: PendingPoint[][] = [basePoints];
      for (let i = 0; i < CURVED_SEGMENTS; i++) {
        faces.push([basePoints[i], basePoints[(i + 1) % CURVED_SEGMENTS], apex]);
      }
      finishPolyhedron(ctx, faces);
      ctx.pendingFlags.coneBaseDone = false;
      ctx.pendingFlags.coneCenter = undefined;
      ctx.pendingFlags.coneRadius = undefined;
      ctx.notify();
      return;
    }

    case 'cylinder': {
      const radius = ctx.promptNumber('Bán kính đáy');
      if (radius == null) return;
      const height = ctx.promptNumber('Chiều cao (theo trục z)');
      if (height == null) return;
      const center = resolvePoint(ctx, hit);
      const [cx, cy, cz] = center.coords;
      const basePoints: PendingPoint[] = [];
      const topPoints: PendingPoint[] = [];
      for (let i = 0; i < CURVED_SEGMENTS; i++) {
        const theta = (i / CURVED_SEGMENTS) * Math.PI * 2;
        basePoints.push(
          createPoint3D(
            ctx,
            cx + radius * Math.cos(theta),
            cy + radius * Math.sin(theta),
            cz,
          ),
        );
        topPoints.push(
          createPoint3D(
            ctx,
            cx + radius * Math.cos(theta),
            cy + radius * Math.sin(theta),
            cz + height,
          ),
        );
      }
      const faces: PendingPoint[][] = [basePoints, topPoints];
      for (let i = 0; i < CURVED_SEGMENTS; i++) {
        const next = (i + 1) % CURVED_SEGMENTS;
        faces.push([basePoints[i], basePoints[next], topPoints[next], topPoints[i]]);
      }
      finishPolyhedron(ctx, faces);
      ctx.notify();
      return;
    }

    // 'solidofrevolution' removed in 0.6.1 — `solidofrevolution3d` is not a valid
    // JSXGraph 1.12.2 element. See Bug #8.
    default:
      return;
  }
}

// Helpers exported for B8/B9 to reuse
export {
  createPoint3D,
  resolvePoint,
  refByPlaceholder,
  finishPolygon,
  finishLineLike,
};
