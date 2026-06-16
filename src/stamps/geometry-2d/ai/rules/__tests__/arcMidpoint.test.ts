import { arcMidpointRule } from '../arcMidpoint';
import { midpointRule } from '../midpoint';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return arcMidpointRule.match({ problem, clauses: segmentClauses(problem) });
}

describe('arcMidpointRule', () => {
  it('"điểm chính giữa cung nhỏ BC không chứa A" → arcMidpoint M', () => {
    const m = run(
      'Cho tam giác ABC nội tiếp đường tròn (O). Gọi M là điểm chính giữa cung nhỏ BC không chứa A',
    );
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('add-point');
    expect(intent.name).toBe('M');
    expect(intent.constraint.kind).toBe('arcMidpoint');
    expect(intent.constraint.circle).toBe('O');
    expect(intent.constraint.a).toBe('B');
    expect(intent.constraint.b).toBe('C');
    expect(intent.constraint.notContaining).toBe('A');
  });

  it('"không chứa X" tường minh thắng đỉnh thứ 3 suy ra', () => {
    const m = run(
      'Cho tam giác ABC nội tiếp (O). Gọi N là điểm chính giữa cung AB không chứa C',
    );
    const c = (m[0].intents[0] as any).constraint;
    expect(c.a).toBe('A');
    expect(c.b).toBe('B');
    expect(c.notContaining).toBe('C');
  });

  it('không nêu "không chứa" → suy đỉnh thứ 3 của tam giác', () => {
    const m = run(
      'Cho tam giác ABC nội tiếp đường tròn (O). Gọi M là điểm chính giữa cung BC',
    );
    const c = (m[0].intents[0] as any).constraint;
    expect(c.a).toBe('B');
    expect(c.b).toBe('C');
    expect(c.notContaining).toBe('A');
  });

  it('"trung điểm cung" (biến thể từ vựng) cũng khớp', () => {
    const m = run(
      'Cho tam giác ABC nội tiếp (O). Gọi I là trung điểm cung BC không chứa A',
    );
    expect(m.length).toBe(1);
    const c = (m[0].intents[0] as any).constraint;
    expect((m[0].intents[0] as any).name).toBe('I');
    expect(c.kind).toBe('arcMidpoint');
    expect(c.notContaining).toBe('A');
  });

  it('"cung lớn" → KHÔNG claim (cung đối, defer → escalate)', () => {
    const m = run(
      'Cho tam giác ABC nội tiếp đường tròn (O). Gọi P là điểm chính giữa cung lớn BC',
    );
    expect(m.flatMap((x) => x.intents)).toHaveLength(0);
  });

  it('"đường tròn tâm O" (không ngoặc) cũng resolve circle', () => {
    const m = run(
      'Cho tam giác ABC nội tiếp đường tròn tâm O. Gọi M là điểm chính giữa cung BC không chứa A',
    );
    expect((m[0].intents[0] as any).constraint.circle).toBe('O');
  });

  it('không nêu (O) nhưng có tam giác chứa cung → suy circumcircle ngầm + arcMidpoint', () => {
    const intents = run(
      'Cho tam giác ABC. Gọi M là điểm chính giữa cung BC không chứa A',
    ).flatMap((x) => x.intents) as any[];
    const circ = intents.find((i) => i.op === 'draw-circle' && i.spec === 'through3');
    expect(circ).toBeDefined();
    expect([...circ.points].sort()).toEqual(['A', 'B', 'C']);
    const arc = intents.find((i) => i.op === 'add-point' && i.constraint.kind === 'arcMidpoint');
    expect(arc.name).toBe('M');
    expect(arc.constraint.circle).toBe(circ.name); // arcMidpoint ref circumcircle ngầm
    expect(arc.constraint.a).toBe('B');
    expect(arc.constraint.b).toBe('C');
    expect(arc.constraint.notContaining).toBe('A');
    // circumcircle PHẢI emit trước arcMidpoint (transpile resolve theo thứ tự).
    expect(intents.indexOf(circ)).toBeLessThan(intents.indexOf(arc));
  });

  it('không có (O) VÀ không có tam giác → escalate (không bịa circle)', () => {
    expect(run('Gọi M là điểm chính giữa cung BC không chứa A').length).toBe(0);
  });

  it('không có (O), cung KHÔNG phải 2 đỉnh tam giác → escalate (không suy circumcircle sai)', () => {
    // Tam giác ABC nhưng cung DE (D,E ∉ {A,B,C}) → circumcircle ABC không chứa cung đó.
    const m = run('Cho tam giác ABC. Gọi M là điểm chính giữa cung DE không chứa A');
    expect(m.flatMap((x) => x.intents)).toHaveLength(0);
  });

  it('không trích được tên điểm → bỏ qua clause', () => {
    // Không có tên dẫn nhập và không có HOA đứng trước cụm.
    const m = run('Cho tam giác ABC nội tiếp (O). Vẽ điểm chính giữa cung BC không chứa A');
    expect(m.length).toBe(0);
  });
});

