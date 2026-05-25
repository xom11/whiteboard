// src/stamps/geometry-2d/dsl/transpile/errors.ts
import type { State } from '../../../../core/scene/types';

export type TranspileErrorCode =
  | 'SCHEMA'
  | 'DUPLICATE_NAME'
  | 'UNKNOWN_REF'
  | 'KIND_MISMATCH'
  | 'CYCLE';

export interface TranspileError {
  code: TranspileErrorCode;
  message: string;
  path?: string[];
  hint?: string;
}

export type TranspileResult =
  | { ok: true; state: State }
  | { ok: false; errors: TranspileError[] };

export function mkError(
  code: TranspileErrorCode,
  message: string,
  opts?: { path?: string[]; hint?: string },
): TranspileError {
  return { code, message, path: opts?.path, hint: opts?.hint };
}
