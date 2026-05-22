import type { JxgRenderer } from '../../../core/scene/render/JxgRenderer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

/**
 * Resolve scene id → JSXGraph object qua renderer's elements map.
 *
 * Synthetic "<polyId>:border:<N>" → polygon.borders[N]: cho phép preview
 * shape của tool perpendicular/parallel/tangent kéo theo cạnh đa giác làm
 * parent (border là sub-segment auto-tạo, không có scene id riêng).
 */
export function jxgFromSceneId(renderer: JxgRenderer | null, id: string): JxgObj {
  if (!renderer) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elements = (renderer as any).elements as Map<string, JxgObj> | undefined;
  if (!elements) return null;
  const m = /^(.+):border:(\d+)$/.exec(id);
  if (m) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const poly = elements.get(m[1]) as any;
    const idx = parseInt(m[2], 10);
    const borders = poly?.borders;
    if (Array.isArray(borders) && borders[idx]) return borders[idx];
    return null;
  }
  return elements.get(id) ?? null;
}

/**
 * Resolve JSXGraph object → scene id. Trước hết check reverse-map (cached),
 * sau đó dò polygon borders để trả synthetic "<polyId>:border:<idx>" cho
 * construct tools dùng cạnh đa giác như line input.
 */
export function jxgIdToSceneId(
  renderer: JxgRenderer | null,
  idMap: Map<string, string>,
  jxgObj: JxgObj,
): string | null {
  if (!jxgObj?.id) return null;
  const direct = idMap.get(String(jxgObj.id));
  if (direct) return direct;
  if (!renderer) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elements = (renderer as any).elements as Map<string, JxgObj> | undefined;
  if (!elements) return null;
  // Direct fallback: idMap rebuild qua store.subscribe có thể chạy TRƯỚC
  // JxgRenderer subscriber (cùng store, đăng ký theo order useEffect), nên
  // idMap luôn thiếu entry của object vừa được renderer tạo trong dispatch
  // hiện tại. Walk renderer.elements để bù.
  for (const [sid, el] of elements) {
    if (el === jxgObj) return sid;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const borders = (el as any)?.borders;
    if (Array.isArray(borders)) {
      const idx = borders.indexOf(jxgObj);
      if (idx >= 0) return `${sid}:border:${idx}`;
    }
  }
  return null;
}
