import type { BaseStampCustomData } from '../shared/types';

export interface Geometry3DCustomData extends BaseStampCustomData {
  kind: 'geometry3d';
  version: 1;
  jsonState: string;
  svgWidth: number;
  svgHeight: number;
}

export function isGeometry3DCustomData(data: unknown): data is Geometry3DCustomData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<Geometry3DCustomData>;
  return d.kind === 'geometry3d' && d.version === 1 && typeof d.jsonState === 'string';
}

export type Element3DType =
  | 'point3d'
  | 'line3d'
  | 'plane3d'
  | 'polygon3d'
  | 'polyhedron3d'
  | 'sphere3d'
  | 'solidofrevolution3d'
  | 'text3d';

export interface SerializedElement3D {
  type: Element3DType;
  /**
   * Parents passed to JSXGraph view.create. Either literal values (numbers,
   * strings) or `"@id:<id>"` placeholder strings referencing earlier created
   * objects in the log (resolved at deserialize time).
   */
  parents: unknown[];
  attributes: Record<string, unknown>;
  id: string;
  label?: string;
}

export interface SerializedBoard3D {
  version: 1;
  bbox: [number, number, number, number];
  view: {
    azimuth: number;
    elevation: number;
    bbox3D: [number, number, number, number, number, number];
  };
  showAxes: boolean;
  showMesh: boolean;
  elements: SerializedElement3D[];
}

export function serializeBoard3D(state: SerializedBoard3D): string {
  return JSON.stringify(state);
}

export function parseSerializedBoard3D(json: string): SerializedBoard3D {
  const parsed = JSON.parse(json) as unknown;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('parseSerializedBoard3D: not an object');
  }
  const p = parsed as Partial<SerializedBoard3D>;
  if (p.version !== 1) {
    throw new Error(`parseSerializedBoard3D: unsupported version ${String(p.version)}`);
  }
  if (!Array.isArray(p.elements)) {
    throw new Error('parseSerializedBoard3D: elements missing');
  }
  return parsed as SerializedBoard3D;
}
