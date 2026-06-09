// scripts/smoke-diameter-render.mts
//
// Render THẬT bằng JSXGraph (jsdom) NGOÀI jest — vì jest mock jsxgraph
// (__mocks__/jsxgraphMock.js) nên không test nào trong jest vẽ thật được.
//
// Dựng figure deterministic cho đề "đường tròn đường kính đôi một cắt nhau",
// chạy JxgRenderer trên board JSXGraph thật, đọc toạ độ THỰC từng điểm rồi
// assert: hữu hạn, phân biệt, không sụp (0,0), và M/N/P ≡ chân vuông góc từ A.
//
// Chạy: npx tsx scripts/smoke-diameter-render.mts
import { JSDOM } from 'jsdom';

// jsdom globals TRƯỚC khi import jsxgraph.
const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
// Node global navigator (read-only getter) thiếu appVersion mà SVGRenderer cần →
// defineProperty ghi đè bằng navigator jsdom.
try {
  Object.defineProperty(g, 'navigator', { value: dom.window.navigator, configurable: true });
} catch { /* ignore */ }
if (g.navigator && g.navigator.appVersion === undefined) {
  try { Object.defineProperty(g.navigator, 'appVersion', { value: '5.0', configurable: true }); } catch { /* */ }
}
g.SVGElement = dom.window.SVGElement;
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
// jsdom thiếu matchMedia/IntersectionObserver — polyfill no-op cho JSXGraph init.
dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }) as any;
g.matchMedia = dom.window.matchMedia;
class IO { observe() {} unobserve() {} disconnect() {} }
g.IntersectionObserver = IO as any;
dom.window.IntersectionObserver = IO as any;

const { tryDeterministicFigure } = await import('../src/stamps/geometry-2d/ai/deterministic/tryDeterministicFigure.ts');
const { createStore } = await import('../src/core/scene/store.ts');
const { JxgRenderer } = await import('../src/core/scene/render/JxgRenderer.ts');
await import('../src/core/scene/kinds/index.ts');
const JXG: any = (await import('jsxgraph')).default;

const dist = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]);
function perpFoot(P0: number[], A0: number[], B0: number[]): number[] {
  const dx = B0[0] - A0[0], dy = B0[1] - A0[1];
  const t = ((P0[0] - A0[0]) * dx + (P0[1] - A0[1]) * dy) / (dx * dx + dy * dy);
  return [A0[0] + t * dx, A0[1] + t * dy];
}

let boardSeq = 0;
function renderReal(state: any): Record<string, number[]> {
  const div = dom.window.document.createElement('div');
  div.id = `b${boardSeq++}`;
  Object.defineProperty(div, 'offsetWidth', { value: 600 });
  Object.defineProperty(div, 'offsetHeight', { value: 600 });
  dom.window.document.body.appendChild(div);
  const board: any = JXG.JSXGraph.initBoard(div.id, {
    renderer: 'svg', boundingbox: [-6, 12, 12, -6], axis: false, grid: false,
    showCopyright: false, showNavigation: false, keepAspectRatio: true,
  });
  new JxgRenderer(createStore(state), board);
  const out: Record<string, number[]> = {};
  for (const o of board.objectsList) {
    if (o.elementClass === 1 && o.name) out[o.name] = [o.X(), o.Y()]; // class 1 = POINT
  }
  return out;
}

// 1 case: (apex, others[], result names theo thứ tự lexicographic của cặp others).
function runCase(label: string, problem: string, apex: string, others: string[], resultNames: string[]): boolean {
  const res = tryDeterministicFigure(problem);
  if (!res.ok) { console.error(`[${label}] ESCALATE ${res.reason}`); return false; }
  const pts = renderReal(res.figure.transpile.state);
  const all = [apex, ...others, ...resultNames, 'O'];
  const fails: string[] = [];
  for (const n of all) {
    if (!pts[n]) { fails.push(`thiếu ${n}`); continue; }
    if (!Number.isFinite(pts[n][0]) || !Number.isFinite(pts[n][1])) fails.push(`${n} không hữu hạn`);
    if (dist(pts[n], [0, 0]) < 1e-6) fails.push(`${n} sụp (0,0)`);
  }
  // C(n,2) cặp lexicographic → kết quả thứ k ≡ chân(apex, others[i]others[j]).
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < others.length; i++) for (let j = i + 1; j < others.length; j++) pairs.push([i, j]);
  pairs.forEach(([i, j], k) => {
    const r = resultNames[k];
    if (!pts[r] || !pts[apex] || !pts[others[i]] || !pts[others[j]]) return;
    const err = dist(pts[r], perpFoot(pts[apex], pts[others[i]], pts[others[j]]));
    if (err > 1e-6) fails.push(`${r}=chân(${apex},${others[i]}${others[j]}) sai err=${err.toExponential(2)}`);
  });
  if (fails.length) { console.error(`[${label}] ❌\n  ` + fails.join('\n  ')); return false; }
  console.log(`[${label}] ✅ ${all.length} điểm hợp lệ, ${pairs.length} giao điểm ≡ chân vuông góc (Simson).`);
  return true;
}

const ok3 = runCase(
  'n=3',
  'Cho đường tròn (O) và ba dây cung AB, AC, AD bất kì. Các đường tròn đường kính AB, AC, AD đôi một cắt nhau lần thứ hai tại M, N, P.',
  'A', ['B', 'C', 'D'], ['M', 'N', 'P'],
);
const ok4 = runCase(
  'n=4',
  'Cho đường tròn (O). Các đường tròn đường kính AB, AC, AD, AE đôi một cắt nhau lần thứ hai tại M, N, P, Q, R, S.',
  'A', ['B', 'C', 'D', 'E'], ['M', 'N', 'P', 'Q', 'R', 'S'],
);

if (ok3 && ok4) console.log('\n✅ Render THẬT OK cho cả n=3 và n=4 — figure vẽ được, hình học đúng.');
else process.exit(1);
