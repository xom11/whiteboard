// __tests__/intentToScene3d.metric.test.ts
//
// Full-pipeline numeric test: runRules3D → intentToScene3d.
// Confirms that a hình chiếu problem produces the expected scene objects:
//   • a foot point3d with label 'H'
//   • at least one segment3d (distance segment S→H)
//   • a polyhedron3d (the solid)
//
// This does NOT use LLM; it exercises the deterministic rules→scene path directly.
import { runRules3D } from '../rules/registry';
import { segmentClauses3D } from '../deterministic/coverage3d';
import { intentToScene3d } from '../intentToScene3d';

function scene(p: string) {
  const intents = runRules3D({ problem: p, clauses: segmentClauses3D(p) }).flatMap((m) => m.intents);
  return intentToScene3d(intents as any) as any;
}

it('full pipeline: hình chiếu problem renders foot point + distance segment, no throw', () => {
  const st = scene('Cho hình chóp S.ABCD có đáy là hình vuông. Gọi H là hình chiếu của S lên mặt đáy.');
  expect(Object.values(st.objects).some((o: any) => o.kind === 'point3d' && o.label === 'H')).toBe(true);
  expect(Object.values(st.objects).some((o: any) => o.kind === 'segment3d')).toBe(true);
  expect(Object.values(st.objects).some((o: any) => o.kind === 'polyhedron3d')).toBe(true);
});
