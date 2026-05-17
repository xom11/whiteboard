import { Scene3D } from './Scene3D';
import type { Constraint, Scene3DObject } from './types';
import type { SerializedBoard3D, SerializedElement3D } from '../../serialize';
import { constraintToWorld } from './constraintMath';

/**
 * Translate a live Scene3D into a v2 SerializedBoard3D.
 *
 * Strategy: each Scene3DObject becomes one or more SerializedElement3D entries.
 * Points carry an explicit `constraint` field. Derived objects (segment/line/
 * polygon/...) reference the point ids via `attributes.sceneSpec` so
 * round-trip is unambiguous, and `parents` is left empty (the loader
 * reconstructs from `sceneSpec` rather than `parents` at load time).
 */
export function sceneToBoard(
  scene: Scene3D,
  view: { azimuth: number; elevation: number; bbox3D: [number, number, number, number, number, number] },
  bbox: [number, number, number, number],
): SerializedBoard3D {
  const elements: SerializedElement3D[] = [];
  for (const obj of scene.list()) {
    const els = sceneObjectToElements(obj, scene);
    elements.push(...els);
  }
  return { version: 2, bbox, view, showAxes: true, showMesh: true, elements };
}

function sceneObjectToElements(obj: Scene3DObject, scene: Scene3D): SerializedElement3D[] {
  const baseAttrs = { label: obj.label, visible: obj.visible, color: obj.color };
  switch (obj.kind) {
    case 'point': {
      let w: [number, number, number];
      try {
        w = constraintToWorld(obj.constraint, scene);
      } catch {
        // If dependent objects are missing, fall back to origin so the entry
        // still serializes; loader uses `constraint` (not parents) for v2.
        w = [0, 0, 0];
      }
      return [{
        type: 'point3d',
        parents: [w[0], w[1], w[2]],
        attributes: { id: obj.id, ...baseAttrs },
        id: obj.id,
        label: obj.label,
        constraint: obj.constraint,
      }];
    }
    case 'segment':
    case 'line':
    case 'ray':
    case 'vector':
    case 'plane':
    case 'sphere':
    case 'polygon':
    case 'polyhedron':
    case 'cylinder':
    case 'cone': {
      return [{
        type: pickJxgType(obj.kind),
        parents: [],
        attributes: { id: obj.id, ...baseAttrs, sceneKind: obj.kind, sceneSpec: encodeSpec(obj) },
        id: obj.id,
        label: obj.label,
      }];
    }
  }
}

function pickJxgType(kind: Scene3DObject['kind']): SerializedElement3D['type'] {
  switch (kind) {
    case 'point': return 'point3d';
    case 'segment':
    case 'line':
    case 'ray':
    case 'vector': return 'line3d';
    case 'plane': return 'plane3d';
    case 'sphere': return 'sphere3d';
    case 'polygon':
    case 'polyhedron':
    case 'cylinder':
    case 'cone': return 'polygon3d';
  }
}

function encodeSpec(obj: Scene3DObject): Record<string, unknown> {
  // Strip the base/identity fields; the rest is the kind-specific spec that
  // boardToScene needs to reconstruct the object. `kind` is preserved in the
  // sibling `sceneKind` attribute so it isn't duplicated here.
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'id' || k === 'label' || k === 'visible' || k === 'color' || k === 'kind') continue;
    rest[k] = v;
  }
  return rest;
}

/**
 * Reconstruct a Scene3D from a SerializedBoard3D. Accepts both v1 (legacy,
 * no constraints) and v2 (new format).
 *
 * For v1: every point3d becomes `kind: 'free'`, and derived objects with our
 * `sceneSpec` attribute are skipped (legacy stamps don't carry sceneSpec, so
 * the loop won't see them; this is correct).
 *
 * For v2: each element carries `constraint` (points) or `sceneSpec` (derived)
 * and we reconstruct the full Scene3DObject.
 */
export function boardToScene(board: SerializedBoard3D): Scene3D {
  const scene = new Scene3D();
  for (const el of board.elements) {
    if (el.type === 'point3d') {
      const constraint: Constraint = el.constraint ?? {
        kind: 'free',
        x: Number(el.parents[0] ?? 0),
        y: Number(el.parents[1] ?? 0),
        z: Number(el.parents[2] ?? 0),
      };
      const color = (el.attributes['color'] as string | undefined);
      const visible = el.attributes['visible'] !== false;
      try {
        scene.insert({
          kind: 'point',
          id: el.id,
          label: el.label ?? el.id,
          visible,
          color,
          constraint,
        });
      } catch {
        // Skip duplicates / malformed.
      }
      continue;
    }
    // Derived object — only v2 carries `sceneSpec`
    const sceneKind = el.attributes['sceneKind'] as string | undefined;
    const sceneSpec = el.attributes['sceneSpec'] as Record<string, unknown> | undefined;
    if (!sceneKind || !sceneSpec) continue;
    const color = el.attributes['color'] as string | undefined;
    const visible = el.attributes['visible'] !== false;
    const obj = {
      id: el.id,
      label: el.label ?? el.id,
      visible,
      color,
      kind: sceneKind,
      ...sceneSpec,
    } as unknown as Scene3DObject;
    try {
      scene.insert(obj);
    } catch {
      // Skip malformed entries / duplicates.
    }
  }
  return scene;
}
