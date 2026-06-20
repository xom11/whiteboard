// src/stamps/geometry-3d/editor/tools/handlers/derived.ts
// Handler dựng ĐIỂM PHÁI SINH 3D (v1). Mỗi handler: resolve điểm gốc qua
// ensurePoint → addPoint(store, constraint phái sinh).
//
// QUAN TRỌNG (chống điểm MỒ CÔI): ensurePoint có side-effect TẠO điểm cho hit
// trên-bề-mặt (onGround/onAxis/onPlane/onSphere). Vì vậy kiểm suy biến phải đọc
// từ HIT *trước* khi gọi ensurePoint — KHÔNG để guard chạy sau khi đã tạo điểm,
// nếu không một build bị từ chối vẫn để lại điểm mới mồ côi trong scene
// (phát hiện bởi review đối kháng 2026-06-21).
import type { Store } from '../../../../../core/scene';
import type { SceneHit } from '../../hitTest/hitTest';
import type { CollectedArg } from '../spec';
import { addPoint, ensurePoint, hitObjectId } from './_ensurePoint';

// Hit của các bước 'point' theo thứ tự chọn.
function pointHits(args: CollectedArg[]): SceneHit[] {
  return args.filter((a) => a.step.type === 'point' && a.hit).map((a) => a.hit!);
}

// Hai hit cùng trỏ về MỘT điểm có sẵn (id trùng) → đoạn/đường suy biến. Điểm
// MỚI luôn nhận id riêng nên không bao giờ trùng theo cách này (chỉ điểm-có-sẵn
// click 2 lần mới gây suy biến phát hiện được ở tầng id).
function sameExistingPoint(h1: SceneHit | undefined, h2: SceneHit | undefined): boolean {
  return (
    !!h1 && !!h2 &&
    h1.kind === 'existingPoint' && h2.kind === 'existingPoint' &&
    h1.pointId === h2.pointId
  );
}

// Số ĐỈNH phân biệt các hit sẽ tạo ra: mỗi điểm-mới = 1 đỉnh riêng; điểm-có-sẵn
// dedup theo id. Dùng để chặn trọng tâm < 3 đỉnh TRƯỚC khi tạo điểm.
function distinctVertexCount(hits: SceneHit[]): number {
  const existing = new Set<string>();
  let fresh = 0;
  for (const h of hits) {
    if (h.kind === 'existingPoint') existing.add(h.pointId);
    else fresh++;
  }
  return existing.size + fresh;
}

// Id mặt phẳng từ bước 'object' đầu tiên (null nếu thiếu / không phải object).
function objectPlaneId(args: CollectedArg[]): string | null {
  const objArg = args.find((a) => a.step.type === 'object' && a.hit);
  return objArg ? hitObjectId(objArg.hit!) : null;
}

/** Trung điểm đoạn nối 2 điểm. */
export function buildMidpoint(args: CollectedArg[], store: Store): string | null {
  const hits = pointHits(args);
  if (hits.length < 2 || sameExistingPoint(hits[0], hits[1])) return null;
  const p1 = ensurePoint(hits[0], store);
  const p2 = ensurePoint(hits[1], store);
  if (!p1 || !p2 || p1 === p2) return null;
  return addPoint(store, { kind: 'midpoint', p1, p2 });
}

/** Trọng tâm: trung bình các đỉnh đã chọn (≥3 đỉnh phân biệt). */
export function buildCentroid(args: CollectedArg[], store: Store): string | null {
  const hits = pointHits(args);
  if (distinctVertexCount(hits) < 3) return null; // chặn TRƯỚC khi tạo điểm
  const ids = hits.map((h) => ensurePoint(h, store)).filter((x): x is string => !!x);
  const uniq = Array.from(new Set(ids));
  if (uniq.length < 3) return null;
  return addPoint(store, { kind: 'centroid', vertices: uniq });
}

/** Giao 2 đường — mỗi đường xác định bởi 2 điểm: (a1,b1) & (a2,b2). */
export function buildIntersectionLines(args: CollectedArg[], store: Store): string | null {
  const hits = pointHits(args);
  if (hits.length < 4) return null;
  const [h1, h2, h3, h4] = hits;
  if (sameExistingPoint(h1, h2) || sameExistingPoint(h3, h4)) return null; // đường suy biến
  const a1 = ensurePoint(h1, store);
  const b1 = ensurePoint(h2, store);
  const a2 = ensurePoint(h3, store);
  const b2 = ensurePoint(h4, store);
  if (!a1 || !b1 || !a2 || !b2 || a1 === b1 || a2 === b2) return null;
  return addPoint(store, { kind: 'intersectionLines', a1, b1, a2, b2 });
}

/** Chân vuông góc từ điểm `from` xuống đường (a,b). */
export function buildPerpFootLine(args: CollectedArg[], store: Store): string | null {
  const hits = pointHits(args);
  if (hits.length < 3 || sameExistingPoint(hits[1], hits[2])) return null; // đường suy biến
  const from = ensurePoint(hits[0], store);
  const a = ensurePoint(hits[1], store);
  const b = ensurePoint(hits[2], store);
  if (!from || !a || !b || a === b) return null;
  return addPoint(store, { kind: 'perpFootLine', from, a, b });
}

/** Giao điểm đường (qua 2 điểm a,b) ∩ mặt phẳng (object). */
export function buildIntersectionLinePlane(args: CollectedArg[], store: Store): string | null {
  const plane = objectPlaneId(args);
  if (!plane) return null;
  const hits = pointHits(args);
  if (hits.length < 2 || sameExistingPoint(hits[0], hits[1])) return null; // đường suy biến
  const a = ensurePoint(hits[0], store);
  const b = ensurePoint(hits[1], store);
  if (!a || !b || a === b) return null;
  return addPoint(store, { kind: 'intersectionLinePlane', a, b, plane });
}

/** Chân vuông góc từ điểm `from` xuống mặt phẳng (object). */
export function buildPerpFootPlane(args: CollectedArg[], store: Store): string | null {
  const plane = objectPlaneId(args);
  if (!plane) return null;
  const hits = pointHits(args);
  if (hits.length < 1) return null;
  const from = ensurePoint(hits[0], store);
  if (!from) return null;
  return addPoint(store, { kind: 'perpFootPlane', from, plane });
}