describe('arcMidpointRule — EN (issue #46 group B)', () => {
  it('"Let M be the midpoint of arc BC not containing A" → arcMidpoint M', () => {
    const m = run(
      'Triangle ABC is inscribed in circle (O). Let M be the midpoint of arc BC not containing A.',
    );
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('add-point');
    expect(intent.name).toBe('M');
    expect(intent.constraint.kind).toBe('arcMidpoint');
    expect(intent.constraint.circle).toBe('O');
    expect(intent.constraint.a).toBe('B');
    expect(intent.constraint.b).toBe('C');
    expect(intent.constraint.notContaining).toBe('A');
  });

  it('"M is the midpoint of the arc BC not containing A" (the arc + is) → arcMidpoint M', () => {
    const m = run(
      'Triangle ABC is inscribed in circle (O). M is the midpoint of the arc BC not containing A.',
    );
    expect(m.length).toBe(1);
    const c = (m[0].intents[0] as any).constraint;
    expect((m[0].intents[0] as any).name).toBe('M');
    expect(c.a).toBe('B');
    expect(c.b).toBe('C');
    expect(c.notContaining).toBe('A');
  });

  it('"midpoint of the minor arc BC" (no "not containing") → suy đỉnh thứ 3 của tam giác', () => {
    const m = run(
      'Triangle ABC is inscribed in circle (O). Let M be the midpoint of the minor arc BC.',
    );
    expect(m.length).toBe(1);
    const c = (m[0].intents[0] as any).constraint;
    expect(c.a).toBe('B');
    expect(c.b).toBe('C');
    expect(c.notContaining).toBe('A');
  });

  it('"major arc" → KHÔNG claim (cung đối, defer → escalate)', () => {
    const m = run(
      'Triangle ABC is inscribed in circle (O). Let M be the midpoint of the major arc BC.',
    );
    expect(m.flatMap((x) => x.intents)).toHaveLength(0);
  });

  it('cung AB không chứa C, tên N → a=A,b=B,notContaining=C', () => {
    const m = run(
      'Triangle ABC is inscribed in circle (O). Let N be the midpoint of arc AB not containing C.',
    );
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.name).toBe('N');
    expect(intent.constraint.a).toBe('A');
    expect(intent.constraint.b).toBe('B');
    expect(intent.constraint.notContaining).toBe('C');
  });

  it('EN: không nêu (O) nhưng có "Triangle ABC" → suy circumcircle ngầm', () => {
    const intents = run(
      'Triangle ABC. Let M be the midpoint of arc BC not containing A.',
    ).flatMap((x) => x.intents) as any[];
    const circ = intents.find((i) => i.op === 'draw-circle' && i.spec === 'through3');
    expect(circ).toBeDefined();
    const arc = intents.find((i) => i.constraint?.kind === 'arcMidpoint');
    expect(arc.constraint.circle).toBe(circ.name);
    expect(arc.constraint.notContaining).toBe('A');
  });

  it('fail-safe: không trích được tên (không "X is/be the") → bỏ qua', () => {
    const m = run(
      'Triangle ABC is inscribed in circle (O). Draw the midpoint of arc BC not containing A.',
    );
    expect(m.length).toBe(0);
  });
});

