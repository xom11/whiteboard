export { solid, addPoint3d, plane3d, line3dIntent, connect3d, crossSection3d, sphereIntent, coneIntent, cylinderIntent } from '../intent';

export function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const INTRO_NAME_3D =
  /(?:Gọi|Lấy|Dựng|Vẽ|Kẻ|Đặt|Xác định)\s+(?:điểm\s+)?([A-Z][₀-₉0-9]?)['′]?(?![\p{L}])/u;
const NAME_LA_3D = /(?<![\p{L}\d])([A-Z][₀-₉0-9]?)['′]?\s+là(?!\p{L})/u;

export function extractName3D(text: string): string | undefined {
  return text.match(INTRO_NAME_3D)?.[1] ?? text.match(NAME_LA_3D)?.[1];
}

/**
 * Split a vertex token string into individual vertex labels.
 * Handles primes/subscripts: "A'B'C'" → ["A'","B'","C'"], "ABCD" → ["A","B","C","D"].
 */
export function splitVertexToken(token: string): string[] {
  return [...token.matchAll(/[A-Z](?:['′]|[₀-₉0-9])?/gu)].map((m) => m[0]);
}

export interface SolidHead3D { apex?: string; baseLabels: string[] }

// Mirror guards3d.SOLID_HEAD (non-global here — first match only).
const SOLID_HEAD_3D =
  /(?:hình\s+chóp\s+([A-Z])\.([A-Z'′₀-₉0-9]+))|(?:tứ\s+diện(?:\s+đều)?\s+([A-Z'′]{3,}))|(?:lăng\s+trụ\s+([A-Z]{3,})\.([A-Z'′]+))/u;

/** Parse the leading solid header → apex (pyramid only) + base vertex labels. */
export function parseSolidHead3D(problem: string): SolidHead3D | null {
  const m = SOLID_HEAD_3D.exec(problem);
  if (!m) return null;
  if (m[1]) return { apex: m[1], baseLabels: splitVertexToken(m[2] ?? '') };  // pyramid
  if (m[3]) return { baseLabels: splitVertexToken(m[3]) };                    // tetrahedron
  if (m[4]) return { baseLabels: splitVertexToken(m[4]) };                    // prism (bottom face)
  return null;
}

/** Implied base plane (3 base vertices) for "đáy"/"mặt đáy" with no (XYZ) token. */
export function baseFaceOf(problem: string): { planeName: string; p1: string; p2: string; p3: string } | null {
  const head = parseSolidHead3D(problem);
  if (!head || head.baseLabels.length < 3) return null;
  const [p1, p2, p3] = head.baseLabels;
  const clean = (s: string) => s.replace(/['′'´₀-₉0-9]/gu, '');
  return { planeName: `mp_${clean(p1)}${clean(p2)}${clean(p3)}`, p1, p2, p3 };
}
