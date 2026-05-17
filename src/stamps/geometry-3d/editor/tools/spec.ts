import type { Scene3D } from '../scene/Scene3D';
import type { SceneHit } from '../hitTest/hitTest';
import { buildPoint, buildPointOnObject } from './handlers/point';
import { buildSegment, buildLine, buildRay, buildVector } from './handlers/segment';
import { buildPolygon } from './handlers/polygon';
import { buildPlane } from './handlers/plane';
import { buildPyramid } from './handlers/pyramid';
import { buildPrism } from './handlers/prism';
import { buildTetrahedron } from './handlers/tetrahedron';
import { buildCube } from './handlers/cube';
import { buildSphere } from './handlers/sphere';
import { buildCylinder } from './handlers/cylinder';
import { buildCone } from './handlers/cone';

export type ToolKey =
  | 'move' | 'point' | 'pointOnObject'
  | 'segment' | 'line' | 'ray' | 'vector' | 'polygon'
  | 'plane' | 'pyramid' | 'prism' | 'tetrahedron' | 'cube'
  | 'sphere' | 'cylinder' | 'cone';

export type ToolStep =
  | {
      type: 'point';
      allowExisting: boolean;
      allowNewOn: Array<'ground' | 'axis' | 'plane' | 'line' | 'polygon' | 'sphere'>;
      hint: string;
    }
  | { type: 'closingPoint'; hint: string }
  | { type: 'object'; kinds: Array<'plane' | 'polygon' | 'line' | 'sphere' | 'polyhedron'>; hint: string }
  | { type: 'number'; prompt: string; min?: number; max?: number };

export interface CollectedArg {
  step: ToolStep;
  hit?: SceneHit;
  value?: number;
}

export interface ToolSpec {
  key: ToolKey;
  label: string;
  hintIdle: string;
  steps: ToolStep[];
  build(args: CollectedArg[], scene: Scene3D): string | null;
  /**
   * If true, after build completes the controller re-enters step 0 of this
   * tool (clearing collected args) instead of switching to 'move'. Used by
   * the Point tool so the user can place several points in a row.
   */
  repeatAfterBuild?: boolean;
}

const stubBuild = (): string | null => null;

const ALL_SURFACES: Array<'ground' | 'axis' | 'plane' | 'line' | 'polygon' | 'sphere'> =
  ['ground', 'axis', 'plane', 'line', 'polygon', 'sphere'];

const OBJECT_ONLY: Array<'ground' | 'axis' | 'plane' | 'line' | 'polygon' | 'sphere'> =
  ['plane', 'line', 'polygon', 'sphere'];

const NO_SURFACE: Array<'ground' | 'axis' | 'plane' | 'line' | 'polygon' | 'sphere'> =
  ['ground', 'axis', 'plane'];

