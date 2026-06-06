import { perpFootRule } from '../perpFoot';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return perpFootRule.match({ problem, clauses: segmentClauses(problem) });
}

function firstPoint(problem: string) {
  const m = run(problem);
  expect(m.length).toBeGreaterThanOrEqual(1);
  return m[0].intents[0] as any;
}

describe('perpFootRule', () => {
  it('"hình chiếu vuông góc của A trên BC" → perpFoot from A onLine BC', () => {
    const intent = firstPoint('Gọi H là hình chiếu vuông góc của A trên BC');
    expect(intent.op).toBe('add-point');
    expect(intent.name).toBe('H');
    expect(intent.constraint.kind).toBe('perpFoot');
    expect(intent.constraint.from).toBe('A');
    expect(intent.constraint.onLine).toBe('BC');
  });

  it('"hình chiếu của A lên cạnh BC" (bỏ "vuông góc", có tiền tố cạnh)', () => {
    const intent = firstPoint('Gọi H là hình chiếu của A lên cạnh BC');
    expect(intent.constraint.from).toBe('A');
    expect(intent.constraint.onLine).toBe('BC');
  });

  it('"hình chiếu của A xuống đường thẳng BC"', () => {
    const intent = firstPoint('Lấy K là hình chiếu của A xuống đường thẳng BC');
    expect(intent.name).toBe('K');
    expect(intent.constraint.onLine).toBe('BC');
  });

  it('"chân đường vuông góc hạ từ A đến BC"', () => {
    const intent = firstPoint('Gọi H là chân đường vuông góc hạ từ A đến BC');
    expect(intent.constraint.kind).toBe('perpFoot');
    expect(intent.constraint.from).toBe('A');
    expect(intent.constraint.onLine).toBe('BC');
  });

  it('"chân đường vuông góc kẻ từ A xuống BC"', () => {
    const intent = firstPoint('Dựng H là chân đường vuông góc kẻ từ A xuống BC');
    expect(intent.constraint.from).toBe('A');
    expect(intent.constraint.onLine).toBe('BC');
  });

  it('"chân đường cao kẻ từ A xuống cạnh BC"', () => {
    const intent = firstPoint('Gọi H là chân đường cao kẻ từ A xuống cạnh BC');
    expect(intent.constraint.kind).toBe('perpFoot');
    expect(intent.constraint.onLine).toBe('BC');
  });

  it('onLine là tên đường 1 ký tự (giữ nguyên token)', () => {
    const intent = firstPoint('Gọi H là hình chiếu của A trên đường thẳng D');
    expect(intent.constraint.onLine).toBe('D');
  });

  it('claim đúng clause id để coverage tính phủ', () => {
    const problem = 'Cho tam giác ABC. Gọi H là hình chiếu vuông góc của A trên BC';
    const clauses = segmentClauses(problem);
    const m = perpFootRule.match({ problem, clauses });
    expect(m.length).toBe(1);
    // clause chứa "hình chiếu" là clause thứ 2 (id 1)
    const claimed = clauses.find((c) => c.text.includes('hình chiếu'))!;
    expect(m[0].clauseIds).toEqual([claimed.id]);
  });

  it('không trích được tên điểm → bỏ qua (escalate AI)', () => {
    // không có "Gọi/Lấy/... X là" và không có "X là" → extractPointName fail
    const m = run('hình chiếu vuông góc của A trên BC');
    expect(m.length).toBe(0);
  });
});
