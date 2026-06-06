import { tryDeterministicFigure } from '../tryDeterministicFigure';

// Các đề dễ→trung bình: PHẢI dựng deterministic (qua hết 4 lớp gate), không cần AI.
const RENDERABLE: string[] = [
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
];

// Các đề trung-bình-khó cần điểm phái sinh chưa có rule → PHẢI escalate (an toàn),
// KHÔNG được dùng hình thiếu điểm.
const ESCALATE: { problem: string; reason: string }[] = [
  { problem: 'Cho tam giác ABC. Đường trung trực của BC cắt AB tại D', reason: 'named-missing' },
  { problem: 'Cho tam giác ABC. Trên cạnh AB lấy điểm D sao cho AD = 2DB', reason: 'named-missing' },
  { problem: 'Chứng minh định lý Pytago', reason: 'no-match' },
];

describe('tryDeterministicFigure — render deterministic (không cần AI)', () => {
  it.each(RENDERABLE)('dựng được: %s', (problem) => {
    const r = tryDeterministicFigure(problem);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.figure.transpile.ok).toBe(true);
      expect(r.figure.verify.ok).toBe(true);
      expect(r.figure.intents.length).toBeGreaterThan(0);
    }
  });
});

describe('tryDeterministicFigure — escalate an toàn', () => {
  it.each(ESCALATE)('escalate ($reason): $problem', ({ problem, reason }) => {
    const r = tryDeterministicFigure(problem);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe(reason);
  });
});
