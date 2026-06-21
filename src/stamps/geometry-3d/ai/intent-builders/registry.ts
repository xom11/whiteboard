import type { Intent3DT } from '../intent';
import type { IntentBuilder3D } from './_types';
import { buildSolid } from './solid';
import { buildConnect } from './connect';
import { buildAddPoint3d } from './addPoint3d';
import { buildPlane3d } from './plane';
import { buildLine3d } from './line';
import { buildCrossSection } from './crossSection';
import { buildSphere } from './sphere';

export const OP_BUILDERS_3D: Record<Intent3DT['op'], IntentBuilder3D> = {
  solid: buildSolid,
  connect: buildConnect,
  'add-point-3d': buildAddPoint3d,
  plane: buildPlane3d,
  line: buildLine3d,
  'cross-section': buildCrossSection,
  sphere: buildSphere,
};
