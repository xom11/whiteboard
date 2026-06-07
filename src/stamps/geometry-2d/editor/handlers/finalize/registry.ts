// finalize/registry.ts
import type { GeometryToolModule } from './_types';
import * as lines from './lines';
import * as circles from './circles';
import * as points from './points';
import * as polygons from './polygons';
import * as measure from './measure';

const ALL: GeometryToolModule[] = [
  ...Object.values(lines), ...Object.values(circles), ...Object.values(points),
  ...Object.values(polygons), ...Object.values(measure),
].filter((m): m is GeometryToolModule => !!m && typeof (m as any).finalize === 'function');

export const TOOL_MODULES: ReadonlyMap<string, GeometryToolModule> =
  new Map(ALL.map((m) => [m.key, m]));
