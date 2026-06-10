import { arcMidpointRule } from '../src/stamps/geometry-2d/ai/rules/arcMidpoint';
import { segmentClauses } from '../src/stamps/geometry-2d/ai/deterministic/coverage';
import { normalizeProblemText } from '../src/stamps/geometry-2d/ai/deterministic/normalizeText';
const t = normalizeProblemText('Cho nửa đường tròn (O) đường kính AB = 2R. Gọi C là điểm chính giữa của cung AB. Trên cung BC lấy điểm M.');
const clauses = segmentClauses(t);
for (const c of clauses) console.log(c.id, c.hasGeometry, JSON.stringify(c.text));
console.log('arcMidpoint:', JSON.stringify(arcMidpointRule.match({problem:t,clauses}).flatMap(m=>m.intents)));
