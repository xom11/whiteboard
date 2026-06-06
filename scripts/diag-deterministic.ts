// scripts/diag-deterministic.ts — chẩn đoán deterministic-first path end-to-end.
// npx tsx scripts/diag-deterministic.ts
import { runDeterministicIntents } from '../src/stamps/geometry-2d/ai/deterministic/runDeterministicIntents';
import { allNamedEntitiesPresent } from '../src/stamps/geometry-2d/ai/deterministic/guards';
import { normalizeIntents } from '../src/stamps/geometry-2d/ai/normalizeIntent';
import { resolveCircleNameCollisions } from '../src/stamps/geometry-2d/ai/resolveCircleNames';
import { intentsToDsl } from '../src/stamps/geometry-2d/ai/intentToDsl';
import { transpile } from '../src/stamps/geometry-2d/dsl';
import { verifyGeometry } from '../src/stamps/geometry-2d/ai/verify';

const PROBLEMS: string[] = [
  'Cho tam giác ABC. Gọi M là trung điểm BC',
  'Cho tam giác ABC. Gọi G là trọng tâm tam giác ABC',
  'Cho tam giác ABC. Kẻ đường cao AH',
  'Cho tam giác ABC. Gọi H là hình chiếu của A trên BC',
  'Cho hình vuông ABCD',
  'Cho hình chữ nhật ABCD',
  'Cho tam giác ABC vuông tại A. Gọi M là trung điểm BC',
  'Cho tam giác ABC cân tại A. Kẻ trung tuyến AM',
  'Cho đường tròn tâm O bán kính 3',
  'Cho đường tròn (O; 3)',
  'Cho tam giác ABC. Vẽ đường tròn ngoại tiếp tam giác ABC',
  'Cho tam giác ABC. Vẽ đường tròn nội tiếp tam giác ABC',
  'Cho tam giác ABC. Gọi H là trực tâm của tam giác ABC',
  'Cho tam giác ABC. Đường trung trực của BC cắt AB tại D',
  // escalate-expected (medium-hard, chưa có rule):
  'Cho tam giác ABC. Trên cạnh AB lấy điểm D sao cho AD = 2DB',
  'Cho tam giác ABC. Tính diện tích tam giác ABC',
];

let det = 0;
let escalate = 0;
for (const p of PROBLEMS) {
  const r = runDeterministicIntents(p);
  if (!r.ok) {
    escalate++;
    console.log(`ESCALATE  [${r.reason} cov=${r.coverage.ratio.toFixed(2)} uncov=${r.coverage.uncovered.map((c) => `"${c.text}"`).join('|')}]  ${p}`);
    continue;
  }
  const norm = resolveCircleNameCollisions(normalizeIntents(r.intents, p));
  let dsl: ReturnType<typeof intentsToDsl>;
  try {
    dsl = intentsToDsl(norm);
  } catch (e) {
    console.log(`BUILD-THROW  ${p}\n   → ${e instanceof Error ? e.message : String(e)}`);
    continue;
  }
  let t: ReturnType<typeof transpile>;
  try {
    t = transpile(dsl);
  } catch (e) {
    console.log(`TRANSPILE-THROW  ${p}\n   → ${e instanceof Error ? e.message : String(e)}`);
    continue;
  }
  if (!t.ok) {
    console.log(`TRANSPILE-FAIL  ${p}\n   → ${t.errors.map((e) => `${e.code}:${e.message}`).join(' ; ')}`);
    continue;
  }
  const named = allNamedEntitiesPresent(p, dsl);
  if (!named.ok) {
    escalate++;
    console.log(`ESCALATE  [named-missing: ${named.missing.join(',')}]  ${p}`);
    continue;
  }
  const v = verifyGeometry(norm, dsl);
  det++;
  const intentKinds = norm.map((i: any) => i.op + (i.constraint ? `/${i.constraint.kind}` : i.shape ? `/${i.shape}` : i.spec ? `/${i.spec}` : i.kind ? `/${i.kind}` : '')).join(', ');
  console.log(`DET ${v.ok ? 'OK ' : 'VERIFY-FAIL'}  ${p}\n   intents: ${intentKinds}`);
}
console.log(`\n=== ${det} deterministic-render, ${escalate} escalate, ${PROBLEMS.length - det - escalate} broken ===`);
