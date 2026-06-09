// Test: generateFigureIntent deterministic-only (KHÔNG LLM).
// Đề dễ→trung bình dựng deterministic; miss → deterministic_miss.
import { generateFigureIntent } from '../buildFigureIntent';

describe('generateFigureIntent — deterministic-only', () => {
  it('đề deterministic-hit → ok, provider:"deterministic"', async () => {
    const r = await generateFigureIntent('Cho tam giác ABC. Gọi M là trung điểm BC');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.provider).toBe('deterministic');
  });

  it('đề miss → ok:false reason deterministic_miss (KHÔNG LLM)', async () => {
    // "điểm Fermat" chưa có rule → coverage complete nhưng P thiếu → named-missing
    // → deterministic_miss. (Phrasing ổn định khi thêm rule khác.)
    const r = await generateFigureIntent('Cho tam giác ABC, P là điểm Fermat của tam giác.');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('deterministic_miss');
      expect(r.provider).toBe('deterministic');
      // message dễ hiểu: nêu hướng xử lý (thêm rule / sửa rule), không còn mã
      // kỹ thuật thô "lý do: named-missing".
      expect(r.message).toMatch(/bổ sung rule|lỗi rule/i);
      expect(r.message).not.toContain('lý do:');
    }
  });
});
