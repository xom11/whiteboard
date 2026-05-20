/**
 * handlers.ts — Pure pointer/tool handler functions extracted from MiniBoard.tsx.
 *
 * Sau Sub-PR 2.3.2 (Scene v2): handlers dispatch `ADD`/`DELETE`/`UPDATE_ATTRS`
 * action vào `core/scene` Store thay vì gọi `ctx.create()` trực tiếp lên
 * JSXGraph. JxgRenderer subscribe Store và render board → handlers truy cập
 * JxgObj qua `ctx.jxgFromSceneId(id)` khi cần (vd: live preview segment).
 *
 * Pending objects vẫn lưu cặp: `pendingRef` (JxgObj — cho hits line/circle ở
 * tool transform/perpendicular) + `pendingIdsRef` (scene id tương ứng).
 *
 * Selection lưu theo scene id (`selectedSetRef`), MiniBoard nghe Store +
 * selection để re-apply style.
 *
 * Transform tools (rotate/dilate/translate/reflectLine/reflectPoint/regularPolygon):
 * handlers chỉ emit info qua `emitTransform`; finalize logic chuyển sang
 * MiniBoard (sub-PR 2.3.3+).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

import { TOOLS, objKind, type GeomTool, type ToolDef } from './tools';
import { safeJsx } from '../../shared/safeJsx';
import type { Store } from '../../../core/scene';
import { getDefiningPoints } from './transforms';
import type { TransformDef } from '../../../core/scene/kinds/2d-constraint';

// ─── Context shape ────────────────────────────────────────────────────────────

export interface HandlerCtx {
  // Refs (read .current at call time)
  boardRef: { current: JxgObj };
  toolRef: { current: GeomTool };
  pendingRef: { current: JxgObj[] };          // pending JXG objects (line/circle hits)
  pendingIdsRef: { current: string[] };       // scene ids tương ứng (point hits / create)
  previewSegRef: { current: JxgObj[] };
  axisObjsRef: { current: { x?: JxgObj; y?: JxgObj } };
  selectedSetRef: { current: Set<string> };   // scene id
  marqueeRef: { current: { startSx: number; startSy: number; rect?: JxgObj } | null };
  moveDownRef: { current: { sx: number; sy: number } | null };
  lastMoveClickRef: { current: { id: string | null; time: number } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pendingTransformRef: { current: any };
  phantomRef: { current: JxgObj };
  previewShapeRef: { current: JxgObj };
  previewRafRef: { current: number | null };
  jxgRef: { current: JxgObj };

  // Store-bound callbacks
  store: Store;
  jxgIdToSceneId: (jxgObj: JxgObj) => string | null;
  jxgFromSceneId: (id: string) => JxgObj;

  // Stable callbacks (identity doesn't change)
  screenCoordsOf: (evt: JxgObj) => [number, number] | null;
  objectsAt: (evt: JxgObj) => JxgObj[];
  promoteLabel: (o: JxgObj) => JxgObj;
  findNearestPointJxg: (evt: JxgObj, tolPx?: number) => JxgObj | null;
  toggleSelect: (id: string, additive: boolean) => void;
  clearSelection: () => void;
  nextLabel: (kind: string) => string;
  clearPending: () => void;
  clearPreviewSegs: () => void;
  refreshPreview: () => void;
  flashWarn: (msg: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emitTransform: (info: any | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emitSelect: (snap: any) => void;
  setPendingCount: (n: number) => void;
  setSelectionTick: (fn: (t: number) => number) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type SceneObj = {
  id: string;
  kind: string;
  label: string;
  visible: boolean;
  locked: boolean;
  layer: string;
  schemaVersion: number;
  attrs: Record<string, unknown>;
};

function freshId(ctx: HandlerCtx, prefix: string): string {
  const counter = ctx.store.getState().counter;
  // Loop until unique (counter is monotonic but ids may have been deleted/reused
  // in non-trivial scenarios; safer to probe).
  let n = counter + 1;
  let id = `${prefix}_${n}`;
  const objs = ctx.store.getState().objects;
  while (id in objs) {
    n += 1;
    id = `${prefix}_${n}`;
  }
  return id;
}

function mkSceneObj(id: string, kind: string, label: string, attrs: Record<string, unknown>): SceneObj {
  return {
    id,
    kind,
    label,
    visible: true,
    locked: false,
    layer: 'default',
    schemaVersion: 1,
    attrs,
  };
}

/** Tạo point free + dispatch ADD; trả về scene id mới. */
function dispatchAddFreePoint(ctx: HandlerCtx, x: number, y: number): string {
  const id = freshId(ctx, 'p');
  const label = ctx.nextLabel('point');
  const obj = mkSceneObj(id, 'point', label, { constraint: { kind: 'free', x, y } });
  ctx.store.dispatch({ type: 'ADD', payload: { obj } });
  return id;
}

