import { interiorPointRule } from '../interiorPoint';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return interiorPointRule.match({ problem, clauses: segmentClauses(problem) });
}

function firstPoint(problem: string) {
  const m = run(problem);
  expect(m.length).toBeGreaterThan(0);
  const i = m[0].intents[0] as any;
  expect(i.op).toBe('add-point');
  expect(i.constraint.kind).toBe('free');
  return i.name as string;
}

describe('interiorPointRule — phrasing cũ (parity)', () => {
  it('"P là một điểm nằm trong tam giác ABC"', () => {
    expect(firstPoint('Cho tam giác ABC. P là một điểm nằm trong tam giác ABC')).toBe('P');
  });

  it('"và một điểm O nằm trong hình chữ nhật" (tên SAU "điểm")', () => {
    expect(firstPoint('Cho hình chữ nhật ABCD và một điểm O nằm trong hình chữ nhật')).toBe('O');
  });
});

describe('interiorPointRule — "bất kỳ"/"tùy ý" chêm giữa "điểm" và "nằm"', () => {
  it('"Lấy P là một điểm bất kỳ nằm trong tam giác ABC" (son123:62/hinh9:78)', () => {
    expect(
      firstPoint('Cho tam giác ABC. Lấy P là một điểm bất kỳ nằm trong tam giác ABC'),
    ).toBe('P');
  });

  it('"điểm M tùy ý nằm trong tứ giác ABCD"', () => {
    expect(firstPoint('Cho tứ giác ABCD. Lấy điểm M tùy ý nằm trong tứ giác ABCD')).toBe('M');
  });

  it('"bất kì" (biến thể i)', () => {
    expect(firstPoint('Cho tam giác ABC. Lấy điểm P bất kì nằm trong tam giác ABC')).toBe('P');
  });
});

describe('interiorPointRule — KHÔNG nêu đỉnh sau tên hình', () => {
  it('"Gọi P là một điểm nằm trong tam giác" (vao10:172)', () => {
    expect(firstPoint('Cho tam giác ABC. Gọi P là một điểm nằm trong tam giác')).toBe('P');
  });

  it('"điểm M nằm trong tứ giác" (không đỉnh)', () => {
    expect(firstPoint('Cho tứ giác ABCD. Lấy điểm M nằm trong tứ giác')).toBe('M');
  });
});

describe('interiorPointRule — "trong đường tròn"', () => {
  it('"Lấy điểm M nằm trong đường tròn (O)"', () => {
    expect(firstPoint('Cho đường tròn (O). Lấy điểm M nằm trong đường tròn (O)')).toBe('M');
  });

  it('"điểm M bất kỳ trong (O)"', () => {
    expect(firstPoint('Cho đường tròn (O). Lấy điểm M bất kỳ nằm trong (O)')).toBe('M');
  });
});

describe('interiorPointRule — guard: KHÔNG nuốt ngữ cảnh khác', () => {
  it('KHÔNG khớp "góc trong" / "đường trung tuyến trong"', () => {
    expect(run('Cho tam giác ABC có góc trong A bằng 60 độ')).toHaveLength(0);
  });

  it('KHÔNG khớp khi điểm "trên đường tròn"', () => {
    expect(run('Lấy điểm M trên đường tròn (O)')).toHaveLength(0);
  });

  it('KHÔNG khớp "đường thẳng trong mặt phẳng" (không có tên điểm)', () => {
    expect(run('Cho đường thẳng d nằm trong mặt phẳng P')).toHaveLength(0);
  });
});
