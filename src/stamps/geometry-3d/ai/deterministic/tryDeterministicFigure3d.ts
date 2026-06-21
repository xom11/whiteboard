import type { State } from '../../../../core/scene';
import type { Intent3DT } from '../intent';
import type { CoverageReport3D } from './coverage3d';
import { runDeterministicIntents3d } from './runDeterministicIntents3d';
import { intentToScene3d } from '../intentToScene3d';
import { verifyFigure3d } from '../verify3d';
import { allNamedEntities3DPresent } from './guards3d';

export type Reason3D =
  | 'no-match'
  | 'incomplete-coverage'
  | 'build-throw'
  | 'verify-fail'
  | 'named-missing';

export type TryResult3D =
  | { ok: true; state: State; intents: Intent3DT[]; coverage: CoverageReport3D }
  | { ok: false; reason: Reason3D; detail?: string; coverage?: CoverageReport3D };

/**
 * Track-A engine entry: chạy rule engine → build scene → verify → named-entity guard.
 * intentToScene3d đã topo-sort nội bộ (Bundle 2), nên không cần retry topo ở đây.
 */
export function tryDeterministicFigure3d(problem: string): TryResult3D {
  const det = runDeterministicIntents3d(problem);
  if (!det.ok) return { ok: false, reason: det.reason, coverage: det.coverage };

  let state: State;
  try {
    state = intentToScene3d(det.intents);
  } catch (e) {
    return {
      ok: false,
      reason: 'build-throw',
      detail: (e as Error).message,
      coverage: det.coverage,
    };
  }

  const v = verifyFigure3d(state);
  if (!v.ok) {
    return {
      ok: false,
      reason: 'verify-fail',
      detail: v.issues.join('; '),
      coverage: det.coverage,
    };
  }

  const named = allNamedEntities3DPresent(problem, state);
  if (!named.ok) {
    return {
      ok: false,
      reason: 'named-missing',
      detail: named.missing.join(','),
      coverage: det.coverage,
    };
  }

  return { ok: true, state, intents: det.intents, coverage: det.coverage };
}
