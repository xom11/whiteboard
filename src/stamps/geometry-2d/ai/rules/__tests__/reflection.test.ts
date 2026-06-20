import { reflectionRule } from '../reflection';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return reflectionRule.match({ problem, clauses: segmentClauses(problem) });
}

describe('reflectionRule', () => {
  it('"D đối xứng H qua BC" → reflectLine (qua đường = cặp đỉnh)', () => {
    const m = run('D đối xứng H qua BC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('add-point');
    expect(intent.name).toBe('D');
    expect(intent.constraint.kind).toBe('reflectLine');
    expect(intent.constraint.of).toBe('H');
    expect(intent.constraint.through).toBe('BC');
  });

  it('"D đối xứng với H qua cạnh BC" → reflectLine', () => {
    const m = run('D đối xứng với H qua cạnh BC');
    const intent = m[0].intents[0] as any;
    expect(intent.constraint.kind).toBe('reflectLine');
    expect(intent.constraint.of).toBe('H');
    expect(intent.constraint.through).toBe('BC');
  });

  it('"Q đối xứng P qua M" → reflectPoint (qua điểm)', () => {
    const m = run('Q đối xứng P qua M');
    const intent = m[0].intents[0] as any;
    expect(intent.name).toBe('Q');
    expect(intent.constraint.kind).toBe('reflectPoint');
    expect(intent.constraint.of).toBe('P');
    expect(intent.constraint.through).toBe('M');
  });

  it('"Q là điểm đối xứng của P qua điểm M" → reflectPoint', () => {
    const m = run('Q là điểm đối xứng của P qua điểm M');
    const intent = m[0].intents[0] as any;
    expect(intent.name).toBe('Q');
    expect(intent.constraint.kind).toBe('reflectPoint');
    expect(intent.constraint.of).toBe('P');
    expect(intent.constraint.through).toBe('M');
  });

  it('"D là điểm đối xứng của H qua đường thẳng d" → reflectLine (through tên đường)', () => {
    const m = run('D là điểm đối xứng của H qua đường thẳng d');
    const intent = m[0].intents[0] as any;
    expect(intent.name).toBe('D');
    expect(intent.constraint.kind).toBe('reflectLine');
    expect(intent.constraint.of).toBe('H');
    expect(intent.constraint.through).toBe('d');
  });

  it('"Gọi K là điểm đối xứng của A qua O" → reflectPoint, tên từ lời dẫn', () => {
    const m = run('Gọi K là điểm đối xứng của A qua O');
    const intent = m[0].intents[0] as any;
    expect(intent.name).toBe('K');
    expect(intent.constraint.kind).toBe('reflectPoint');
    expect(intent.constraint.of).toBe('A');
    expect(intent.constraint.through).toBe('O');
  });

  it('HAI phản xạ trong 1 clause (httcd:26): "P là điểm đối xứng với M qua AB, Q là điểm đối xứng với N qua AB"', () => {
    const m = run('P là điểm đối xứng với M qua AB, Q là điểm đối xứng với N qua AB');
    const byName = Object.fromEntries(m.flatMap((x) => x.intents).map((i: any) => [i.name, i.constraint]));
    expect(byName.P).toEqual({ kind: 'reflectLine', of: 'M', through: 'AB' });
    expect(byName.Q).toEqual({ kind: 'reflectLine', of: 'N', through: 'AB' });
  });

  it('claim đúng clause id để coverage tính phủ', () => {
    const m = run('Cho tam giác ABC. Gọi D là điểm đối xứng của H qua BC');
    expect(m.length).toBe(1);
    // clause "Gọi D ... qua BC" là clause thứ 2 (id 1)
    expect(m[0].clauseIds).toEqual([1]);
    const intent = m[0].intents[0] as any;
    expect(intent.constraint.through).toBe('BC');
  });

  it('không trích đủ tên điểm dẫn → bỏ qua (escalate)', () => {
    // "Lấy điểm đối xứng ..." nhưng không có tên ảnh trong lời dẫn
    const m = run('Vẽ điểm đối xứng của H qua BC');
    expect(m.length).toBe(0);
  });
});

describe('reflection EN (issue #46 group B)', () => {
  it('"D is the reflection of H over BC" → reflectLine of H through BC', () => {
    const m = run('D is the reflection of H over BC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('add-point');
    expect(intent.name).toBe('D');
    expect(intent.constraint.kind).toBe('reflectLine');
    expect(intent.constraint.of).toBe('H');
    expect(intent.constraint.through).toBe('BC');
  });

  it('"Let D be the reflection of H across line BC" → reflectLine of H through BC', () => {
    const m = run('Let D be the reflection of H across line BC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.name).toBe('D');
    expect(intent.constraint.kind).toBe('reflectLine');
    expect(intent.constraint.of).toBe('H');
    expect(intent.constraint.through).toBe('BC');
  });

  it('"Q is the reflection of P over M" → reflectPoint of P through M', () => {
    const m = run('Q is the reflection of P over M');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.name).toBe('Q');
    expect(intent.constraint.kind).toBe('reflectPoint');
    expect(intent.constraint.of).toBe('P');
    expect(intent.constraint.through).toBe('M');
  });

  it('"D is the reflection of H in the line d" → reflectLine through tên đường d', () => {
    const m = run('D is the reflection of H in the line d');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.name).toBe('D');
    expect(intent.constraint.kind).toBe('reflectLine');
    expect(intent.constraint.of).toBe('H');
    expect(intent.constraint.through).toBe('d');
  });

  it('escalate-safe: "D is the reflection of H." (thiếu trục/điểm) → m.length 0', () => {
    const m = run('D is the reflection of H.');
    expect(m.length).toBe(0);
  });

  it('"D là điểm đối xứng với điểm M qua O" → reflectPoint (với + điểm)', () => {
    const c = (run('Gọi D là điểm đối xứng với điểm M qua O')[0].intents[0] as any).constraint;
    expect(c).toEqual({ kind: 'reflectPoint', of: 'M', through: 'O' });
  });

  it('"đối xứng với D qua tâm O" → reflectPoint qua O (không nhầm thành line "t")', () => {
    const c = (run('Gọi E là điểm đối xứng với D qua tâm O')[0].intents[0] as any).constraint;
    expect(c).toEqual({ kind: 'reflectPoint', of: 'D', through: 'O' });
  });
});

describe('reflection — phân phối "P, Q lần lượt đối xứng A qua BE, CF"', () => {
  it('P=reflectLine(A,BE), Q=reflectLine(A,CF)', () => {
    const m = run('P, Q lần lượt đối xứng với A qua BE, CF');
    const byName = Object.fromEntries(m.flatMap((x) => x.intents).map((i: any) => [i.name, i.constraint]));
    expect(byName.P).toEqual({ kind: 'reflectLine', of: 'A', through: 'BE' });
    expect(byName.Q).toEqual({ kind: 'reflectLine', of: 'A', through: 'CF' });
  });
});

describe('reflection — phân phối ĐA NGUỒN "X,Y đối xứng P,Q qua L1,L2"', () => {
  function byName(problem: string) {
    const m = run(problem);
    return Object.fromEntries(m.flatMap((x) => x.intents).map((i: any) => [i.name, i.constraint]));
  }

  it('julielltv:60 — "E,F lần lượt đối xứng với B,C qua CA,AB" → E=refl(B,CA), F=refl(C,AB)', () => {
    const bn = byName('E,F lần lượt đối xứng với B,C qua CA,AB');
    expect(bn.E).toEqual({ kind: 'reflectLine', of: 'B', through: 'CA' });
    expect(bn.F).toEqual({ kind: 'reflectLine', of: 'C', through: 'AB' });
  });

  it('hsg9:306 — "E, F là điểm đối xứng của B, C lần lượt qua AC, AB" (lần lượt SAU nguồn)', () => {
    const bn = byName('Gọi E, F là điểm đối xứng của B, C lần lượt qua AC, AB');
    expect(bn.E).toEqual({ kind: 'reflectLine', of: 'B', through: 'AC' });
    expect(bn.F).toEqual({ kind: 'reflectLine', of: 'C', through: 'AB' });
  });

  it('synonym "tương ứng"', () => {
    const bn = byName('E,F tương ứng đối xứng với B,C qua CA,AB');
    expect(bn.E).toEqual({ kind: 'reflectLine', of: 'B', through: 'CA' });
    expect(bn.F).toEqual({ kind: 'reflectLine', of: 'C', through: 'AB' });
  });

  it('3 phần tử qua điểm: "D,E,F lần lượt đối xứng A,B,C qua M,N,P"', () => {
    const bn = byName('D,E,F lần lượt đối xứng A,B,C qua M,N,P');
    expect(bn.D).toEqual({ kind: 'reflectPoint', of: 'A', through: 'M' });
    expect(bn.E).toEqual({ kind: 'reflectPoint', of: 'B', through: 'N' });
    expect(bn.F).toEqual({ kind: 'reflectPoint', of: 'C', through: 'P' });
  });

  it('lệch số (2 tên, 2 nguồn, 1 trục) → KHÔNG nuốt sang multi (fallback single)', () => {
    // "E,F lần lượt đối xứng B qua CA, AB" = 1 nguồn 2 trục (single DISTRIB), KHÔNG multi.
    const bn = byName('E,F lần lượt đối xứng với B qua CA, AB');
    expect(bn.E).toEqual({ kind: 'reflectLine', of: 'B', through: 'CA' });
    expect(bn.F).toEqual({ kind: 'reflectLine', of: 'B', through: 'AB' });
  });
});