/** Tạo intersection point + dispatch ADD; trả về scene id mới. */
function dispatchAddIntersection(
  ctx: HandlerCtx,
  attrs: Record<string, unknown>,
): string {
  const id = freshId(ctx, 'X');
  const label = ctx.nextLabel('intersection');
  const obj = mkSceneObj(id, 'intersection', label, attrs);
  ctx.store.dispatch({ type: 'ADD', payload: { obj } });
  return id;
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
    const obj = hits.find((o) => objKind(o) === 'point') ?? ctx.findNearestPointJxg(e, 12) ?? hits[0];
    if (obj) {
      const sid = ctx.jxgIdToSceneId(obj);
      if (sid) {
        const shift = !!(e.shiftKey || e.altKey);
        ctx.toggleSelect(sid, shift);
      }
      ctx.moveDownRef.current = { sx, sy };
      ctx.marqueeRef.current = null;
      return;
    }
    // Empty space: start marquee.
    ctx.marqueeRef.current = { startSx: sx, startSy: sy };
    if (!(e.shiftKey || e.altKey)) ctx.clearSelection();
    return;
  }
  const toolDef = TOOLS.find((td) => td.key === t);
  if (!toolDef) return;

  const coords = ctx.boardRef.current.getUsrCoordsOfMouse(e);
  const x = coords[0], y = coords[1];

  // Detect if click hits any existing object (snap target).
  const hits = ctx.objectsAt(e)
    .map(ctx.promoteLabel)
    .filter((o) => o !== ctx.axisObjsRef.current.x && o !== ctx.axisObjsRef.current.y);
  const bestHit: JxgObj | null = hits.find((o) => objKind(o) === 'point') ?? hits[0] ?? null;
  const snapPointForPointSlot = (): JxgObj | null =>
    bestHit && objKind(bestHit) === 'point' ? bestHit : ctx.findNearestPointJxg(e, 12);

  // Tool: point — nếu click trúng ≥2 đường/đường tròn → tạo intersection point
  if (t === 'point') {
    const curves = hits.filter((o) => objKind(o) === 'line' || objKind(o) === 'circle');
    if (curves.length >= 2) {
      const a = curves[0];
      const b = curves[1];
      const aId = ctx.jxgIdToSceneId(a);
      const bId = ctx.jxgIdToSceneId(b);
      if (aId && bId) {
        try {
          const aKind = objKind(a);
          const bKind = objKind(b);
          if (aKind === 'line' && bKind === 'line') {
            dispatchAddIntersection(ctx, { kind: 'lineLine', ref1: aId, ref2: bId });
            return;
          }
          // line-circle / circle-circle: pick branch nearest click.
          const tmp0 = ctx.boardRef.current.create('intersection', [a, b, 0], { visible: false, withLabel: false });
          const tmp1 = ctx.boardRef.current.create('intersection', [a, b, 1], { visible: false, withLabel: false });
          const d0 = Math.hypot((tmp0.X?.() ?? 0) - x, (tmp0.Y?.() ?? 0) - y);
          const d1 = Math.hypot((tmp1.X?.() ?? 0) - x, (tmp1.Y?.() ?? 0) - y);
          safeJsx('handlers.removeObject(intersect.tmp0)', () => ctx.boardRef.current.removeObject(tmp0));
          safeJsx('handlers.removeObject(intersect.tmp1)', () => ctx.boardRef.current.removeObject(tmp1));
          const branch: 0 | 1 = d0 <= d1 ? 0 : 1;
          const isLineCircle = (aKind === 'line' && bKind === 'circle') || (aKind === 'circle' && bKind === 'line');
          if (isLineCircle) {
            dispatchAddIntersection(ctx, { kind: 'lineCircle', ref1: aId, ref2: bId, branch });
          } else {
            dispatchAddIntersection(ctx, { kind: 'circleCircle', ref1: aId, ref2: bId, branch });
          }
          return;
        } catch {
          // fallback: tạo điểm tự do
        }
      }
    }
    dispatchAddFreePoint(ctx, x, y);
    return;
  }

  // Edit / single-target tools (toggleLabel, toggleVisible, delete).
  if (toolDef.needs === 1 && toolDef.accepts) {
    const hit = bestHit ?? ctx.findNearestPointJxg(e, 12);
    if (!hit) {
      ctx.flashWarn('Click vào một đối tượng để áp dụng');
      return;
    }
    const sid = ctx.jxgIdToSceneId(hit);
    if (!sid) return;
    if (t === 'delete') {
      ctx.store.dispatch({ type: 'DELETE', payload: { id: sid } });
      return;
    }
    if (t === 'toggleLabel') {
      const obj = ctx.store.getState().objects[sid];
      if (!obj) return;
      const cur = (obj.attrs as { showLabel?: boolean }).showLabel;
      const next = !(cur ?? false);
      ctx.store.dispatch({ type: 'UPDATE_ATTRS', payload: { id: sid, patch: { showLabel: next } } });
      return;
    }
    if (t === 'toggleVisible') {
      const obj = ctx.store.getState().objects[sid];
      if (!obj) return;
      ctx.store.dispatch({ type: 'UPDATE', payload: { id: sid, patch: { visible: !obj.visible } } });
      return;
    }
    return;
  }

  // Polygon / area: variable-length, close on click near starting point.
  if (toolDef.needs === -1) {
    const snappedPoint = snapPointForPointSlot();
    const snappedId = snappedPoint ? ctx.jxgIdToSceneId(snappedPoint) : null;
    // Close ring: click back on first pending point.
    if (
      ctx.pendingIdsRef.current.length >= 3 &&
      snappedId &&
      snappedId === ctx.pendingIdsRef.current[0]
    ) {
      ctx.clearPreviewSegs();
      const vertices = ctx.pendingIdsRef.current.slice();
      const isArea = t === 'area';
      const id = freshId(ctx, isArea ? 'area' : 'poly');
      const label = ctx.nextLabel('polygon');
      // Tool 'area' = polygon + showValue + fill phân biệt visual với polygon
      // thường. JSXGraph polygon.Area() live-update khi đỉnh di chuyển.
      const attrs: Record<string, unknown> = { vertices };
      if (isArea) {
        attrs.showValue = true;
        attrs.fillOpacity = 0.18;
        attrs.color = '#1d4ed8';
      }
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'polygon', label, attrs) },
      });
      ctx.clearPending();
      return;
    }
    if (snappedId && ctx.pendingIdsRef.current.includes(snappedId)) {
      ctx.flashWarn('Đỉnh này đã có — click điểm khác hoặc click lại điểm đầu để đóng');
      return;
    }
    // Otherwise pick (snap-to-existing or create) a new vertex.
    let pickId: string | null = snappedId;
    let pickJxg: JxgObj | null = snappedPoint;
    if (!pickId) {
      pickId = dispatchAddFreePoint(ctx, x, y);
      pickJxg = ctx.jxgFromSceneId(pickId);
    }
    // Live preview segment from previous vertex to new pick.
    if (ctx.pendingRef.current.length > 0 && ctx.boardRef.current && pickJxg) {
      const prev = ctx.pendingRef.current[ctx.pendingRef.current.length - 1];
      safeJsx('handlers.createPreviewSegment', () => {
        const seg = ctx.boardRef.current.create('segment', [prev, pickJxg], {
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
    if (pickJxg) ctx.pendingRef.current.push(pickJxg);
    if (pickId) ctx.pendingIdsRef.current.push(pickId);
    ctx.setPendingCount(ctx.pendingIdsRef.current.length);
    return;
  }

  // Multi-click branch. Two sub-modes:
  //   A) Strict + order-flexible: tool declared `accepts`.
  //   B) Lenient + order-fixed: all slots want points.
  let pick: JxgObj | null = null;
  let pickId: string | null = null;

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
    if (remaining.includes('point') && strictPoint) pick = strictPoint;
    else if (remaining.includes('line') && lineHit) pick = lineHit;
    else if (remaining.includes('circle') && circleHit) pick = circleHit;
    else if (remaining.includes('any') && (strictPoint || lineHit || circleHit)) {
      pick = strictPoint ?? lineHit ?? circleHit;
    } else if (remaining.includes('point')) {
      const near = ctx.findNearestPointJxg(e, 12);
      if (near) pick = near;
    }
    if (!pick) {
      const needs = remaining.map((k) =>
        k === 'point' ? 'một điểm' : k === 'line' ? 'một đường/đoạn' : k === 'circle' ? 'một đường tròn' : 'một đối tượng',
      );
      ctx.flashWarn(`Còn cần click vào ${needs.join(' + ')} có sẵn`);
      return;
    }
    if (ctx.pendingRef.current.includes(pick)) {
      ctx.flashWarn('Đã chọn đối tượng này — chọn đối tượng khác');
      return;
    }
    pickId = ctx.jxgIdToSceneId(pick);
  } else {
    // --- Mode B: lenient, all slots want a point ---
    const snapped = snapPointForPointSlot();
    if (snapped && ctx.pendingRef.current.includes(snapped)) {
      ctx.flashWarn('Đã chọn điểm này — chọn điểm khác hoặc click chỗ trống');
      return;
    }
    if (snapped) {
      pick = snapped;
      pickId = ctx.jxgIdToSceneId(snapped);
    } else {
      pickId = dispatchAddFreePoint(ctx, x, y);
      pick = ctx.jxgFromSceneId(pickId);
    }
  }

  if (!pick) return;
  ctx.pendingRef.current.push(pick);
  if (pickId) ctx.pendingIdsRef.current.push(pickId);
  ctx.setPendingCount(ctx.pendingIdsRef.current.length);

  if (ctx.pendingIdsRef.current.length >= toolDef.needs) {
    const tk = toolDef.key;
    // 3 popover transform tools cần numeric input (góc / tỷ số / số cạnh) trước
    // khi finalize → emit info để MiniBoard show TransformParamPopover.
    if (tk === 'rotate' || tk === 'dilate' || tk === 'regularPolygon') {
      const cx = ((e.clientX ?? 0) as number) + 8;
      const cy = ((e.clientY ?? 0) as number) + 8;
      ctx.pendingTransformRef.current = {
        tool: tk,
        pendingIds: ctx.pendingIdsRef.current.slice(),
        anchorScreen: { x: cx, y: cy },
      };
      ctx.emitTransform({ tool: tk, anchor: { x: cx, y: cy } });
      // Don't clearPending — wait for confirm/cancel from MiniBoard.
      return;
    }
    // 3 no-popover transform tools (translate/reflectLine/reflectPoint):
    // finalize ngay khi đủ pick — không cần numeric param.
    if (tk === 'translate' || tk === 'reflectLine' || tk === 'reflectPoint') {
      finalizeTransform(ctx, tk, ctx.pendingIdsRef.current.slice(), 0);
      ctx.clearPending();
      return;
    }

    // Non-transform multi-click tools: dispatch ADD for the shape directly.
    finalizeShape(ctx, toolDef);
    ctx.clearPending();
  } else {
    ctx.refreshPreview();
  }
}

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

function finalizeShape(ctx: HandlerCtx, toolDef: ToolDef): void {
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
      const throughPoint = findPickIdByKind(ctx, 'point');
      const toCircle = findPickIdByKind(ctx, 'circle');
      if (!throughPoint || !toCircle) return;
      const id = freshId(ctx, 't');
      const label = ctx.nextLabel('line');
      ctx.store.dispatch({
        type: 'ADD',
        payload: { obj: mkSceneObj(id, 'line', label, {
          construction: { kind: 'tangent', throughPoint, toCircle },
        }) },
      });
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
    default:
      return;
  }
}

// ─── Transform finalize (entry for 5 transform tools + regularPolygon) ──────

export type TransformToolKey =
  | 'translate'
  | 'rotate'
  | 'reflectLine'
  | 'reflectPoint'
  | 'dilate'
  | 'regularPolygon';

/**
 * Hoàn tất một transform tool: tạo các point biến hình từ định nghĩa của source
 * + dựng lại object cùng kind từ các point đó. Cho regularPolygon thì path
 * khác: tạo polygon kind với construction 'regular'.
 *
 * `pendingIds` chứa tất cả pick theo thứ tự user click:
 *   - translate: [source, A, B]      — vector = B − A
 *   - rotate:    [source, center]    — value = góc°
 *   - reflectLine: [source, line]
 *   - reflectPoint: [source, center]
 *   - dilate:    [source, center]    — value = k
 *   - regularPolygon: [p1, p2]       — value = n cạnh
 *
 * `value` chỉ dùng cho rotate/dilate/regularPolygon; 0 cho 3 tool còn lại.
 */
export function finalizeTransform(
  ctx: HandlerCtx,
  tool: TransformToolKey,
  pendingIds: string[],
  value: number,
): void {
  if (tool === 'regularPolygon') {
    const n = Math.max(3, Math.round(value));
    const id = freshId(ctx, 'rpoly');
    const label = ctx.nextLabel('polygon');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'polygon', label, {
        construction: { kind: 'regular', p1: pendingIds[0], p2: pendingIds[1], n },
      }) },
    });
    return;
  }

  // 5 transform tools: pendingIds[0] = source object.
  const sourceId = pendingIds[0];
  const state = ctx.store.getState();
  const source = state.objects[sourceId];
  if (!source) {
    ctx.flashWarn('Đối tượng nguồn không còn');
    return;
  }
  const defining = getDefiningPoints(source, state);
  if (defining.length === 0) {
    ctx.flashWarn('Không thể biến đổi đối tượng này');
    return;
  }

  let transformDef: TransformDef | null = null;
  if (tool === 'translate') {
    // pendingIds = [source, A, B]; vector = B − A. Đọc toạ độ live qua JxgObj.
    const a = ctx.jxgFromSceneId(pendingIds[1]);
    const b = ctx.jxgFromSceneId(pendingIds[2]);
    if (!a || !b || typeof a.X !== 'function' || typeof b.X !== 'function') {
      ctx.flashWarn('Không đọc được toạ độ vector');
      return;
    }
    transformDef = { kind: 'translate', dx: b.X() - a.X(), dy: b.Y() - a.Y() };
  } else if (tool === 'rotate') {
    transformDef = { kind: 'rotate', angleRad: (value * Math.PI) / 180, center: pendingIds[1] };
  } else if (tool === 'reflectLine') {
    transformDef = { kind: 'reflectLine', line: pendingIds[1] };
  } else if (tool === 'reflectPoint') {
    transformDef = { kind: 'reflectPoint', center: pendingIds[1] };
  } else if (tool === 'dilate') {
    transformDef = { kind: 'dilate', k: value, center: pendingIds[1] };
  }
  if (!transformDef) return;

  // Tạo N transformed point + collect ids. Dispatch tuần tự (không gom vào
  // transaction) vì freshId/nextLabel cần đọc state đã commit để cấp id+label
  // không trùng. Trade-off: undo sẽ tách thành N+1 step thay vì 1.
  const newPointIds: string[] = [];
  for (const defId of defining) {
    const newId = freshId(ctx, 'p');
    const newLabel = ctx.nextLabel('point');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(newId, 'point', newLabel, {
        constraint: { kind: 'transformed', source: defId, transform: transformDef! },
        color: '#0ea5e9',
      }) },
    });
    newPointIds.push(newId);
  }
  // Tạo wrapper cùng kind từ N point mới (point thì không cần wrapper).
  recreateFromTransformedPoints(ctx, source, newPointIds);
}

