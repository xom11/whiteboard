import { runRules } from '../src/stamps/geometry-2d/ai/rules/registry';
import { segmentClauses } from '../src/stamps/geometry-2d/ai/deterministic/coverage';
import { normalizeProblemText } from '../src/stamps/geometry-2d/ai/deterministic/normalizeText';
const probs: Record<string,string> = {
  VD6:'Cho ABC là tam giác vuông tại A. Điểm D thuộc AC và E là điểm đối xứng với A qua BD, F là giao điểm của đường thẳng qua D vuông góc với BC và đường CE.',
  VD8:'Cho tam giác ABC (AB < AC) nội tiếp (O). Tia phân giác trong AD của tam giác ABC cắt (O) tại điểm E khác A. Gọi P là điểm đối xứng của A qua OD. Tiếp tuyến của (O) tại P và E cắt nhau tại H. Gọi Y = EC ∩ DH, K là giao điểm khác A của AY và (O).',
  BT3:'Cho tam giác ABC nội tiếp đường tròn (O). Đường phân giác của góc BAC cắt BC tại D và cắt (O) tại E khác A. Đường tròn đường kính DE cắt (O) tại F.',
};
for (const [k,raw] of Object.entries(probs)){
  const t=normalizeProblemText(raw);
  const clauses=segmentClauses(t).filter(c=>c.hasGeometry);
  console.log('\n===',k);
  for(const c of clauses) console.log('  cl',c.id,JSON.stringify(c.text));
  for(const m of runRules({problem:t,clauses})) console.log('  ',m.ruleId,JSON.stringify(m.clauseIds),'→',m.intents.map((i:any)=>(i.name||i.from||'')+':'+(i.constraint?.kind||i.spec||i.shape||i.style||i.kind||i.op)).join(', '));
}
