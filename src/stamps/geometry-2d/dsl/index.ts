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

// `transpile()` được wire trong PR 3. Stub tạm để barrel typecheck OK.
import type { TranspileResult } from './transpile/errors';
export function transpile(_dsl: unknown): TranspileResult {
  return {
    ok: false,
    errors: [{ code: 'SCHEMA', message: 'transpile not yet implemented (PR 3/4)' }],
  };
}
