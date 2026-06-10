import { runRules } from '../src/stamps/geometry-2d/ai/rules/registry';
import { segmentClauses } from '../src/stamps/geometry-2d/ai/deterministic/coverage';
import { normalizeProblemText } from '../src/stamps/geometry-2d/ai/deterministic/normalizeText';
for (const raw of [
  'Cho tam giác ABC nhọn. Các đường cao AD, BE, CF cắt nhau tại H.',
  'Cho tam giác ABC nhọn. Hai đường cao BD và CE cắt nhau tại H.',
]) {
  const t = normalizeProblemText(raw);
  console.log('\n===', JSON.stringify(raw));
  const clauses = segmentClauses(t);
  const matches = runRules({ problem: t, clauses: clauses.filter(c=>c.hasGeometry) });
  for (const m of matches) console.log(' ', m.ruleId, JSON.stringify(m.clauseIds), '→', m.intents.map((i:any)=>i.op+(i.shape?'/'+i.shape:i.constraint?'/'+i.constraint.kind:i.spec?'/'+i.spec:i.kind?'/'+i.kind:'')+(i.name?`(${i.name})`:'')).join(','));
}
