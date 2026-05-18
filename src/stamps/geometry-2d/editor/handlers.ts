/**
 * handlers.ts — Pure pointer/tool handler functions extracted from MiniBoard.tsx.
 *
 * Each function receives a HandlerCtx object containing the refs and callbacks
 * it needs, and a raw JSXGraph event object. No React, no DOM manipulation
 * beyond what JSXGraph provides through its API.
 *
 * The ctx pattern lets MiniBoard.tsx pass a stable object reference captured
 * at useEffect time, while the individual properties stay up-to-date because
 * they are refs (whose .current is read at call time) or stable callbacks
 * (whose identities don't change across renders).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

import { TOOLS, objKind, type GeomTool, type ToolDef } from './tools';
import { buildTransformSpec } from './transforms';
import { safeJsx } from '../../shared/safeJsx';

// ─── Context shape ────────────────────────────────────────────────────────────

export interface HandlerCtx {
  // Refs (read .current at call time)
  boardRef: { current: JxgObj };
  toolRef: { current: GeomTool };
  pendingRef: { current: JxgObj[] };
  previewSegRef: { current: JxgObj[] };
  axisObjsRef: { current: { x?: JxgObj; y?: JxgObj } };
  selectedSetRef: { current: Set<JxgObj> };
  marqueeRef: { current: { startSx: number; startSy: number; rect?: JxgObj } | null };
  moveDownRef: { current: { sx: number; sy: number } | null };
  lastMoveClickRef: { current: { obj: JxgObj | null; time: number } };
  pendingTransformRef: { current: { tool: 'rotate' | 'dilate' | 'regularPolygon'; source: JxgObj; center: JxgObj; anchorScreen: { x: number; y: number } } | null };
  phantomRef: { current: JxgObj };
  previewShapeRef: { current: JxgObj };
  previewRafRef: { current: number | null };
  jxgRef: { current: JxgObj };

  // Stable callbacks (identity doesn't change)
  screenCoordsOf: (evt: JxgObj) => [number, number] | null;
  objectsAt: (evt: JxgObj) => JxgObj[];
  promoteLabel: (o: JxgObj) => JxgObj;
  findNearestPoint: (evt: JxgObj, tolPx?: number) => JxgObj | null;
  toggleSelect: (obj: JxgObj, additive: boolean) => void;
  clearSelection: () => void;
  applySelectionStyle: (obj: JxgObj) => void;
  localIdOf: (obj: JxgObj) => string | null;
  nextLabel: () => string;
  create: (type: string, args: unknown[], attrs?: Record<string, unknown>) => JxgObj;
  finalize: (toolDef: ToolDef, picks: JxgObj[]) => void;
  finalizeTransformCreate: (spec: Parameters<typeof buildTransformSpec>[0] extends never ? never : ReturnType<typeof buildTransformSpec>, source: JxgObj) => void;
  clearPending: () => void;
  clearPreviewSegs: () => void;
  refreshPreview: () => void;
  flashWarn: (msg: string) => void;
  emitTransform: (info: { tool: 'rotate' | 'dilate' | 'regularPolygon'; anchor: { x: number; y: number } } | null) => void;
  snapshotObject: (obj: unknown, anchorScreen: { x: number; y: number }) => unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emitSelect: (snap: any) => void;
  setPendingCount: (n: number) => void;
  setSelectionTick: (fn: (t: number) => number) => void;
}

// ─── board.on('down') ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleDown(ctx: HandlerCtx, e: any): void {
  if (!ctx.boardRef.current) return;
  const t = ctx.toolRef.current;
  if (t === 'move') {
    const sc = ctx.screenCoordsOf(e);
    if (!sc) return;
    const [sx, sy] = sc;
    ctx.moveDownRef.current = { sx, sy };
    return;
  }
  if (t === 'select') {
    const sc = ctx.screenCoordsOf(e);
    if (!sc) return;
    const [sx, sy] = sc;
    const hits = ctx.objectsAt(e)
      .map(ctx.promoteLabel)
      .filter((o) => o !== ctx.axisObjsRef.current.x && o !== ctx.axisObjsRef.current.y);
    // Ưu tiên điểm: exact hit → nearest-within-12px → mới đến hit khác (line/circle).
    // Tránh case click hơi lệch điểm mà line đi qua đó cướp mất pick.
    const obj = hits.find((o) => objKind(o) === 'point') ?? ctx.findNearestPoint(e, 12) ?? hits[0];
    if (obj) {
      const shift = !!(e.shiftKey || e.altKey);
      ctx.toggleSelect(obj, shift);
      // Stash so 'up' handler doesn't treat this as a marquee end.
      ctx.moveDownRef.current = { sx, sy };
      ctx.marqueeRef.current = null;
      return;
    }
    // Empty space: start marquee. We disable board pan while marqueeing
    // by not setting moveDownRef (board's internal pan listener relies on
    // it being null elsewhere; here we record marquee start separately).
    ctx.marqueeRef.current = { startSx: sx, startSy: sy };
    // Clear current selection unless shift is held (additive marquee).
    if (!(e.shiftKey || e.altKey)) ctx.clearSelection();
    return;
  }
  const toolDef = TOOLS.find((td) => td.key === t);
  if (!toolDef) return;

  const coords = ctx.boardRef.current.getUsrCoordsOfMouse(e);
  const x = coords[0], y = coords[1];

  // Detect if click hits any existing object (snap target). Text labels
  // are promoted to their owning element so a click on the "A" label
  // counts as a click on the point A.
  const hits = ctx.objectsAt(e)
    .map(ctx.promoteLabel)
    .filter((o) => o !== ctx.axisObjsRef.current.x && o !== ctx.axisObjsRef.current.y);
  // Prefer points over other elements when present
  const bestHit: JxgObj | null = hits.find((o) => objKind(o) === 'point') ?? hits[0] ?? null;
  // Generous fallback used when a slot expects a point: JSXGraph's `hasPoint`
  // for a small point is ~3px which is too tight for clicking, so we look up
  // the nearest existing point within 12px. Only applied where the active
  // tool slot needs a point — otherwise we'd shadow valid line/circle hits.
  const snapPointForPointSlot = (): JxgObj | null =>
    bestHit && objKind(bestHit) === 'point' ? bestHit : ctx.findNearestPoint(e, 12);

  // Tool: point — nếu click trúng ≥2 đường/đường tròn → tạo giao điểm
  // ràng buộc (khi kéo các đường, điểm này luôn là giao). Trường hợp 1
  // đường + click thường vẫn tạo điểm tự do (không glide để tránh ràng
  // buộc ngoài ý muốn).
  if (t === 'point') {
    const curves = hits.filter((o) => objKind(o) === 'line' || objKind(o) === 'circle');
    if (curves.length >= 2) {
      const a = curves[0];
      const b = curves[1];
      const aId = ctx.localIdOf(a);
      const bId = ctx.localIdOf(b);
      if (aId && bId) {
        const name = ctx.nextLabel();
        const attrs = { name, color: '@stroke', size: 3, fillColor: '@stroke', strokeColor: '@stroke' };
        try {
          // intersection trả về element [obj1, obj2] với giao gần (x, y).
          // JSXGraph cần index i (0 hoặc 1) cho trường hợp 2 giao (line-circle, circle-circle).
          // Chọn index dựa vào điểm gần click hơn.
          const isLineLine = objKind(a) === 'line' && objKind(b) === 'line';
          if (isLineLine) {
            ctx.create('intersection', [aId, bId, 0], attrs);
          } else {
            // Thử cả 2 index, chọn cái gần click hơn
            const tmp0 = ctx.boardRef.current.create('intersection', [a, b, 0], { visible: false, withLabel: false });
            const tmp1 = ctx.boardRef.current.create('intersection', [a, b, 1], { visible: false, withLabel: false });
            const d0 = Math.hypot((tmp0.X?.() ?? 0) - x, (tmp0.Y?.() ?? 0) - y);
            const d1 = Math.hypot((tmp1.X?.() ?? 0) - x, (tmp1.Y?.() ?? 0) - y);
            safeJsx('handlers.removeObject(intersect.tmp0)', () => ctx.boardRef.current.removeObject(tmp0));
            safeJsx('handlers.removeObject(intersect.tmp1)', () => ctx.boardRef.current.removeObject(tmp1));
            const idx = d0 <= d1 ? 0 : 1;
            ctx.create('intersection', [aId, bId, idx], attrs);
          }
          return;
        } catch {
          // fallback: tạo điểm tự do
        }
      }
    }
    const name = ctx.nextLabel();
    ctx.create('point', [x, y], { name, color: '@stroke', size: 3, fillColor: '@stroke', strokeColor: '@stroke' });
    return;
  }

  // Edit / single-target tools (toggleLabel, toggleVisible, delete)
  if (toolDef.needs === 1 && toolDef.accepts) {
    // Fall back to generous point snap if hasPoint missed a small point.
    const hit = bestHit ?? ctx.findNearestPoint(e, 12);
    if (hit) ctx.finalize(toolDef, [hit]);
    else ctx.flashWarn('Click vào một đối tượng để áp dụng');
    return;
  }

  // Polygon / area: variable-length, close on click near starting point
  if (toolDef.needs === -1) {
    const snappedPoint = snapPointForPointSlot();
    // Close ring first: if user clicks back on the first pending point
    // (with at least 3 points already), finalize. Done before push so the
    // first point isn't duplicated into pending.
    if (ctx.pendingRef.current.length >= 3 && snappedPoint && snappedPoint === ctx.pendingRef.current[0]) {
      ctx.clearPreviewSegs();
      ctx.finalize(toolDef, ctx.pendingRef.current);
      ctx.clearPending();
      return;
    }
    // Reject re-picking an interior pending vertex (would create a degenerate edge).
    if (snappedPoint && ctx.pendingRef.current.includes(snappedPoint)) {
      ctx.flashWarn('Đỉnh này đã có — click điểm khác hoặc click lại điểm đầu để đóng');
      return;
    }
    // Otherwise pick (snap-to-existing or create) a new vertex
    const pick: JxgObj = snappedPoint ?? (() => {
      const name = ctx.nextLabel();
      return ctx.create('point', [x, y], { name, color: '@stroke', size: 3 });
    })();
    // Live preview: draw an edge from the previous pending vertex to
    // this new one so the user sees the polygon being built.
    if (ctx.pendingRef.current.length > 0 && ctx.boardRef.current) {
      const prev = ctx.pendingRef.current[ctx.pendingRef.current.length - 1];
      safeJsx('handlers.createPreviewSegment', () => {
        const seg = ctx.boardRef.current.create('segment', [prev, pick], {
          strokeColor: '#3b82f6',
          strokeWidth: 1.5,
          strokeOpacity: 0.75,
          fixed: true,
          highlight: false,
          withLabel: false,
        });
        ctx.previewSegRef.current.push(seg);
      });
    }
    ctx.pendingRef.current.push(pick);
    ctx.setPendingCount(ctx.pendingRef.current.length);
    return;
  }

  // Multi-click branch. Two sub-modes:
  //   A) Strict + order-flexible: tool declared `accepts`. We bind each
  //      click to whatever required kind is still unfilled, regardless
  //      of click order. E.g. perpendicular accepts ['point', 'line']
  //      and the user can click line-then-point or point-then-line.
  //   B) Lenient + order-fixed: tool has no `accepts` (segment, line,
  //      ray, vector, circle*, ...). All slots want points; missing
  //      snaps create a fresh point.
  let pick: JxgObj | null = null;

  if (toolDef.accepts) {
    // --- Mode A: strict, order-flexible ---
    const usedKinds = ctx.pendingRef.current.map((p) => objKind(p));
    const remaining: Array<'point' | 'line' | 'circle' | 'any'> = [...toolDef.accepts];
    for (const u of usedKinds) {
      if (u === 'other') continue;
      const i = remaining.indexOf(u);
      if (i >= 0) remaining.splice(i, 1);
    }
    const strictPoint = hits.find((o) => objKind(o) === 'point') ?? null;
    const lineHit = hits.find((o) => objKind(o) === 'line') ?? null;
    const circleHit = hits.find((o) => objKind(o) === 'circle') ?? null;
    // Priority: an exact point hit binds to 'point' first (so a click
    // landing right on a vertex isn't stolen by a line/circle passing
    // through it). Typed line/circle bind next. 'any' slot accepts any
    // remaining hit (point/line/circle). Generous point-snap is the
    // last resort when only a 'point' slot is open.
    //
    // Previously 'any' was checked AFTER the snap fallback for point,
    // which meant tools like dilate (accepts ['any', 'point']) couldn't
    // pick a segment for the 'any' slot — the snap branch absorbed the
    // click and 'any' was never evaluated.
    if (remaining.includes('point') && strictPoint) pick = strictPoint;
    else if (remaining.includes('line') && lineHit) pick = lineHit;
    else if (remaining.includes('circle') && circleHit) pick = circleHit;
    else if (remaining.includes('any') && (strictPoint || lineHit || circleHit)) {
      pick = strictPoint ?? lineHit ?? circleHit;
    } else if (remaining.includes('point')) {
      const near = ctx.findNearestPoint(e, 12);
      if (near) pick = near;
    }
    if (!pick) {
      const needs = remaining.map((k) =>
        k === 'point' ? 'một điểm' : k === 'line' ? 'một đường/đoạn' : k === 'circle' ? 'một đường tròn' : 'một đối tượng',
      );
      ctx.flashWarn(`Còn cần click vào ${needs.join(' + ')} có sẵn`);
      return;
    }
    // Reject duplicate picks (e.g. click the same point twice for midpoint
    // would produce a degenerate object pointing at itself).
    if (ctx.pendingRef.current.includes(pick)) {
      ctx.flashWarn('Đã chọn đối tượng này — chọn đối tượng khác');
      return;
    }
  } else {
    // --- Mode B: lenient, all slots want a point ---
    const snapped = snapPointForPointSlot();
    if (snapped && ctx.pendingRef.current.includes(snapped)) {
      // Same point clicked twice → would produce a zero-length segment / etc.
      ctx.flashWarn('Đã chọn điểm này — chọn điểm khác hoặc click chỗ trống');
      return;
    }
    if (snapped) pick = snapped;
    else {
      const name = ctx.nextLabel();
      pick = ctx.create('point', [x, y], { name, color: '@stroke', size: 3, fillColor: '@stroke', strokeColor: '@stroke' });
    }
  }

  if (!pick) return;
  ctx.pendingRef.current.push(pick);
  ctx.setPendingCount(ctx.pendingRef.current.length);

  if (ctx.pendingRef.current.length >= toolDef.needs) {
    const tk = toolDef.key;
    if (tk === 'rotate' || tk === 'dilate') {
      const source = ctx.pendingRef.current[0];
      const center = ctx.pendingRef.current[1];
      const cx = ((e.clientX ?? 0) as number) + 8;
      const cy = ((e.clientY ?? 0) as number) + 8;
      ctx.pendingTransformRef.current = { tool: tk, source, center, anchorScreen: { x: cx, y: cy } };
      ctx.emitTransform({ tool: tk, anchor: { x: cx, y: cy } });
      // Don't clearPending here — wait for confirm/cancel
      return;
    }
    if (tk === 'regularPolygon') {
      const p1 = ctx.pendingRef.current[0];
      const p2 = ctx.pendingRef.current[1];
      const cx = ((e.clientX ?? 0) as number) + 8;
      const cy = ((e.clientY ?? 0) as number) + 8;
      ctx.pendingTransformRef.current = { tool: tk, source: p1, center: p2, anchorScreen: { x: cx, y: cy } };
      ctx.emitTransform({ tool: tk, anchor: { x: cx, y: cy } });
      return;
    }
    if (tk === 'translate') {
      const source = ctx.pendingRef.current[0];
      const spec = buildTransformSpec({ kind: 'translate', vectorPoints: [ctx.pendingRef.current[1], ctx.pendingRef.current[2]] });
      ctx.finalizeTransformCreate(spec, source);
      ctx.clearPending();
      return;
    }
    if (tk === 'reflectLine') {
      const source = ctx.pendingRef.current[0];
      const spec = buildTransformSpec({ kind: 'reflectLine', line: ctx.pendingRef.current[1] });
      ctx.finalizeTransformCreate(spec, source);
      ctx.clearPending();
      return;
    }
    if (tk === 'reflectPoint') {
      const source = ctx.pendingRef.current[0];
      const spec = buildTransformSpec({ kind: 'reflectPoint', center: ctx.pendingRef.current[1] });
      ctx.finalizeTransformCreate(spec, source);
      ctx.clearPending();
      return;
    }
    ctx.finalize(toolDef, ctx.pendingRef.current);
    ctx.clearPending();
  } else {
    ctx.refreshPreview();
  }
}

// ─── board.on('up') ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleUp(ctx: HandlerCtx, e: any): void {
  const t = ctx.toolRef.current;
  if (t === 'select') {
    // Finalize marquee: any object hit-tested inside the rectangle gets
    // added to the selection. Single click on object was already handled
    // in `down`; here we only care about drag end.
    const mq = ctx.marqueeRef.current;
    ctx.marqueeRef.current = null;
    ctx.moveDownRef.current = null;
    if (!mq) return;
    const sc = ctx.screenCoordsOf(e);
    if (!sc) return;
    const [ex, ey] = sc;
    if (mq.rect) { safeJsx('handlers.removeObject(marquee.rect)', () => ctx.boardRef.current?.removeObject(mq.rect)); }
    if (Math.hypot(ex - mq.startSx, ey - mq.startSy) < 4) return;  // not a real drag
    const x1 = Math.min(mq.startSx, ex), x2 = Math.max(mq.startSx, ex);
    const y1 = Math.min(mq.startSy, ey), y2 = Math.max(mq.startSy, ey);
    const board = ctx.boardRef.current;
    if (!board) return;
    const list = (board.objectsList || []) as JxgObj[];
    for (const o of list) {
      if (o === ctx.axisObjsRef.current.x || o === ctx.axisObjsRef.current.y) continue;
      // Points: include if their screen coord falls inside the rect.
      const kind = objKind(o);
      if (kind === 'point') {
        const pc = o.coords?.scrCoords;
        if (!pc) continue;
        if (pc[1] >= x1 && pc[1] <= x2 && pc[2] >= y1 && pc[2] <= y2) {
          if (!ctx.selectedSetRef.current.has(o)) {
            ctx.selectedSetRef.current.add(o);
            ctx.applySelectionStyle(o);
          }
        }
      }
      // Lines/segments/circles: simple test — include if either defining
      // point falls inside (good enough for marquee UX without doing
      // expensive line-rectangle intersections).
      else if (kind === 'line' || kind === 'circle') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const defs: any[] = [o.point1, o.point2, o.center, o.midpoint, o.point3].filter(Boolean);
        const anyInside = defs.some((p) => {
          const pc = p?.coords?.scrCoords;
          return pc && pc[1] >= x1 && pc[1] <= x2 && pc[2] >= y1 && pc[2] <= y2;
        });
        if (anyInside && !ctx.selectedSetRef.current.has(o)) {
          ctx.selectedSetRef.current.add(o);
          ctx.applySelectionStyle(o);
        }
      }
    }
    ctx.setSelectionTick((tt) => tt + 1);
    safeJsx('handlers.board.update(marquee)', () => board.update());
    return;
  }
  if (t !== 'move') return;
  const start = ctx.moveDownRef.current;
  ctx.moveDownRef.current = null;
  if (!start) return;
  const sc = ctx.screenCoordsOf(e);
  if (!sc) return;
  const [sx, sy] = sc;
  const moved = Math.hypot(sx - start.sx, sy - start.sy);
  if (moved > 4) return;  // drag, không phải click
  const hits = ctx.objectsAt(e)
    .map(ctx.promoteLabel)
    .filter((o) => o !== ctx.axisObjsRef.current.x && o !== ctx.axisObjsRef.current.y);
  // Ưu tiên điểm (exact → nearest-within-12px) trước, rồi mới fallback object
  // khác (line/circle). Đảm bảo double-click gần một điểm sẽ mở properties cho
  // điểm đó kể cả khi có line đi sát qua.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const best: any = hits.find((o) => objKind(o) === 'point') ?? ctx.findNearestPoint(e, 12) ?? hits[0];
  if (!best) {
    ctx.lastMoveClickRef.current = { obj: null, time: 0 };
    return;
  }
  const now = Date.now();
  const isDouble = ctx.lastMoveClickRef.current.obj === best && (now - ctx.lastMoveClickRef.current.time) < 400;
  ctx.lastMoveClickRef.current = { obj: best, time: now };
  if (!isDouble) return;
  const cx = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) as number;
  const cy = (e.clientY ?? e.touches?.[0]?.clientY ?? 0) as number;
  const snap = ctx.snapshotObject(best, { x: cx + 8, y: cy + 8 });
  if (snap) ctx.emitSelect(snap);
}

// ─── board.on('move') ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleMove(ctx: HandlerCtx, e: any): void {
  // Marquee rectangle redraw while user drags with the select tool on empty space.
  if (ctx.toolRef.current === 'select' && ctx.marqueeRef.current) {
    const sc = ctx.screenCoordsOf(e);
    if (sc && ctx.boardRef.current) {
      const [sx, sy] = sc;
      const { startSx, startSy } = ctx.marqueeRef.current;
      // Convert screen px to user coords for JSXGraph polygon overlay.
      const b = ctx.boardRef.current;
      const ux1 = b.screenCoords2userCoords?.([Math.min(startSx, sx), Math.min(startSy, sy)]) ?? null;
      const ux2 = b.screenCoords2userCoords?.([Math.max(startSx, sx), Math.max(startSy, sy)]) ?? null;
      // JSXGraph internal: getUsrCoordsByScreenCoords may not exist; fall
      // back to using a known board API.
      const toUsr = (px: number, py: number): [number, number] => {
        // Coords.getMouseCoordinates equivalent — use board.origin + unitX/Y.
        const ox = b.origin?.scrCoords?.[1] ?? 0;
        const oy = b.origin?.scrCoords?.[2] ?? 0;
        const ux = (px - ox) / b.unitX;
        const uy = (oy - py) / b.unitY;
        return [ux, uy];
      };
      const [x1u, y1u] = ux1 && ux1.length >= 2 ? [ux1[0], ux1[1]] : toUsr(Math.min(startSx, sx), Math.min(startSy, sy));
      const [x2u, y2u] = ux2 && ux2.length >= 2 ? [ux2[0], ux2[1]] : toUsr(Math.max(startSx, sx), Math.max(startSy, sy));
      const rect = ctx.marqueeRef.current.rect;
      if (rect) {
        safeJsx('handlers.removeObject(marquee.prevRect)', () => ctx.boardRef.current.removeObject(rect));
      }
      safeJsx('handlers.createMarqueePolygon', () => {
        ctx.marqueeRef.current!.rect = ctx.boardRef.current.create('polygon', [
          [x1u, y1u], [x2u, y1u], [x2u, y2u], [x1u, y2u],
        ], {
          fillColor: '#06b6d4', fillOpacity: 0.08,
          borders: { strokeColor: '#06b6d4', strokeWidth: 1, dash: 2 },
          vertices: { visible: false },
          fixed: true, highlight: false, withLabel: false,
        });
      });
    }
    return;
  }
  const ph = ctx.phantomRef.current;
  if (!ph || !ctx.boardRef.current) return;
  if (ctx.previewRafRef.current != null) return;
  ctx.previewRafRef.current = requestAnimationFrame(() => {
    ctx.previewRafRef.current = null;
    if (!ctx.boardRef.current || !ctx.phantomRef.current) return;
    safeJsx('handlers.phantomMove', () => {
      const coords = ctx.boardRef.current.getUsrCoordsOfMouse(e);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const JXG: any = ctx.jxgRef.current;
      if (!JXG) return;
      ctx.phantomRef.current.setPositionDirectly(JXG.COORDS_BY_USER, [coords[0], coords[1]]);
      ctx.boardRef.current.update();
    });
  });
}
