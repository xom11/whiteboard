"use client";

import { parseSerializedBoard3D } from './serialize';

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
      axis: false,
      showCopyright: false,
      showNavigation: false,
      renderer: 'svg',
    }) as { create: (k: string, p: unknown[], a: unknown) => JxgObj };

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
        az: { slider: { visible: false }, value: state.view.azimuth },
        el: { slider: { visible: false }, value: state.view.elevation },
        projection: 'central',
      },
    );

    if (!state.showAxes) {
      (view as { defaultAxes?: unknown[] }).defaultAxes = [];
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
