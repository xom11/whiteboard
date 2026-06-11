// src/stamps/geometry-2d/ai/intentTopo.ts
//
// Stable topological reorder cho IntentT[] theo quan hệ produce/consume TÊN:
//   - produce: draw-shape→labels; add-point/draw-circle/draw-line→name.
//   - consume: mọi string value trong intent (deep) resolve được về tên đã
//     produce — trực tiếp ("M", "O_c", "d") hoặc tách cặp đỉnh longest-prefix
//     ("BC"→B+C, "B1C1"→B1+C1, như splitKnownPair của intent-builders).
//
// Stable Kahn (giống dsl/transpile/topology.ts): thứ tự ĐÃ hợp lệ giữ NGUYÊN
// 100% (mỗi pass quét theo thứ tự gốc); chỉ intent đứng trước producer của nó
// mới bị trì hoãn. Cycle/ref không ai produce → không chặn, append thứ tự gốc
// (transpile fail-safe escalate như cũ).
//
// Dùng làm RETRY trong buildAndTranspile (tryDeterministicFigure) — KHÔNG chạy
// mặc định, vì builder có hành vi phụ thuộc thứ tự hợp lệ cần bảo toàn
// (defaultFreeCoord spread, uniqueShapeName) → case đang pass byte-identical.
import type { IntentT } from './intent';

/** Field mang tên do CHÍNH intent đó sinh ra — bỏ qua khi gom consume. */
const PRODUCE_FIELDS: Record<IntentT['op'], readonly string[]> = {
  'draw-shape': ['labels', 'explicitCoords'],
  'add-point': ['name'],
  'draw-circle': ['name'],
  'draw-line': ['name'],
  connect: [],
  'mark-shape': [],
};

function producesOf(intent: IntentT): string[] {
  switch (intent.op) {
    case 'draw-shape':
      return [...intent.labels];
    case 'add-point':
    case 'draw-circle':
    case 'draw-line':
      return [intent.name];
    case 'connect':
    case 'mark-shape':
      return [];
  }
}

function walkStrings(val: unknown, skipKeys: ReadonlySet<string>, out: string[]): void {
  if (typeof val === 'string') {
    out.push(val);
    return;
  }
  if (Array.isArray(val)) {
    for (const v of val) walkStrings(v, skipKeys, out);
    return;
  }
  if (val && typeof val === 'object') {
    for (const [k, v] of Object.entries(val)) {
      if (skipKeys.has(k)) continue;
      walkStrings(v, skipKeys, out);
    }
  }
}

/** Token → các tên đã-produce mà nó tham chiếu ([] nếu không resolve được). */
function resolveToken(token: string, produced: ReadonlySet<string>): string[] {
  if (produced.has(token)) return [token];
  // Cặp đỉnh ghép ("BC", "B1C1", "AH'") — longest-prefix như splitKnownPair.
  for (let i = token.length - 1; i >= 1; i--) {
    const a = token.slice(0, i);
    const b = token.slice(i);
    if (produced.has(a) && produced.has(b)) return [a, b];
  }
  return [];
}

export function orderIntentsByDependency(intents: readonly IntentT[]): IntentT[] {
  const producesArr = intents.map(producesOf);
  // name → index intent ĐẦU TIÊN produce nó (addPoint idempotent first-wins).
  const producerIdx = new Map<string, number>();
  producesArr.forEach((names, i) => {
    for (const n of names) if (!producerIdx.has(n)) producerIdx.set(n, i);
  });
  const produced = new Set(producerIdx.keys());

  const depsArr = intents.map((intent, i) => {
    const skip = new Set<string>(['op', ...PRODUCE_FIELDS[intent.op]]);
    const tokens: string[] = [];
    walkStrings(intent, skip, tokens);
    const own = new Set(producesArr[i]);
    const deps = new Set<number>();
    for (const t of tokens) {
      for (const name of resolveToken(t, produced)) {
        if (own.has(name)) continue;
        const pi = producerIdx.get(name);
        if (pi !== undefined && pi !== i) deps.add(pi);
      }
    }
    return deps;
  });

  const emitted = new Set<number>();
  const order: number[] = [];
  let progressed = true;
  while (progressed && order.length < intents.length) {
    progressed = false;
    for (let i = 0; i < intents.length; i++) {
      if (emitted.has(i)) continue;
      let ready = true;
      for (const d of depsArr[i]) {
        if (!emitted.has(d)) {
          ready = false;
          break;
        }
      }
      if (ready) {
        emitted.add(i);
        order.push(i);
        progressed = true;
      }
    }
  }
  // Cycle leftovers: append theo thứ tự gốc (fail-safe, đủ phần tử).
  for (let i = 0; i < intents.length; i++) {
    if (!emitted.has(i)) order.push(i);
  }
  return order.map((i) => intents[i]);
}