export const TOOLS: ToolSpec[] = [
  {
    key: 'move',
    label: 'Di chuyển',
    hintIdle: 'Kéo điểm hoặc xoay khung',
    steps: [],
    build: stubBuild,
  },
  {
    key: 'point',
    label: 'Điểm',
    hintIdle: 'Click trên mặt phẳng Oxy hoặc trên trục để đặt điểm',
    steps: [
      {
        type: 'point',
        allowExisting: false,
        // GeoGebra-style: a new point must lie on the XY ground plane or on
        // one of the coordinate axes (Oz lets you place points off the plane).
        allowNewOn: ['ground', 'axis'],
        hint: 'Click trên mặt phẳng Oxy hoặc trục Ox/Oy/Oz',
      },
    ],
    build: buildPoint,
    repeatAfterBuild: true,
  },
  {
    key: 'pointOnObject',
    label: 'Điểm trên đối tượng',
    hintIdle: 'Chọn một đối tượng để đặt điểm',
    steps: [{ type: 'point', allowExisting: false, allowNewOn: OBJECT_ONLY, hint: 'Click lên mặt / đường để đặt điểm' }],
    build: buildPointOnObject,
  },
  {
    key: 'segment',
    label: 'Đoạn thẳng',
    hintIdle: 'Chọn 2 điểm để vẽ đoạn thẳng',
    steps: [
      { type: 'point', allowExisting: true, allowNewOn: ALL_SURFACES, hint: 'Chọn điểm thứ nhất' },
      { type: 'point', allowExisting: true, allowNewOn: ALL_SURFACES, hint: 'Chọn điểm thứ hai' },
    ],
    build: buildSegment,
  },
  {
    key: 'line',
    label: 'Đường thẳng',
    hintIdle: 'Chọn 2 điểm để vẽ đường thẳng',
    steps: [
      { type: 'point', allowExisting: true, allowNewOn: ALL_SURFACES, hint: 'Chọn điểm thứ nhất' },
      { type: 'point', allowExisting: true, allowNewOn: ALL_SURFACES, hint: 'Chọn điểm thứ hai' },
    ],
    build: buildLine,
  },
  {
    key: 'ray',
    label: 'Tia',
    hintIdle: 'Chọn điểm gốc rồi điểm trên tia',
    steps: [
      { type: 'point', allowExisting: true, allowNewOn: ALL_SURFACES, hint: 'Chọn điểm gốc' },
      { type: 'point', allowExisting: true, allowNewOn: ALL_SURFACES, hint: 'Chọn điểm trên tia' },
    ],
    build: buildRay,
  },
  {
    key: 'vector',
    label: 'Vector',
    hintIdle: 'Chọn 2 điểm để vẽ vector',
    steps: [
      { type: 'point', allowExisting: true, allowNewOn: ALL_SURFACES, hint: 'Chọn điểm đầu' },
      { type: 'point', allowExisting: true, allowNewOn: ALL_SURFACES, hint: 'Chọn điểm cuối' },
    ],
    build: buildVector,
  },
  {
    key: 'polygon',
    label: 'Đa giác',
    hintIdle: 'Chọn các đỉnh; click điểm đầu để đóng',
    steps: [
      { type: 'point', allowExisting: true, allowNewOn: ALL_SURFACES, hint: 'Chọn đỉnh thứ 1' },
      { type: 'point', allowExisting: true, allowNewOn: ALL_SURFACES, hint: 'Chọn đỉnh thứ 2' },
      { type: 'point', allowExisting: true, allowNewOn: ALL_SURFACES, hint: 'Chọn đỉnh thứ 3' },
      { type: 'closingPoint', hint: 'Click điểm đầu để đóng (hoặc chọn thêm đỉnh)' },
    ],
    build: buildPolygon,
  },
  {
    key: 'plane',
    label: 'Mặt phẳng (3 điểm)',
    hintIdle: 'Chọn 3 điểm để xác định mặt phẳng',
    steps: [
      { type: 'point', allowExisting: true, allowNewOn: ALL_SURFACES, hint: 'Chọn điểm thứ 1 của mặt phẳng' },
      { type: 'point', allowExisting: true, allowNewOn: ALL_SURFACES, hint: 'Chọn điểm thứ 2' },
      { type: 'point', allowExisting: true, allowNewOn: ALL_SURFACES, hint: 'Chọn điểm thứ 3' },
    ],
    build: buildPlane,
  },
  {
    key: 'pyramid',
    label: 'Hình chóp',
    hintIdle: 'Chọn đáy đa giác rồi chọn đỉnh chóp',
    steps: [
      { type: 'point', allowExisting: true, allowNewOn: NO_SURFACE, hint: 'Chọn đỉnh đáy 1' },
      { type: 'point', allowExisting: true, allowNewOn: NO_SURFACE, hint: 'Chọn đỉnh đáy 2' },
      { type: 'point', allowExisting: true, allowNewOn: NO_SURFACE, hint: 'Chọn đỉnh đáy 3' },
      { type: 'closingPoint', hint: 'Click đỉnh đáy đầu tiên để đóng (hoặc chọn thêm đỉnh)' },
      { type: 'point', allowExisting: true, allowNewOn: ALL_SURFACES, hint: 'Chọn đỉnh chóp' },
    ],
    build: buildPyramid,
  },
  {
    key: 'prism',
    label: 'Lăng trụ',
    hintIdle: 'Chọn đáy đa giác rồi nhập chiều cao',
    steps: [
      { type: 'point', allowExisting: true, allowNewOn: NO_SURFACE, hint: 'Chọn đỉnh đáy 1' },
      { type: 'point', allowExisting: true, allowNewOn: NO_SURFACE, hint: 'Chọn đỉnh đáy 2' },
      { type: 'point', allowExisting: true, allowNewOn: NO_SURFACE, hint: 'Chọn đỉnh đáy 3' },
      { type: 'closingPoint', hint: 'Click đỉnh đầu để đóng đáy' },
      { type: 'number', prompt: 'Chiều cao (theo trục z)', min: 0.0001 },
    ],
    build: buildPrism,
  },
  {
    key: 'tetrahedron',
    label: 'Tứ diện đều',
    hintIdle: 'Chọn 2 điểm xác định cạnh của tứ diện',
    steps: [
      { type: 'point', allowExisting: true, allowNewOn: NO_SURFACE, hint: 'Chọn điểm 1' },
      { type: 'point', allowExisting: true, allowNewOn: NO_SURFACE, hint: 'Chọn điểm 2' },
    ],
    build: buildTetrahedron,
  },
  {
    key: 'cube',
    label: 'Lập phương',
    hintIdle: 'Chọn 2 điểm trên nền xác định cạnh',
    steps: [
      { type: 'point', allowExisting: true, allowNewOn: ['ground'], hint: 'Chọn điểm 1 (trên nền)' },
      { type: 'point', allowExisting: true, allowNewOn: ['ground'], hint: 'Chọn điểm 2 (trên nền)' },
    ],
    build: buildCube,
  },
  {
    key: 'sphere',
    label: 'Mặt cầu',
    hintIdle: 'Chọn tâm rồi điểm trên mặt cầu',
    steps: [
      { type: 'point', allowExisting: true, allowNewOn: NO_SURFACE, hint: 'Chọn tâm mặt cầu' },
      { type: 'point', allowExisting: true, allowNewOn: ALL_SURFACES, hint: 'Chọn điểm trên mặt cầu' },
    ],
    build: buildSphere,
  },
  {
    key: 'cylinder',
    label: 'Hình trụ',
    hintIdle: 'Chọn tâm đáy, tâm trên, rồi nhập bán kính',
    steps: [
      { type: 'point', allowExisting: true, allowNewOn: NO_SURFACE, hint: 'Chọn tâm đáy' },
      { type: 'point', allowExisting: true, allowNewOn: NO_SURFACE, hint: 'Chọn tâm trên' },
      { type: 'number', prompt: 'Bán kính', min: 0.0001 },
    ],
    build: buildCylinder,
  },
  {
    key: 'cone',
    label: 'Hình nón',
    hintIdle: 'Chọn tâm đáy, đỉnh, rồi nhập bán kính',
    steps: [
      { type: 'point', allowExisting: true, allowNewOn: NO_SURFACE, hint: 'Chọn tâm đáy' },
      { type: 'point', allowExisting: true, allowNewOn: NO_SURFACE, hint: 'Chọn đỉnh' },
      { type: 'number', prompt: 'Bán kính', min: 0.0001 },
    ],
    build: buildCone,
  },
];

export const TOOL_GROUPS: Record<string, ToolKey[]> = {
  'Cơ bản': ['move', 'point', 'segment', 'line', 'plane'],
  'Điểm': ['point', 'pointOnObject'],
  'Đường thẳng': ['segment', 'line', 'ray', 'vector', 'polygon'],
  'Mặt phẳng': ['plane'],
  'Khối đa diện': ['pyramid', 'prism', 'tetrahedron', 'cube'],
  'Khối cong': ['sphere', 'cylinder', 'cone'],
};
