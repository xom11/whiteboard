"use client";

import { parseSerializedBoard3D } from './serialize';
import { GROUND_PLANE_ATTRS, GROUND_PLANE_RANGE, VIEW3D_ATTRS } from './editor/theme';

export interface RenderResult {
  svgString: string;
  width: number;
  height: number;
}

const OUTPUT_WIDTH = 1024;
const OUTPUT_HEIGHT = 768;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JxgObj = any;

export async function renderGeometry3DSvgFromState(
  jsonState: string,
): Promise<RenderResult> {
  const state = parseSerializedBoard3D(jsonState);
  const JXG = (await import('jsxgraph')).default;

  const div = document.createElement('div');
  div.style.cssText = `position:absolute;left:-9999px;top:-9999px;width:${OUTPUT_WIDTH}px;height:${OUTPUT_HEIGHT}px;`;
  document.body.appendChild(div);

  try {
    JXG.Options.text.display = 'internal';

    const board = JXG.JSXGraph.initBoard(div, {
      boundingbox: state.bbox,
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
          [state.view.bbox3D[0], state.view.bbox3D[3]],
          [state.view.bbox3D[1], state.view.bbox3D[4]],
          [state.view.bbox3D[2], state.view.bbox3D[5]],
        ],
      ],
      {
        ...baseAttrs,
        // JSXGraph view3d đọc azimuth/elevation từ az.slider.start (không phải
        // az.value). Nếu pass `value` → JSXGraph bỏ qua → render rơi về default
        // (1.0 rad / 0.3 rad), không khớp góc user xoay trong editor.
        az: { ...baseAttrs.az, slider: { ...baseAttrs.az.slider, start: state.view.azimuth } },
        el: { ...baseAttrs.el, slider: { ...baseAttrs.el.slider, start: state.view.elevation } },
      },
    );

    // Defensive: setValue post-creation để chắc chắn slider khớp với serialized
    // angle, kể cả khi JSXGraph version khác xử lý `start` khác.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = view as any;
      v?.az_slide?.setValue?.(state.view.azimuth);
      v?.el_slide?.setValue?.(state.view.elevation);
      v?.board?.update?.();
    } catch {
      /* swallow — older JSXGraph may not expose az_slide on view3d */
    }

    if (!state.showAxes) {
      (view as { defaultAxes?: unknown[] }).defaultAxes = [];
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

    const idMap = new Map<string, JxgObj>();
    for (const el of state.elements) {
      const parents = el.parents.map((p) =>
        typeof p === 'string' && p.startsWith('@id:')
          ? idMap.get(p.slice(4))
          : p,
      );
      const obj = (
        view as { create: (k: string, p: unknown[], a: unknown) => JxgObj }
      ).create(el.type, parents, {
        ...el.attributes,
        id: el.id,
        name: el.label,
      });
      idMap.set(el.id, obj);
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