/**
 * Dựng object cùng kind với source từ N point đã transform. Tuân thủ schema
 * attrs của kind tương ứng. Không hỗ trợ kind 'point' (đã có sẵn point biến
 * hình), 'intersection' / 'angle' / 'distance' (measurement — không có ý
 * nghĩa biến hình), 'circle' với construction circumscribed.
 */
function recreateFromTransformedPoints(
  ctx: HandlerCtx,
  source: { kind: string; attrs: Record<string, unknown> },
  pointIds: string[],
): void {
  const k = source.kind;
  if (k === 'point' || k === 'intersection') return;  // point đơn đã có sẵn

  if (k === 'segment' && pointIds.length === 2) {
    const id = freshId(ctx, 's');
    const label = ctx.nextLabel('segment');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'segment', label, { p1: pointIds[0], p2: pointIds[1], color: '#0ea5e9' }) },
    });
    return;
  }
  if (k === 'line' && pointIds.length === 2) {
    const id = freshId(ctx, 'l');
    const label = ctx.nextLabel('line');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'line', label, { p1: pointIds[0], p2: pointIds[1], color: '#0ea5e9' }) },
    });
    return;
  }
  if (k === 'ray' && pointIds.length === 2) {
    const id = freshId(ctx, 'r');
    const label = ctx.nextLabel('ray');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'ray', label, { origin: pointIds[0], through: pointIds[1], color: '#0ea5e9' }) },
    });
    return;
  }
  if (k === 'vector' && pointIds.length === 2) {
    const id = freshId(ctx, 'v');
    const label = ctx.nextLabel('vector');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'vector', label, { from: pointIds[0], to: pointIds[1], color: '#0ea5e9' }) },
    });
    return;
  }
  if (k === 'circle' && pointIds.length === 2) {
    const id = freshId(ctx, 'c');
    const label = ctx.nextLabel('circle');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'circle', label, { center: pointIds[0], surfacePoint: pointIds[1], color: '#0ea5e9' }) },
    });
    return;
  }
  if (k === 'polygon' && pointIds.length >= 3) {
    const id = freshId(ctx, 'poly');
    const label = ctx.nextLabel('polygon');
    ctx.store.dispatch({
      type: 'ADD',
      payload: { obj: mkSceneObj(id, 'polygon', label, { vertices: pointIds, color: '#0ea5e9' }) },
    });
    return;
  }
  // Other kinds (angle/distance/derived line constructions) — biến hình không
  // có ý nghĩa định nghĩa. Bỏ qua.
}

