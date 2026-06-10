import { externalPointRule } from '../src/stamps/geometry-2d/ai/rules/externalPoint';
import { segmentClauses } from '../src/stamps/geometry-2d/ai/deterministic/coverage';
import { normalizeProblemText } from '../src/stamps/geometry-2d/ai/deterministic/normalizeText';
const t = normalizeProblemText('Cho đường tròn (O) và dây AB. Lấy điểm C nằm ngoài đường tròn và nằm trên tia đối của tia AB. Kẻ các tiếp tuyến CP, CQ với đường tròn.');
const clauses = segmentClauses(t);
for (const c of clauses) console.log(c.id, c.hasGeometry, JSON.stringify(c.text));
console.log('externalPoint:', JSON.stringify(externalPointRule.match({problem:t, clauses})));
