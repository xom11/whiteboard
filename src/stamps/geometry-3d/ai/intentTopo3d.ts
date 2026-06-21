import type { Intent3DT } from './intent';

/** Labels produced by an intent (available for downstream intents to reference). */
function producesOf(i: Intent3DT): string[] {
  switch (i.op) {
    case 'solid': {
      const out = [...i.baseLabels];
      if (i.apex) out.push(i.apex);
      if (i.topLabels) {
        out.push(...i.topLabels);
      } else if (i.flavor === 'prism' || i.flavor === 'box') {
        out.push(...i.baseLabels.map((l) => `${l}1`));
      }
      return out;
    }
    case 'add-point-3d': return [i.name];
    case 'plane': return [i.name];
    case 'line': return i.name ? [i.name] : [];
    case 'connect': return [];
    case 'cross-section': return i.name ? [i.name] : [];
    case 'sphere': return i.name ? [i.name] : [];
  }
}

// Keys that are part of an intent's "definition" (not reference fields).
const PRODUCE_KEYS = new Set([
  'op', 'baseLabels', 'apex', 'topLabels', 'name', 'flavor',
  'baseVariant', 'apexVariant', 'style',
]);

/**
 * Returns labels from `produced` that this intent consumes.
 * Walks all non-produce-key values recursively looking for strings in the
 * global produced set (excluding this intent's own produced labels).
 */
function consumesOf(i: Intent3DT, produced: Set<string>): string[] {
  const refs: string[] = [];
  const own = new Set(producesOf(i));

  const walk = (v: unknown): void => {
    if (typeof v === 'string') {
      if (produced.has(v) && !own.has(v)) refs.push(v);
      return;
    }
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }
    if (v && typeof v === 'object') {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (!PRODUCE_KEYS.has(k)) walk(val);
      }
    }
  };

  for (const [k, val] of Object.entries(i as Record<string, unknown>)) {
    if (PRODUCE_KEYS.has(k)) continue;
    walk(val);
  }
  return refs;
}

/**
 * Stable Kahn topological sort on intents.
 *
 * - produces = labels an intent makes available
 * - consumes = labels an intent references from previously produced labels
 * - Cycle leftovers are appended in original order (graceful degradation)
 */
export function orderIntents3dByDependency(intents: readonly Intent3DT[]): Intent3DT[] {
  // Build global produced set across all intents.
  const allProduced = new Set<string>();
  for (const i of intents) {
    for (const p of producesOf(i)) allProduced.add(p);
  }

  // Map from label → the intent that produces it (for edge-building).
  const producerOf = new Map<string, Intent3DT>();
  for (const i of intents) {
    for (const p of producesOf(i)) producerOf.set(p, i);
  }

  // Count how many "unresolved producer" dependencies each intent has.
  const inDegree = new Map<Intent3DT, number>();
  // Adjacency: producer → dependents.
  const dependents = new Map<Intent3DT, Set<Intent3DT>>();
  for (const i of intents) {
    inDegree.set(i, 0);
    dependents.set(i, new Set());
  }

  for (const i of intents) {
    const consumed = consumesOf(i, allProduced);
    const seen = new Set<Intent3DT>();
    for (const label of consumed) {
      const producer = producerOf.get(label);
      if (producer && producer !== i && !seen.has(producer)) {
        seen.add(producer);
        dependents.get(producer)!.add(i);
        inDegree.set(i, (inDegree.get(i) ?? 0) + 1);
      }
    }
  }

  // Stable Kahn: preserve original order among same-degree nodes by using
  // an ordered queue seeded from the original array.
  const result: Intent3DT[] = [];
  // Queue initialized with intents that have inDegree 0, in original order.
  const queue: Intent3DT[] = intents.filter((i) => inDegree.get(i) === 0).slice();

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    // Decrement dependents, add newly zero-degree ones in original array order.
    const ready: Intent3DT[] = [];
    for (const dep of dependents.get(node) ?? []) {
      const newDeg = (inDegree.get(dep) ?? 0) - 1;
      inDegree.set(dep, newDeg);
      if (newDeg === 0) ready.push(dep);
    }
    // Sort newly ready nodes by their original index to maintain stability.
    const originalOrder = new Map(intents.map((v, idx) => [v, idx]));
    ready.sort((a, b) => (originalOrder.get(a) ?? 0) - (originalOrder.get(b) ?? 0));
    queue.push(...ready);
  }

  // Append any cycle leftovers in original order.
  const placed = new Set(result);
  for (const i of intents) {
    if (!placed.has(i)) result.push(i);
  }

  return result;
}
