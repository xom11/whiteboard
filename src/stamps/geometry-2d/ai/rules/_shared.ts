// src/stamps/geometry-2d/ai/rules/_shared.ts
//
// Helper dùng chung cho rule module: intent factory (cast IntentT tập trung 1 chỗ)
// + trích tên điểm từ lời dẫn tiếng Việt. Rule module KHÔNG tự cast `as any`.
import type { IntentT } from '../intent';

// --- Intent factories (cast tập trung) ---------------------------------------
// variant/shape/kind là string runtime; zod validate lại ở builder/transpile,
// nên cast qua unknown an toàn trong phạm vi NLU.

export function drawShape(
  shape: string,
  labels: string[],
  variant = 'any',
  explicitCoords?: Record<string, readonly [number, number]>,
): IntentT {
  return {
    op: 'draw-shape',
    shape,
    labels,
    variant,
    ...(explicitCoords ? { explicitCoords } : {}),
  } as unknown as IntentT;
}

export function addPoint(name: string, constraint: Record<string, unknown>): IntentT {
  return { op: 'add-point', name, constraint } as unknown as IntentT;
}

export function connect(from: string, to: string, style = 'segment'): IntentT {
  return { op: 'connect', from, to, style } as unknown as IntentT;
}

export function drawCircle(
  name: string,
  spec: string,
  extra: Record<string, unknown> = {},
): IntentT {
  return { op: 'draw-circle', name, spec, ...extra } as unknown as IntentT;
}

export function drawLine(
  name: string,
  kind: string,
  extra: Record<string, unknown> = {},
): IntentT {
  return { op: 'draw-line', name, kind, ...extra } as unknown as IntentT;
}

// --- Point-name extraction ----------------------------------------------------

const INTRO_NAME =
  /(?:Gọi|Lấy|Dựng|Vẽ|Kẻ|Đặt|Xác định)\s+(?:điểm\s+)?([A-Z])(?:['′]?)\b/u;
const NAME_LA = /\b([A-Z])(?:['′]?)\s+là\b/u;

/**
 * Trích tên điểm được giới thiệu trong clause:
 *   "Gọi M là trung điểm BC" → "M"
 *   "Lấy điểm D trên cạnh AB" → "D"
 *   "H là trực tâm" → "H"
 * Trả undefined nếu không tìm thấy (caller tự quyết fallback / bỏ qua).
 */
export function extractPointName(clauseText: string): string | undefined {
  const intro = INTRO_NAME.exec(clauseText);
  if (intro) return intro[1];
  const la = NAME_LA.exec(clauseText);
  if (la) return la[1];
  return undefined;
}

/** Tách "BC" → ["B","C"]; "AB" → ["A","B"]. Trả [] nếu không phải cặp đỉnh. */
export function pairFromToken(token: string): string[] {
  const m = /^([A-Z])([A-Z])$/u.exec(token.trim());
  return m ? [m[1], m[2]] : [];
}

// --- Side / segment prefix ----------------------------------------------------
// Tiền tố "cạnh"/"đoạn" tuỳ chọn TRƯỚC cặp đỉnh, cho phép bổ ngữ "huyền"/"thẳng"
// chen giữa: "cạnh BC", "cạnh huyền BC", "đoạn AC", "đoạn thẳng AC". Fail-safe:
// "cạnh thẳng"/"đoạn huyền" (sai cặp) KHÔNG khớp vì bổ ngữ bị buộc đúng loại.
// Là FRAGMENT regex (string, không cờ) để nhúng vào pattern lớn hơn — bổ ngữ là
// optional nên prefix vẫn khớp dạng trần "cạnh BC".
export const SIDE_PREFIX = '(?:cạnh(?:\\s+huyền)?\\s+|đoạn(?:\\s+thẳng)?\\s+)?';
