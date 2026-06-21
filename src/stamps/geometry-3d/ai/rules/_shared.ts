export { solid, addPoint3d, plane3d, line3dIntent, connect3d } from '../intent';

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
