// rules/__tests__/projectionFoot.test.ts
import { projectionFootRule } from '../projectionFoot';
import { segmentClauses3D } from '../../deterministic/coverage3d';

const run = (p: string) => projectionFootRule.match({ problem: p, clauses: segmentClauses3D(p) });
const flat = (p: string) => run(p).flatMap((m) => m.intents) as any[];

describe('projectionFootRule', () => {
  it('"Hình chiếu của S trên (ABC)" → perpFootPlane foot + ref plane + segment', () => {
    const I = flat('Cho hình chóp S.ABC. Hình chiếu vuông góc của S trên mặt phẳng (ABC) là điểm H.');
    expect(I.find((i) => i.op === 'plane')).toMatchObject({ name: 'mp_ABC', spec: { kind: 'threePoints', p1: 'A', p2: 'B', p3: 'C' } });
    const pt = I.find((i) => i.op === 'add-point-3d');
    expect(pt.constraint).toMatchObject({ kind: 'perpFootPlane', from: 'S', plane: 'mp_ABC' });
    expect(I.find((i) => i.op === 'connect')).toMatchObject({ from: 'S', to: pt.name });
  });

  it('"Hình chiếu của S trên mặt đáy" → base plane synth + perpFootPlane', () => {
    const I = flat('Cho hình chóp S.ABCD. Hình chiếu của S lên mặt đáy là H.');
    expect(I.find((i) => i.op === 'plane')).toMatchObject({ name: 'mp_ABC' });
    expect(I.find((i) => i.op === 'add-point-3d').constraint).toMatchObject({ kind: 'perpFootPlane', from: 'S', plane: 'mp_ABC' });
  });

  it('"Gọi H là hình chiếu của A trên cạnh SB" → perpFootLine, foot named H', () => {
    const I = flat('Cho hình chóp S.ABCD. Gọi H là hình chiếu vuông góc của A trên cạnh SB.');
    const pt = I.find((i) => i.op === 'add-point-3d');
    expect(pt).toMatchObject({ name: 'H', constraint: { kind: 'perpFootLine', from: 'A', a: 'S', b: 'B' } });
    expect(I.find((i) => i.op === 'connect')).toMatchObject({ from: 'A', to: 'H' });
  });

  it('"khoảng cách từ A đến (SBC)" → synth foot H_A + perpFootPlane + segment', () => {
    const I = flat('Cho hình chóp S.ABCD. Tính khoảng cách từ A đến mặt phẳng (SBC).');
    const pt = I.find((i) => i.op === 'add-point-3d');
    expect(pt).toMatchObject({ name: 'H_A', constraint: { kind: 'perpFootPlane', from: 'A', plane: 'mp_SBC' } });
    expect(I.find((i) => i.op === 'connect')).toMatchObject({ from: 'A', to: 'H_A' });
  });

  it('claims the clause it matched', () => {
    const m = run('Cho hình chóp S.ABC. Gọi H là hình chiếu của S trên (ABC).');
    expect(m.some((x) => x.clauseIds.length === 1)).toBe(true);
  });

  it('does not match a value-only clause', () => {
    expect(run('Khoảng cách đó bằng a căn 3.')).toEqual([]);
  });
});

import { intentToScene3d } from '../../intentToScene3d';
import { constraintToWorld } from '../../../../../core/scene/kinds/constraint3d-math';
import { solid } from '../../intent';

function sub(a: number[], b: number[]) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function cross(a: number[], b: number[]) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function norm(a: number[]) { return Math.hypot(a[0], a[1], a[2]); }

it('perpFootPlane foot builds coplanar with base + altitude ⊥ base', () => {
  const prob = 'Cho hình chóp S.ABCD. Hình chiếu của S lên mặt đáy là H.';
  const solidIntent = solid({
    flavor: 'pyramid', baseLabels: ['A', 'B', 'C', 'D'], baseVariant: 'square',
    apex: 'S', apexVariant: 'regular',
  });
  const I = [solidIntent, ...flat(prob)];
  const st: any = intentToScene3d(I as any);
  const foot = Object.values(st.objects).find((o: any) => o.kind === 'point3d' && o.label === 'H') as any;
  expect(foot).toBeTruthy();
  const W = (id: string) => constraintToWorld((st.objects[id].attrs as any).constraint, st) as number[];
  const A = W(st.nameToId?.get?.('A') ?? Object.values(st.objects).find((o:any)=>o.label==='A').id);
  // foot lies on plane(A,B,C): use the plane object's frame via its 3 points
  const Bp = Object.values(st.objects).find((o:any)=>o.label==='B') as any;
  const Cp = Object.values(st.objects).find((o:any)=>o.label==='C') as any;
  const Sp = Object.values(st.objects).find((o:any)=>o.label==='S') as any;
  const Hp = foot;
  const wa = A, wb = W(Bp.id), wc = W(Cp.id), ws = W(Sp.id), wh = W(Hp.id);
  const n = cross(sub(wb, wa), sub(wc, wa));
  const dist = Math.abs(sub(wh, wa).reduce((s, v, i) => s + v * n[i], 0)) / (norm(n) || 1);
  expect(dist).toBeLessThan(1e-6);                                  // foot on base plane
  // S→H parallel to normal ⇒ cross(S-H, n) ≈ 0
  expect(norm(cross(sub(ws, wh), n))).toBeLessThan(1e-6);
  // a distance segment S–H exists
  expect(Object.values(st.objects).some((o: any) => o.kind === 'segment3d')).toBe(true);
});
