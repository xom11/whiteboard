// Test: generateFigureIntent deterministic-only (KHÔNG LLM).
// Đề dễ→trung bình dựng deterministic; miss → deterministic_miss.
import { generateFigureIntent } from '../buildFigureIntent';

describe('generateFigureIntent — deterministic-only', () => {
  it('đề deterministic-hit → ok, provider:"deterministic"', async () => {
    const r = await generateFigureIntent('Cho tam giác ABC. Gọi M là trung điểm BC');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.provider).toBe('deterministic');
  });

  it('đề FULL MISS (không dựng được hình thật nào) → ok:false deterministic_miss (KHÔNG LLM)', async () => {
    // Không construct nào dựng được → không cứu vãn partial → miss toàn bộ.
    const r = await generateFigureIntent('Chứng minh định lý Pytago.');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('deterministic_miss');
      expect(r.provider).toBe('deterministic');
      // message dễ hiểu: nêu hướng xử lý (thêm rule / sửa rule), không còn mã
      // kỹ thuật thô "lý do: ...".
      expect(r.message).toMatch(/bổ sung rule|lỗi rule|chưa nhận ra/i);
      expect(r.message).not.toContain('lý do:');
    }
  });

  it('đề PARTIAL (ABC dựng được, P=điểm Fermat không) → ok:true partial + to-do nêu P', async () => {
    // Trước đây miss toàn bộ; nay render PHẦN chắc chắn đúng (tam giác ABC) +
    // trả to-do cho user tự dựng nốt P. KHÔNG LLM.
    const r = await generateFigureIntent('Cho tam giác ABC, P là điểm Fermat của tam giác.');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.provider).toBe('deterministic-partial');
      expect(r.partial).toBeDefined();
      expect(r.partial?.message).toContain('P');
      expect(r.partial?.message).toContain('tự dựng nốt');
    }
  });
});
