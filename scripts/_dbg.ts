import { tryPartialDeterministic } from '../src/stamps/geometry-2d/ai/deterministic/runDeterministicIntents';
import { normalizeIntents } from '../src/stamps/geometry-2d/ai/normalizeIntent';
import { resolveCircleNameCollisions } from '../src/stamps/geometry-2d/ai/resolveCircleNames';
import { intentsToDsl } from '../src/stamps/geometry-2d/ai/intentToDsl';
const p = process.argv[2];
const part = tryPartialDeterministic(p);
console.log('RAW intents:'); for (const i of part.detIntents) console.log(' ', JSON.stringify(i));
console.log('uncovered:', part.uncovered.map(c=>c.text));
try { const dsl = intentsToDsl(resolveCircleNameCollisions(normalizeIntents(part.detIntents, p)));
console.log('POINTS:', dsl.points.map(pt=>pt.name+':'+pt.kind).join(', '));
console.log('SHAPES:', dsl.shapes.map(s=>s.name+':'+s.kind).join(', ')); } catch(e){ console.log('BUILD ERR', String(e)); }
