/**
 * preview3d.ts — Transient "ghost" shape that tracks the cursor between clicks
 * for multi-point tools (segment / line / ray / vector / polygon / plane /
 * sphere / pyramid / prism / tetrahedron / cube / cylinder / cone).
 *
 * Lifecycle:
 *   - Constructed once per editor session when view3D is ready.
 *   - `update(tool, collected, hoverHit)` rebuilds the preview from scratch on
 *     every pointer move. Cheap because we only create a handful of JSXGraph
 *     primitives.
 *   - `clear()` removes everything (called on tool change / cancel / build).
 *   - `dispose()` final teardown.
 *
 * Coordinates are derived from the same hit-test path used by the controller,
 * so the phantom point lands exactly where the next real point would land if
 * the user clicked now.
 */

import type { Store } from '../../../core/scene';
import type { Point3DAttrs } from '../../../core/scene/kinds/point3d';
import { constraintToWorld, type Vec3 } from './scene/constraintMath';
import type { SceneHit } from './hitTest/hitTest';
import type { CollectedArg, ToolKey } from './tools/spec';

 
type JxgView3D = any;
 
type JxgEl = any;

const PREVIEW_STYLE = {
  strokeColor: '#3b82f6',
  strokeWidth: 1.5,
  strokeOpacity: 0.7,
  dash: 2,
  fixed: true,
  highlight: false,
  withLabel: false,
} as const;

export class Preview3DManager {
  private view: JxgView3D;
  private store: Store;
  private phantom: JxgEl | null = null;
  private pickPts: JxgEl[] = [];
  private shapes: JxgEl[] = [];
  private disposed = false;

  constructor(view: JxgView3D, store: Store) {
    this.view = view;
    this.store = store;
  }

  clear(): void {
    const v = this.view as { removeObject?: (e: unknown) => void };
    for (const s of this.shapes) {
      try { v.removeObject?.(s); } catch { /* ignore */ }
    }
    this.shapes = [];
    for (const p of this.pickPts) {
      try { v.removeObject?.(p); } catch { /* ignore */ }
    }
    this.pickPts = [];
    if (this.phantom) {
      try { v.removeObject?.(this.phantom); } catch { /* ignore */ }
      this.phantom = null;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.clear();
    this.disposed = true;
  }

  /**
   * Rebuild the preview from scratch using the controller's current `tool` +
   * `collected` args + the live `hoverHit` from the most recent pointer move.
   *
   * Returns early (and clears) when there's nothing to preview:
   *  - no tool selected
   *  - no points collected yet
   *  - hover is empty / off-surface
   *  - any collected arg lacks a hit (number steps)
   */
  update(tool: ToolKey | null, collected: CollectedArg[], hoverHit: SceneHit): void {
    if (this.disposed) return;
    this.clear();
    if (!tool || tool === 'move') return;
    if (collected.length === 0) return;
    if (hoverHit.kind === 'empty') return;

    const phantomCoords = this.hitToCoords(hoverHit);
    if (!phantomCoords) return;

    const pickCoords: Vec3[] = [];
    for (const c of collected) {
      if (!c.hit) return;
      const coords = this.hitToCoords(c.hit);
      if (!coords) return;
      pickCoords.push(coords);
    }

    try {
      this.phantom = this.view.create('point3d', phantomCoords, {
        visible: false, fixed: true, withLabel: false, name: '',
      });
    } catch { return; }

    for (const coords of pickCoords) {
      try {
        const p = this.view.create('point3d', coords, {
          visible: false, fixed: true, withLabel: false, name: '',
        });
        this.pickPts.push(p);
      } catch { return; }
    }

    this.buildShape(tool);
  }

  private buildShape(tool: ToolKey): void {
    const phantom = this.phantom;
    const picks = this.pickPts;
    if (!phantom || picks.length === 0) return;
    const last = picks[picks.length - 1];

    try {
      switch (tool) {
        case 'segment':
          this.shapes.push(this.makeLine3d(picks[0], phantom, false, false));
          return;
        case 'line':
          this.shapes.push(this.makeLine3d(picks[0], phantom, true, true));
          return;
        case 'ray':
          this.shapes.push(this.makeLine3d(picks[0], phantom, false, true));
          return;
        case 'vector':
          this.shapes.push(this.view.create('line3d', [picks[0], phantom], {
            ...PREVIEW_STYLE,
            straightFirst: false,
            straightLast: false,
            lastArrow: { type: 1 },
          }));
          return;
        case 'polygon':
        case 'pyramid':
        case 'prism': {
          for (let i = 0; i < picks.length - 1; i += 1) {
            this.shapes.push(this.makeLine3d(picks[i], picks[i + 1], false, false));
          }
          this.shapes.push(this.makeLine3d(last, phantom, false, false));
          if (picks.length >= 2) {
            this.shapes.push(this.makeLine3d(picks[0], phantom, false, false));
          }
          return;
        }
        case 'plane': {
          if (picks.length === 1) {
            this.shapes.push(this.makeLine3d(picks[0], phantom, false, false));
          } else if (picks.length === 2) {
            this.shapes.push(this.makeLine3d(picks[0], picks[1], false, false));
            this.shapes.push(this.makeLine3d(picks[1], phantom, false, false));
            this.shapes.push(this.makeLine3d(picks[0], phantom, false, false));
          }
          return;
        }
        case 'sphere': {
          this.shapes.push(this.view.create('sphere3d', [picks[0], phantom], {
            ...PREVIEW_STYLE,
            fillColor: 'none',
            fillOpacity: 0,
          }));
          return;
        }
        case 'tetrahedron':
        case 'cube':
        case 'cylinder':
        case 'cone':
          this.shapes.push(this.makeLine3d(picks[0], phantom, false, false));
          return;
        default:
          return;
      }
    } catch { /* ignore */ }
  }

  private makeLine3d(a: JxgEl, b: JxgEl, straightFirst: boolean, straightLast: boolean): JxgEl {
    return this.view.create('line3d', [a, b], {
      ...PREVIEW_STYLE,
      straightFirst,
      straightLast,
    });
  }

  private hitToCoords(hit: SceneHit): Vec3 | null {
    if (hit.kind === 'existingPoint') {
      const obj = this.store.getState().objects[hit.pointId];
      if (!obj || obj.kind !== 'point3d') return null;
      return constraintToWorld((obj.attrs as Point3DAttrs).constraint, this.store.getState());
    }
    if ('world' in hit) return hit.world;
    return null;
  }
}