describe('arcMidpointRule — containing (containment dương)', () => {
  it('"trung điểm cung BC chứa A" → containing A', () => {
    const m = run(
      'Cho tam giác ABC nội tiếp (O). Gọi T là trung điểm cung BC chứa A',
    );
    expect(m.length).toBe(1);
    const c = (m[0].intents[0] as any).constraint;
    expect((m[0].intents[0] as any).name).toBe('T');
    expect(c.kind).toBe('arcMidpoint');
    expect(c.a).toBe('B');
    expect(c.b).toBe('C');
    expect(c.containing).toBe('A');
    expect(c.notContaining).toBeUndefined();
  });

  it('EN "midpoint of arc BC containing A" → containing A', () => {
    const m = run(
      'Triangle ABC is inscribed in circle (O). Let T be the midpoint of arc BC containing A.',
    );
    expect(m.length).toBe(1);
    const c = (m[0].intents[0] as any).constraint;
    expect((m[0].intents[0] as any).name).toBe('T');
    expect(c.containing).toBe('A');
    expect(c.notContaining).toBeUndefined();
  });
});

describe('arcMidpointRule — phân phối 2-tên "lần lượt"', () => {
  it('"N, T lần lượt là trung điểm của cung BC không chứa A và chứa A" → N notContaining, T containing', () => {
    const intents = run(
      'Cho tam giác ABC nội tiếp (O). N, T lần lượt là trung điểm của cung BC không chứa A và chứa A',
    ).flatMap((x) => x.intents) as any[];
    const arcs = intents.filter((i) => i.op === 'add-point' && i.constraint.kind === 'arcMidpoint');
    expect(arcs.length).toBe(2);
    const N = arcs.find((i) => i.name === 'N');
    const T = arcs.find((i) => i.name === 'T');
    expect(N.constraint).toMatchObject({ circle: 'O', a: 'B', b: 'C', notContaining: 'A' });
    expect(N.constraint.containing).toBeUndefined();
    expect(T.constraint).toMatchObject({ circle: 'O', a: 'B', b: 'C', containing: 'A' });
    expect(T.constraint.notContaining).toBeUndefined();
  });

  // httcd:237: "N và P lần lượt là điểm chính giữa của cung AM và cung MB" (nửa
  // đường tròn (O); 2 cung nêu riêng nối "và") → N↔AM, P↔MB, không containment.
  it('phân phối 2 CUNG riêng: "N và P … cung AM và cung MB" → N=arc(A,M), P=arc(M,B)', () => {
    const intents = run(
      'Cho nửa đường tròn (O;R) đường kính AB. Điểm M tùy ý trên nửa đường tròn. Gọi N và P lần lượt là điểm chính giữa của cung AM và cung MB.',
    ).flatMap((x) => x.intents) as any[];
    const arcs = intents.filter((i) => i.op === 'add-point' && i.constraint.kind === 'arcMidpoint');
    const N = arcs.find((i) => i.name === 'N');
    const P = arcs.find((i) => i.name === 'P');
    expect(N.constraint).toMatchObject({ circle: 'O', a: 'A', b: 'M' });
    expect(P.constraint).toMatchObject({ circle: 'O', a: 'M', b: 'B' });
  });

  it('phân phối: số tên ≠ số mệnh đề chứa → bỏ qua (escalate fail-safe)', () => {
    const m = run(
      'Cho tam giác ABC nội tiếp (O). M, N, P lần lượt là trung điểm của cung BC không chứa A và chứa A',
    );
    expect(m.flatMap((x) => x.intents)).toHaveLength(0);
  });
});

describe('arcMidpoint EN không collision với midpoint rule', () => {
  it('midpoint rule emit rỗng cho clause "midpoint of arc BC"', () => {
    const problem =
      'Triangle ABC is inscribed in circle (O). Let M be the midpoint of arc BC not containing A.';
    const m = midpointRule.match({ problem, clauses: segmentClauses(problem) });
    expect(m.flatMap((x) => x.intents)).toHaveLength(0);
  });
});