// ─── board.on('up') ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleUp(ctx: HandlerCtx, e: any): void {
  const t = ctx.toolRef.current;
  if (t === 'select') {
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
      const kind = objKind(o);
      if (kind === 'point') {
        const pc = o.coords?.scrCoords;
        if (!pc) continue;
        if (pc[1] >= x1 && pc[1] <= x2 && pc[2] >= y1 && pc[2] <= y2) {
          const sid = ctx.jxgIdToSceneId(o);
          if (sid && !ctx.selectedSetRef.current.has(sid)) {
            ctx.selectedSetRef.current.add(sid);
          }
        }
      } else if (kind === 'line' || kind === 'circle') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const defs: any[] = [o.point1, o.point2, o.center, o.midpoint, o.point3].filter(Boolean);
        const anyInside = defs.some((p) => {
          const pc = p?.coords?.scrCoords;
          return pc && pc[1] >= x1 && pc[1] <= x2 && pc[2] >= y1 && pc[2] <= y2;
        });
        if (anyInside) {
          const sid = ctx.jxgIdToSceneId(o);
          if (sid && !ctx.selectedSetRef.current.has(sid)) {
            ctx.selectedSetRef.current.add(sid);
          }
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
  const best: JxgObj | null =
    hits.find((o) => objKind(o) === 'point') ?? ctx.findNearestPointJxg(e, 12) ?? hits[0] ?? null;
  if (!best) {
    ctx.lastMoveClickRef.current = { id: null, time: 0 };
    return;
  }
  const bestId = ctx.jxgIdToSceneId(best);
  const now = Date.now();
  const isDouble =
    bestId !== null && ctx.lastMoveClickRef.current.id === bestId && (now - ctx.lastMoveClickRef.current.time) < 400;
  ctx.lastMoveClickRef.current = { id: bestId, time: now };
  if (!isDouble) return;
  const cx = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) as number;
  const cy = (e.clientY ?? e.touches?.[0]?.clientY ?? 0) as number;
  if (!bestId) return;
  ctx.emitSelect({ id: bestId, anchorScreen: { x: cx + 8, y: cy + 8 } });
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
      const b = ctx.boardRef.current;
      const ux1 = b.screenCoords2userCoords?.([Math.min(startSx, sx), Math.min(startSy, sy)]) ?? null;
      const ux2 = b.screenCoords2userCoords?.([Math.max(startSx, sx), Math.max(startSy, sy)]) ?? null;
      const toUsr = (px: number, py: number): [number, number] => {
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
