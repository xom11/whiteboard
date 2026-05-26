"use client";

import { deserializeBoard3D } from './serialize';
import { createStore } from '../../core/scene';
import { DEFAULT_VIEW_3D, type View3D } from '../../core/scene/types';
import { JxgRenderer3D } from '../../core/scene/render/JxgRenderer3D';
import { GROUND_PLANE_ATTRS, GROUND_PLANE_RANGE, VIEW3D_ATTRS } from './editor/theme';
import { renderJsxgOffscreen } from '../shared/jxgOffscreenRender';

export interface RenderResult {
  svgString: string;
  width: number;
  height: number;
}

const OUTPUT_WIDTH = 1024;
const OUTPUT_HEIGHT = 768;
const BBOX_2D: [number, number, number, number] = [-6, 6, 6, -6];

 
type JxgObj = any;

export async function renderGeometry3DSvgFromState(jsonState: string): Promise<RenderResult> {
  const state = deserializeBoard3D(jsonState);
  const view3DInfo: View3D = state.meta.domain === '3d' ? state.meta.view : DEFAULT_VIEW_3D;

  const { svgString } = await renderJsxgOffscreen({
    bbox: BBOX_2D,
    dims: { width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT },
    axis: false,
    grid: false,
    keepAspectRatio: true,
    applyOptions: (JXG) => {
      JXG.Options.text.display = 'internal';
    },
    setup: (board) => {
      const baseAttrs = VIEW3D_ATTRS(false);
      const view: JxgObj = (board as { create: (k: string, p: unknown[], a: unknown) => JxgObj }).create(
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
         
        const v = view as any;
        v?.az_slide?.setValue?.(view3DInfo.azimuth);
        v?.el_slide?.setValue?.(view3DInfo.elevation);
        v?.board?.update?.();
      } catch {
        /* older JSXGraph may not expose az_slide on view3d */
      }

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

      const store = createStore(state);
      const renderer = new JxgRenderer3D(store, view);

      try {
         
        (view as any)?.board?.update?.();
      } catch {
        /* swallow */
      }

      return renderer;
    },
    postProcessSvg: (clone) => {
      clone.setAttribute('width', String(OUTPUT_WIDTH));
      clone.setAttribute('height', String(OUTPUT_HEIGHT));
    },
  });

  return { svgString, width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT };
}
