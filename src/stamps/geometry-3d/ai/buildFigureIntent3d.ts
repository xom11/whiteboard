import type { State } from '../../../core/scene';
import type { Intent3DT } from './intent';
import { tryDeterministicFigure3d } from './deterministic/tryDeterministicFigure3d';

/**
 * Track-A only: deterministic rule engine → State.
 * LLM fallback deferred to a later phase.
 */
export function generateFigureIntent3d(
  problem: string,
): { ok: true; state: State; intents: Intent3DT[] } | { ok: false; reason: string; detail?: string } {
  const r = tryDeterministicFigure3d(problem);
  if (r.ok) return { ok: true, state: r.state, intents: r.intents };
  return { ok: false, reason: r.reason, detail: r.detail };
}
