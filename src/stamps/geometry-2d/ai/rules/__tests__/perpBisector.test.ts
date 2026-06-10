import { perpBisectorRule } from '../perpBisector';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return perpBisectorRule.match({ problem, clauses: segmentClauses(problem) });
}

function first(problem: string) {
  const m = run(problem);
  expect(m.length).toBe(1);
  return m[0].intents[0] as any;
}

describe('perpBisectorRule', () => {
  it('"đường trung trực của BC" → connect B C perpBisector', () => {
    const m = run('Vẽ đường trung trực của BC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('connect');
    expect(intent.from).toBe('B');
    expect(intent.to).toBe('C');
    expect(intent.style).toBe('perpBisector');
    expect(m[0].clauseIds.length).toBe(1);
  });

  it('"trung trực AB" (không "đường", không "của") → connect A B', () => {
    const intent = first('Kẻ trung trực AB');
    expect(intent.from).toBe('A');
    expect(intent.to).toBe('B');
    expect(intent.style).toBe('perpBisector');
  });

  it('"d là đường trung trực BC" → connect B C (tên d bỏ qua)', () => {
    const intent = first('Gọi d là đường trung trực BC');
    expect(intent.from).toBe('B');
    expect(intent.to).toBe('C');
    expect(intent.style).toBe('perpBisector');
  });

  it('"đường trung trực của đoạn thẳng MN" → connect M N', () => {
    const intent = first('Dựng đường trung trực của đoạn thẳng MN');
    expect(intent.from).toBe('M');
    expect(intent.to).toBe('N');
    expect(intent.style).toBe('perpBisector');
  });

  it('"trung trực của cạnh AC" → connect A C', () => {
    const intent = first('Vẽ trung trực của cạnh AC');
    expect(intent.from).toBe('A');
    expect(intent.to).toBe('C');
  });

  it('"trung trực đoạn BD" → connect B D', () => {
    const intent = first('Kẻ trung trực đoạn BD');
    expect(intent.from).toBe('B');
    expect(intent.to).toBe('D');
  });

  it('"trung trực BC và trung trực CA" (1 clause) → emit cả 2', () => {
    const m = run('Vẽ đường trung trực BC và trung trực CA');
    expect(m.length).toBe(2);
    const intents = m.flatMap((x) => x.intents) as any[];
    expect(intents).toHaveLength(2);
    expect(intents.every((i) => i.op === 'connect')).toBe(true);
    expect(intents.every((i) => i.style === 'perpBisector')).toBe(true);
    expect(intents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'B', to: 'C', style: 'perpBisector' }),
        expect.objectContaining({ from: 'C', to: 'A', style: 'perpBisector' }),
      ]),
    );
    // cả 2 match đều claim đúng clause chứa "trung trực"
    for (const match of m) {
      expect(match.clauseIds.length).toBe(1);
    }
  });

  it('3 trung trực trong 1 clause → emit cả 3 (emit-all)', () => {
    const m = run('Dựng trung trực AB, trung trực BC, trung trực CA');
    const intents = m.flatMap((x) => x.intents) as any[];
    expect(intents).toHaveLength(3);
    expect(intents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'A', to: 'B' }),
        expect.objectContaining({ from: 'B', to: 'C' }),
        expect.objectContaining({ from: 'C', to: 'A' }),
      ]),
    );
  });

  it('không có cặp đỉnh → bỏ qua (escalate), không emit intent', () => {
    const m = run('Vẽ đường trung trực của tam giác');
    expect(m.length).toBe(0);
  });

  it('đề không có "trung trực" → không match', () => {
    const m = run('Cho tam giác ABC');
    expect(m.length).toBe(0);
  });

  it('claim đúng clause id chứa cụm trung trực', () => {
    const problem = 'Cho tam giác ABC, vẽ đường trung trực của BC';
    const clauses = segmentClauses(problem);
    const m = perpBisectorRule.match({ problem, clauses });
    expect(m.length).toBe(1);
    const claimed = m[0].clauseIds[0];
    const claimedText = clauses.find((c) => c.id === claimed)!.text;
    expect(claimedText).toMatch(/trung\s*trực/u);
  });
});

