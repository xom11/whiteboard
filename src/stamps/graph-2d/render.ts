// src/stamps/graph-2d/render.ts
// Offscreen SVG export từ graph2d State. Dùng cho insert/restore stamp.
//
// LƯU Ý: Luôn dùng light palette — Excalidraw tự invert trong dark mode.
// Intrinsic dims default 1800×1200 (bumped từ 600×400) để stamp sắc nét khi
// zoom hoặc trên màn retina; caller có thể override qua args.
import type { State } from '../../core/scene/types';
import { createStore } from '../../core/scene/store';
import { JxgRenderer } from '../../core/scene/render/JxgRenderer';
import { paletteFor } from './editor/theme';
import { renderJsxgOffscreen } from '../shared/jxgOffscreenRender';

const DEFAULT_WIDTH = 1800;
const DEFAULT_HEIGHT = 1200;

export async function renderGraphSvgFromState(
  state: State,
  _isDark: boolean,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
): Promise<string> {
  const palette = paletteFor(false);
  const view = state.meta.view;
  const bbox: [number, number, number, number] = [
    view?.xMin ?? -10,
    view?.yMax ?? 10,
    view?.xMax ?? 10,
    view?.yMin ?? -10,
  ];
  try {
    const { svgString } = await renderJsxgOffscreen({
      bbox,
      dims: { width, height },
      axis: view?.showAxis ?? true,
      grid: view?.showGrid ?? true,
      keepAspectRatio: false,
      applyOptions: (JXG) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const opts = (JXG as any).Options;
        if (!opts) return;
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
      },
      setup: (board) => {
        const store = createStore(state);
        return new JxgRenderer(store, board);
      },
    });
    return svgString;
  } catch {
    // Match old contract: callers expect '' when no SVG produced.
    return '';
  }
}
