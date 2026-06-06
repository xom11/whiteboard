import { arcMidpointRule } from '../arcMidpoint';
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

  it('"cung lớn" cũng khớp (nhỏ|lớn optional)', () => {
    const m = run(
      'Cho tam giác ABC nội tiếp đường tròn (O). Gọi P là điểm chính giữa cung lớn BC',
    );
    const c = (m[0].intents[0] as any).constraint;
    expect(c.a).toBe('B');
    expect(c.b).toBe('C');
    expect(c.notContaining).toBe('A');
  });

  it('"đường tròn tâm O" (không ngoặc) cũng resolve circle', () => {
    const m = run(
      'Cho tam giác ABC nội tiếp đường tròn tâm O. Gọi M là điểm chính giữa cung BC không chứa A',
    );
    expect((m[0].intents[0] as any).constraint.circle).toBe('O');
  });

  it('không có đường tròn → escalate (không match)', () => {
    const m = run('Cho tam giác ABC. Gọi M là điểm chính giữa cung BC không chứa A');
    expect(m.length).toBe(0);
  });

  it('không trích được tên điểm → bỏ qua clause', () => {
    // Không có tên dẫn nhập và không có HOA đứng trước cụm.
    const m = run('Cho tam giác ABC nội tiếp (O). Vẽ điểm chính giữa cung BC không chứa A');
    expect(m.length).toBe(0);
  });
});
