/**
 * Shared offscreen JSXGraph render pipeline.
 *
 * Each JSXGraph stamp (geometry-2d, geometry-3d, graph-2d) needs the same
 * boilerplate to dump SVG offscreen: lazy import JSXGraph, create a hidden
 * DIV with explicit pixel dimensions, initBoard, attach a scene-store renderer
 * (or create a view3d), force update, clone the SVG node, add xmlns, serialize,
 * then tear everything down. This helper owns that lifecycle so each stamp
 * only writes the unique part — what to render — inside `setup`.
 *
 * Intrinsic SVG resolution matters: Excalidraw loads stamp SVGs via <img> then
 * drawImage onto canvas. The browser rasterizes SVG at its intrinsic
 * width/height, so dims passed here should be generous enough that the bitmap
 * downscales (sharp) instead of upscales (blurry) when the user zooms or views
 * on a retina display.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgModule = any;

export interface JxgOffscreenRenderOpts {
  /** JSXGraph bounding box: [xmin, ymax, xmax, ymin]. */
  bbox: [number, number, number, number];
  /** Offscreen container size in CSS pixels. Becomes SVG intrinsic size. */
  dims: { width: number; height: number };
  axis?: boolean;
  grid?: boolean;
  keepAspectRatio?: boolean;
  /** Mutate JXG.Options before initBoard (e.g. text.display='internal', palette). */
  applyOptions?: (JXG: JxgModule) => void;
  /**
   * Build the scene on the board. Return a disposable (typically the
   * `JxgRenderer` or `JxgRenderer3D` instance) — its `dispose()` is invoked
   * during teardown before `freeBoard`.
   */
  setup: (board: unknown, JXG: JxgModule) => { dispose: () => void } | Promise<{ dispose: () => void }>;
  /** Optional mutation on the cloned <svg> before serialization. */
  postProcessSvg?: (clone: SVGElement) => void;
}

export interface JxgOffscreenRenderResult {
  svgString: string;
  width: number;
  height: number;
}

export async function renderJsxgOffscreen(
  opts: JxgOffscreenRenderOpts,
): Promise<JxgOffscreenRenderResult> {
  const { bbox, dims, axis = false, grid = false, keepAspectRatio = true } = opts;
  const JXG: JxgModule = (await import('jsxgraph')).default;

  if (opts.applyOptions) {
    try {
      opts.applyOptions(JXG);
    } catch {
      /* swallow option-apply errors */
    }
  }

  const containerId =
    'jxg_offscreen_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const container = document.createElement('div');
  container.id = containerId;
  container.style.cssText =
    `position:absolute;top:-99999px;left:-99999px;` +
    `width:${dims.width}px;height:${dims.height}px;` +
    `visibility:hidden;pointer-events:none;`;
  document.body.appendChild(container);

  let board: unknown = null;
  let disposable: { dispose: () => void } | null = null;
  try {
    board = JXG.JSXGraph.initBoard(containerId, {
      boundingbox: bbox,
      axis,
      grid,
      keepAspectRatio,
      showCopyright: false,
      showNavigation: false,
    });
    disposable = await opts.setup(board, JXG);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (board as any)?.update?.();
    } catch {
      /* ignore — board may already be in valid state */
    }

    const svgEl = container.querySelector('svg');
    if (!svgEl) throw new Error('renderJsxgOffscreen: no SVG produced by JSXGraph');
    const clone = svgEl.cloneNode(true) as SVGElement;
    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    if (opts.postProcessSvg) opts.postProcessSvg(clone);
    const svgString = new XMLSerializer().serializeToString(clone);
    return { svgString, width: dims.width, height: dims.height };
  } finally {
    try {
      disposable?.dispose();
    } catch {
      /* ignore */
    }
    try {
      if (board) JXG.JSXGraph.freeBoard(board);
    } catch {
      /* ignore */
    }
    if (container.parentNode) container.parentNode.removeChild(container);
  }
}
