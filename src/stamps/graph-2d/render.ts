import { parseSerializedGraph, type SerializedGraph } from './serialize';
import { compile } from './parser';
import { graphPaletteFor } from './editor/theme';

/**
 * Re-render SVG cho graph-2d stamp từ jsonState đã serialize.
 *
 * Dùng cho:
 *   1. Insert vào whiteboard (lúc user nhấn Chèn).
 *   2. Restore stamp file sau khi reload (Excalidraw không persist binary).
 *
 * Pattern mirror `geometry-2d/render.ts`:
 *   - LUÔN dùng light palette. Excalidraw apply CSS invert filter trong dark mode.
 *   - Đặt JXG.Options.text.display='internal' để label render dưới dạng SVG, không HTML overlay.
 *   - Offscreen div 600×400 cố định; cleanup sau khi clone SVG outerHTML.
 */
export async function renderGraph2dSvgFromState(jsonState: string): Promise<string> {
  const parsed = parseSerializedGraph(jsonState);
  if (!parsed) throw new Error('renderGraph2dSvgFromState: jsonState corrupt');

  const palette = graphPaletteFor(false);
  const JXG = (await import('jsxgraph')).default;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts = (JXG as any).Options;
  if (opts) {
    opts.text = opts.text || {};
    opts.text.display = 'internal';
    opts.text.useASCIIMathML = false;
    opts.text.useMathJax = false;
    opts.text.useKatex = false;
    opts.label = opts.label || {};
    opts.label.display = 'internal';
  }

  const container = document.createElement('div');
  container.id = `jxg_graph2d_off_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  container.style.cssText =
    'position:absolute;top:-99999px;left:-99999px;width:600px;height:400px;visibility:hidden;pointer-events:none;';
  document.body.appendChild(container);

  let board: unknown = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    board = (JXG as any).JSXGraph.initBoard(container.id, {
      boundingbox: [parsed.view.xMin, parsed.view.yMax, parsed.view.xMax, parsed.view.yMin],
      axis: parsed.view.showAxis,
      grid: parsed.view.showGrid,
      showCopyright: false,
      showNavigation: false,
      keepAspectRatio: false,
    });
    renderFunctions(board, parsed, palette);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (board as any).update();
    const svgEl = container.querySelector('svg');
    if (!svgEl) throw new Error('renderGraph2dSvgFromState: no svg generated');
    return svgEl.outerHTML;
  } finally {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (board) (JXG as any).JSXGraph.freeBoard(board);
    } catch {
      /* ignore */
    }
    if (container.parentNode) container.parentNode.removeChild(container);
  }
}

function renderFunctions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  board: any,
  graph: SerializedGraph,
  palette: ReturnType<typeof graphPaletteFor>,
): void {
  void palette;
  const paramMap: Record<string, number> = {};
  for (const p of graph.parameters) paramMap[p.name] = p.value;

  for (const f of graph.functions) {
    if (!f.visible) continue;
    const compiled = compile(f.expression, paramMap);
    if (typeof compiled !== 'function') continue;
    const domain = f.domain ?? { min: graph.view.xMin, max: graph.view.xMax };
    board.create(
      'functiongraph',
      [compiled, domain.min, domain.max],
      {
        strokeColor: f.color,
        strokeWidth: 2,
        name: f.name,
        withLabel: false,
        highlight: false,
      },
    );
  }
}
