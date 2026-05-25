// src/stamps/geometry-2d/dsl/index.ts
export {
  NameZ,
  DslPoint,
  DslShape,
  DslInput,
} from './schema';

export type {
  DslPointT,
  DslShapeT,
  DslInputT,
} from './schema';

export type {
  TranspileError,
  TranspileErrorCode,
  TranspileResult,
} from './transpile/errors';

export { transpile } from './transpile';
