"use client";

import { parseSerializedBoard3D, type SerializedView3D } from './serialize';
import { createStore } from '../../core/scene';
import { JxgRenderer3D } from '../../core/scene/render/JxgRenderer3D';
import { DEFAULT_VIEW3D, GROUND_PLANE_ATTRS, GROUND_PLANE_RANGE, VIEW3D_ATTRS } from './editor/theme';

export interface RenderResult {
  svgString: string;
  width: number;
  height: number;
}

const OUTPUT_WIDTH = 1024;
const OUTPUT_HEIGHT = 768;
const BBOX_2D: [number, number, number, number] = [-6, 6, 6, -6];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export async function renderGeometry3DSvgFromState(
  jsonState: string,
): Promise<RenderResult> {
  let parsed: { state: ReturnType<typeof parseSerializedBoard3D>['state']; view?: SerializedView3D };
  try {
    parsed = parseSerializedBoard3D(JSON.parse(jsonState));
  } catch {
    parsed = parseSerializedBoard3D(null);
  }
  const view3DInfo: SerializedView3D = parsed.view ?? {
    azimuth: DEFAULT_VIEW3D.azimuth,
    elevation: DEFAULT_VIEW3D.elevation,
    bbox3D: [...DEFAULT_VIEW3D.bbox3D] as [number, number, number, number, number, number],
  };

  const JXG = (await import('jsxgraph')).default;

  const div = document.createElement('div');
  div.style.cssText = `position:absolute;left:-9999px;top:-9999px;width:${OUTPUT_WIDTH}px;height:${OUTPUT_HEIGHT}px;`;
  document.body.appendChild(div);

  try {
    JXG.Options.text.display = 'internal';

    const board = JXG.JSXGraph.initBoard(div, {
      boundingbox: BBOX_2D,
      keepaspectratio: true,
      axis: false,
      showCopyright: false,
      showNavigation: false,
      renderer: 'svg',
    }) as { create: (k: string, p: unknown[], a: unknown) => JxgObj };

    const baseAttrs = VIEW3D_ATTRS(false);
    const view: JxgObj = board.create(
      'view3d',
      [
        [-5, -5],
        [10, 10],
        [
          [view3DInfo.bbox3D[0], view3DInfo.bbox3D[3]],
          [view3DInfo.bbox3D[1], view3DInfo.bbox3D[4]],
          [view3DInfo.bbox3D[2], view3DInfo.bbox3D[5]],
        ],
      ],
      {
        ...baseAttrs,
        az: { ...baseAttrs.az, slider: { ...baseAttrs.az.slider, start: view3DInfo.azimuth } },
        el: { ...baseAttrs.el, slider: { ...baseAttrs.el.slider, start: view3DInfo.elevation } },
      },
    );

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = view as any;
      v?.az_slide?.setValue?.(view3DInfo.azimuth);
      v?.el_slide?.setValue?.(view3DInfo.elevation);
      v?.board?.update?.();
    } catch {
      /* swallow — older JSXGraph may not expose az_slide on view3d */
    }

    // XY ground plane through origin (matches editor's MiniBoard3D).
    try {
      (view as { create: (k: string, p: unknown[], a: unknown) => JxgObj }).create(
        'plane3d',
        [
          [0, 0, 0],
          [1, 0, 0],
          [0, 1, 0],
          GROUND_PLANE_RANGE,
          GROUND_PLANE_RANGE,
        ],
        GROUND_PLANE_ATTRS(false),
      );
    } catch {
      /* swallow */
    }

    // Hydrate JSXGraph từ State qua store + JxgRenderer3D. Store đã có sẵn LOAD
    // action, nhưng vì state đã có objects sẵn nên ta khởi tạo store với state
    // đó luôn — JxgRenderer3D sẽ render diff từ undefined → next.
    const store = createStore(parsed.state);
    const renderer = new JxgRenderer3D(store, view);

    // Force board update để JSXGraph flush mọi pending object trước khi
    // serialize SVG.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (view as any)?.board?.update?.();
    } catch {
      /* swallow */
    }

    const svg = div.querySelector('svg');
    if (!svg) {
      throw new Error('renderGeometry3DSvgFromState: SVG not produced');
    }
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute('width', String(OUTPUT_WIDTH));
    clone.setAttribute('height', String(OUTPUT_HEIGHT));
    const svgString = new XMLSerializer().serializeToString(clone);

    try {
      renderer.dispose();
    } catch {
      /* ignore */
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      JXG.JSXGraph.freeBoard(board as any);
    } catch {
      /* ignore teardown */
    }

    return { svgString, width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT };
  } finally {
    document.body.removeChild(div);
  }
}
