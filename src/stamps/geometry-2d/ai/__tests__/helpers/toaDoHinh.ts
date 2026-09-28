// Dựng hình của một đề bằng JSXGraph THẬT (renderer 'no' — không vẽ, chỉ tính) và
// trả toạ độ từng điểm theo nhãn. Dùng để test hình ĐÚNG điều kiện đề (AE = AD,
// E thuộc AB…), không chỉ "đủ tên điểm".
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

// Bản THẬT (jest map 'jsxgraph' sang mock; `exports` của gói chặn subpath) — tìm
// file core theo đường dẫn, đi ngược từ đây lên (worktree dùng node_modules cha).
function napJsxGraphThat(): any {
  let dir = __dirname;
  for (;;) {
    const f = join(dir, 'node_modules', 'jsxgraph', 'distrib', 'jsxgraphcore.js');
    if (existsSync(f)) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require(f);
    }
    const up = dirname(dir);
    if (up === dir) throw new Error('không tìm thấy jsxgraph/distrib/jsxgraphcore.js');
    dir = up;
  }
}
const JXG = napJsxGraphThat();
import { tryDeterministicFigure } from '../../deterministic/tryDeterministicFigure';
import { createStore } from '../../../../../core/scene/store';
import { JxgRenderer } from '../../../../../core/scene/render/JxgRenderer';
import '../../../../../core/scene/kinds';

export type XY = [number, number];

/**
 * Dựng hình trên board JSXGraph thật và GIỮ board để test thao tác (kéo điểm).
 * Gọi `huy()` khi xong.
 */
export function dungHinh(de: string) {
  const r = tryDeterministicFigure(de);
  if (!r.ok) throw new Error(`không dựng đủ: ${r.reason} ${r.detail ?? ''}`);
  const state = r.figure.transpile.state;
  const el = document.createElement('div');
  el.id = `jxg-${Math.random().toString(36).slice(2)}`;
  document.body.appendChild(el);
  const board = (JXG as any).JSXGraph.initBoard(el.id, {
    renderer: 'no',
    boundingbox: [-20, 20, 20, -20],
    axis: false,
    showNavigation: false,
    showCopyright: false,
  });
  const store = createStore(state);
  const renderer = new JxgRenderer(store, board);
  const phanTu = (nhan: string): any => {
    const o = (Object.values(state.objects) as any[]).find((x) => x.label === nhan);
    return o ? renderer.getElement(o.id) : null;
  };
  const toaDo = (): Record<string, XY> => {
    const out: Record<string, XY> = {};
    for (const o of Object.values(state.objects) as any[]) {
      // Điểm giao là object kind riêng ('intersection'), không phải 'point' — lấy mọi
      // object có toạ độ (đường/đường tròn không có X()/Y()).
      const e = renderer.getElement(o.id) as { X?: () => number; Y?: () => number } | null;
      if (e?.X && e.Y) {
        const xy: XY = [e.X(), e.Y()];
        if (Number.isFinite(xy[0]) && Number.isFinite(xy[1])) out[o.label] = xy;
      }
    }
    return out;
  };
  /**
   * Kéo điểm tự do `nhan` tới (x, y) rồi cập nhật board. Cập nhật HAI lần: glider
   * (kể cả onCircle có sẵn) được cập nhật trước đường tròn cha trong cùng một lượt,
   * nên sau một lượt còn trễ một nhịp — trên trình duyệt board update liên tục khi
   * kéo nên không thấy.
   */
  const keo = (nhan: string, x: number, y: number) => {
    phanTu(nhan).setPosition((JXG as any).COORDS_BY_USER, [x, y]);
    board.update();
    board.update();
  };
  const huy = () => {
    renderer.dispose();
    (JXG as any).JSXGraph.freeBoard(board);
    el.remove();
  };
  return { toaDo, keo, huy };
}

export function toaDoHinh(de: string): Record<string, XY> {
  const h = dungHinh(de);
  const out = h.toaDo();
  h.huy();
  return out;
}

export const dist = (p: XY, q: XY) => Math.hypot(p[0] - q[0], p[1] - q[1]);
/** P nằm trên đoạn AB (kể cả sai số nhỏ). */
export function thuocDoan(p: XY, a: XY, b: XY, eps = 1e-6): boolean {
  return Math.abs(dist(a, p) + dist(p, b) - dist(a, b)) < eps;
}
/** P nằm trên tia AB (gốc A). */
export function thuocTia(p: XY, a: XY, b: XY, eps = 1e-6): boolean {
  const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const dot = (b[0] - a[0]) * (p[0] - a[0]) + (b[1] - a[1]) * (p[1] - a[1]);
  return Math.abs(cross) < eps * Math.max(1, dist(a, b)) && dot >= -eps;
}