describe('perpBisector EN (issue #46 group B)', () => {
  it('"Draw the perpendicular bisector of BC" → connect B C perpBisector', () => {
    const m = run('Draw the perpendicular bisector of BC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('connect');
    expect(intent.from).toBe('B');
    expect(intent.to).toBe('C');
    expect(intent.style).toBe('perpBisector');
  });

  it('"perpendicular bisector of segment AB" → connect A B', () => {
    const intent = first('Draw the perpendicular bisector of segment AB');
    expect(intent.from).toBe('A');
    expect(intent.to).toBe('B');
    expect(intent.style).toBe('perpBisector');
  });

  it('"perpendicular bisector of side AC" → connect A C', () => {
    const intent = first('Draw the perpendicular bisector of side AC');
    expect(intent.from).toBe('A');
    expect(intent.to).toBe('C');
    expect(intent.style).toBe('perpBisector');
  });

  it('"perpendicular bisector BC and perpendicular bisector CA" (1 clause) → emit cả 2', () => {
    const m = run('Draw the perpendicular bisector BC and perpendicular bisector CA');
    const intents = m.flatMap((x) => x.intents) as any[];
    expect(intents).toHaveLength(2);
    expect(intents.every((i) => i.op === 'connect')).toBe(true);
    expect(intents.every((i) => i.style === 'perpBisector')).toBe(true);
    expect(intents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'B', to: 'C', style: 'perpBisector' }),
        expect.objectContaining({ from: 'C', to: 'A', style: 'perpBisector' }),
      ]),
    );
  });

  it('escalate-safe: "perpendicular bisector of the triangle" → không cặp đỉnh, m.length 0', () => {
    const m = run('Draw the perpendicular bisector of the triangle');
    expect(m.length).toBe(0);
  });
});

describe('perpBisectorRule — trung trực ∩ đường (giao điểm)', () => {
  function intentsOf(problem: string): any[] {
    return run(problem).flatMap((m) => m.intents);
  }

  it('"trung trực của BC cắt AB tại D" → connect perpBisector(B,C) + intersection D of [pb_BC, AB]', () => {
    const all = intentsOf('Cho tam giác ABC. Đường trung trực của BC cắt AB tại D.');
    const pb = all.find((i) => i.op === 'connect' && i.style === 'perpBisector');
    expect(pb).toBeDefined();
    expect([pb.from, pb.to].sort()).toEqual(['B', 'C']);
    const inter = all.find((i) => i.op === 'add-point' && i.constraint.kind === 'intersection');
    expect(inter.name).toBe('D');
    expect(inter.constraint.of).toEqual(['pb_BC', 'AB']);
    // perpBisector connect PHẢI đứng trước intersection (transpile resolve theo thứ tự).
    expect(all.indexOf(pb)).toBeLessThan(all.indexOf(inter));
  });

  it('"trung trực BC cắt AC tại E" → intersection E of [pb_BC, AC]', () => {
    const all = intentsOf('Cho tam giác ABC. Trung trực BC cắt AC tại E.');
    const inter = all.find((i) => i.op === 'add-point' && i.constraint.kind === 'intersection');
    expect(inter.name).toBe('E');
    expect(inter.constraint.of).toEqual(['pb_BC', 'AC']);
  });

  it('degenerate: giao điểm trùng đỉnh ("tại B") → KHÔNG emit intersection (chỉ perpBisector)', () => {
    const all = intentsOf('Cho tam giác ABC. Trung trực BC cắt AB tại B.');
    expect(all.some((i) => i.op === 'add-point' && i.constraint.kind === 'intersection')).toBe(false);
  });

  it('"trung trực BC" trơ (không "cắt … tại") vẫn chỉ perpBisector, không intersection', () => {
    const all = intentsOf('Cho tam giác ABC. Vẽ trung trực BC.');
    expect(all.some((i) => i.op === 'add-point')).toBe(false);
    expect(all.some((i) => i.op === 'connect' && i.style === 'perpBisector')).toBe(true);
  });
});

describe('perpBisector — phân phối "trung trực CA, AB cắt PA tại E, F"', () => {
  it('E=giao(pb_CA,PA), F=giao(pb_AB,PA)', () => {
    const { perpBisectorRule } = require('../perpBisector');
    const { segmentClauses } = require('../../deterministic/coverage');
    const it = perpBisectorRule.match({ problem: 'Trung trực của CA, AB cắt PA tại E, F', clauses: segmentClauses('Trung trực của CA, AB cắt PA tại E, F') }).flatMap((m: any) => m.intents);
    expect(it.find((i: any) => i.name === 'E').constraint).toEqual({ kind: 'intersection', of: ['pb_CA', 'PA'] });
    expect(it.find((i: any) => i.name === 'F').constraint).toEqual({ kind: 'intersection', of: ['pb_AB', 'PA'] });
  });
});
