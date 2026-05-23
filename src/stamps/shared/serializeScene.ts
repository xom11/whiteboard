// Shared serialize/deserialize cho scene State của stamp interactive
// (geometry-2d, geometry-3d, graph-2d). Sau Tier D PR 3, customData chỉ
// store JSON.stringify(state) — không còn envelope `{version, bbox, state}`.
//
// View info (bbox/axis/grid/azimuth/elevation) nằm trong `state.meta.view`
// (discriminated union theo domain). createEmptyState set default view.
//
// Note: v0.20 KHÔNG support backward-compat envelope cũ. Data sessionStorage
// cũ sẽ fallback về empty state khi parse fail (per user spec).

import { createEmptyState, type Domain, type State } from '../../core/scene';

export function serializeScene(state: State): string {
  return JSON.stringify(state);
}

function isValidState(value: unknown, domain: Domain): value is State {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<State>;
  if (!v.meta || typeof v.meta !== 'object') return false;
  if (v.meta.domain !== domain) return false;
  if (!v.meta.view || typeof v.meta.view !== 'object') return false;
  if (!v.objects || typeof v.objects !== 'object') return false;
  if (!Array.isArray(v.order)) return false;
  return true;
}

export function deserializeScene(domain: Domain, raw: string): State {
  if (!raw) return createEmptyState(domain);
  try {
    const parsed = JSON.parse(raw);
    if (isValidState(parsed, domain)) return parsed;
  } catch {
    /* swallow — fallback empty state */
  }
  return createEmptyState(domain);
}
