// src/stamps/graph-2d/render.ts
// Offscreen SVG export từ graph2d State.
// Dùng cho insert/restore stamp.
//
// LƯU Ý: Luôn dùng light palette — Excalidraw tự invert trong dark mode.
import type { State } from '../../core/scene/types';
import { createStore } from '../../core/scene/store';
import { JxgRenderer } from '../../core/scene/render/JxgRenderer';
import { safeJsx } from '../shared/safeJsx';
import { paletteFor } from './editor/theme';

const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 400;

/**
 * Render State thành SVG string (offscreen JSXGraph board).
 * @param state  Graph2D scene state
 * @param _isDark  Ignored — luôn dùng light palette
 * @param width  Container width (px)
 * @param height Container height (px)
 * @returns SVG markup string, hoặc '' nếu không có SVG element nào
 */
export async function renderGraphSvgFromState(
  state: State,
  _isDark: boolean,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const JXG = require('jsxgraph');

  const palette = paletteFor(false);

  // Apply JSXGraph options (text display mode)
  safeJsx('graph.render.applyOptions', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts = (JXG as any).Options ?? (JXG.default as any)?.Options;
    if (opts) {
      opts.text = opts.text || {};
      opts.text.display = 'internal';
      opts.text.useASCIIMathML = false;
      opts.text.useMathJax = false;
      opts.text.useKatex = false;
      opts.text.strokeColor = palette.label;
      opts.label = opts.label || {};
      opts.label.display = 'internal';
      opts.label.strokeColor = palette.label;
      opts.axis = opts.axis || {};
      opts.axis.strokeColor = palette.axis;
      opts.grid = opts.grid || {};
      opts.grid.strokeColor = palette.grid;
    }
  });

  const containerId = 'jxg_graph_offscreen_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const div = document.createElement('div');
  div.id = containerId;
  div.style.cssText = [
    `width:${width}px`,
    `height:${height}px`,
    'position:absolute',
    'top:-99999px',
    'left:-99999px',
    'visibility:hidden',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(div);

  const view = state.meta.view;
  const bbox: [number, number, number, number] = [
    view?.xMin ?? -10,
    view?.yMax ?? 10,
    view?.xMax ?? 10,
    view?.yMin ?? -10,
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const JxgLib = (JXG.default ?? JXG) as any;

  let board: unknown = null;
  let renderer: JxgRenderer | null = null;
  try {
    board = JxgLib.JSXGraph.initBoard(containerId, {
      boundingbox: bbox,
      axis: view?.showAxis ?? true,
      grid: view?.showGrid ?? true,
      showCopyright: false,
      showNavigation: false,
      keepAspectRatio: false,
    });

    const store = createStore(state);
    renderer = new JxgRenderer(store, board);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (board as any).update?.();

    // Extract SVG
    const svgEl = div.querySelector('svg');
    if (!svgEl) return '';
    const clone = svgEl.cloneNode(true) as SVGElement;
    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    return new XMLSerializer().serializeToString(clone);
  } finally {
    try { renderer?.dispose(); } catch { /* ignore */ }
    safeJsx('graph.render.freeBoard', () => {
      if (board) JxgLib.JSXGraph.freeBoard(board);
    });
    if (div.parentNode) div.parentNode.removeChild(div);
  }
}
