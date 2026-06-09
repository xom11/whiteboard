import { describeDeterministicMiss } from '../describeMiss';
import type { CoverageReport } from '../coverage';

// Coverage report giả với danh sách clause chưa phủ cho test.
function coverageWithUncovered(texts: string[]): CoverageReport {
  return {
    complete: false,
    coveredClauseIds: [],
    uncovered: texts.map((text, id) => ({ id, text, hasGeometry: true })),
    ratio: 0,
  };
}

describe('describeDeterministicMiss', () => {
  describe('nhóm "chưa phủ" → gợi ý bổ sung rule', () => {
    it('no-match: báo chưa nhận ra cấu trúc hình học', () => {
      const msg = describeDeterministicMiss({ reason: 'no-match' });
      expect(msg).toContain('chưa nhận ra');
      expect(msg).toContain('bổ sung rule');
    });

    it('incomplete-coverage: liệt kê các cụm chưa dựng được từ coverage.uncovered', () => {
      const msg = describeDeterministicMiss({
        reason: 'incomplete-coverage',
        coverage: coverageWithUncovered([
          'D là chân đường phân giác trong góc A',
          'I là tâm đường tròn bàng tiếp',
        ]),
      });
      expect(msg).toContain('một phần');
      expect(msg).toContain('«D là chân đường phân giác trong góc A»');
      expect(msg).toContain('«I là tâm đường tròn bàng tiếp»');
      expect(msg).toContain('bổ sung rule');
    });

    it('incomplete-coverage không kèm coverage: vẫn ra message hợp lệ (fallback)', () => {
      const msg = describeDeterministicMiss({ reason: 'incomplete-coverage' });
      expect(msg).toContain('một phần');
      expect(msg).toContain('bổ sung rule');
      expect(msg).not.toContain('«'); // không có danh sách rỗng kỳ quặc
    });

    it('named-missing: nêu tên đối tượng, format "D, E" (thêm khoảng trắng sau phẩy)', () => {
      const msg = describeDeterministicMiss({ reason: 'named-missing', detail: 'D,E' });
      expect(msg).toContain('D, E');
      expect(msg).toContain('bổ sung rule');
    });
  });

  describe('nhóm "rule khớp nhưng dựng lỗi" → gợi ý lỗi rule', () => {
    it('transpile-fail: kèm chi tiết lỗi', () => {
      const msg = describeDeterministicMiss({
        reason: 'transpile-fail',
        detail: 'UNRESOLVED_REF:điểm E chưa dựng',
      });
      expect(msg).toContain('biên dịch');
      expect(msg).toContain('lỗi rule');
      expect(msg).toContain('UNRESOLVED_REF:điểm E chưa dựng');
    });

    it('transpile-throw: cùng nhóm biên dịch', () => {
      const msg = describeDeterministicMiss({ reason: 'transpile-throw', detail: 'boom' });
      expect(msg).toContain('biên dịch');
      expect(msg).toContain('boom');
    });

    it('build-throw: báo dựng hình thất bại', () => {
      const msg = describeDeterministicMiss({ reason: 'build-throw', detail: 'KIND_MISMATCH' });
      expect(msg).toContain('dựng hình');
      expect(msg).toContain('lỗi rule');
      expect(msg).toContain('KIND_MISMATCH');
    });

    it('verify-fail: báo sai kiểm tra hình học (không cần detail)', () => {
      const msg = describeDeterministicMiss({ reason: 'verify-fail' });
      expect(msg).toContain('kiểm tra hình học');
      expect(msg).toContain('lỗi rule');
    });

    it('intent-dropped: báo điểm phái sinh bị bỏ', () => {
      const msg = describeDeterministicMiss({ reason: 'intent-dropped', detail: 'M,N' });
      expect(msg).toContain('phái sinh');
      expect(msg).toContain('lỗi rule');
      expect(msg).toContain('M, N');
    });
  });

  it('luôn trả chuỗi không rỗng cho mọi reason', () => {
    const reasons = [
      'no-match',
      'incomplete-coverage',
      'build-throw',
      'transpile-throw',
      'transpile-fail',
      'verify-fail',
      'named-missing',
      'intent-dropped',
    ] as const;
    for (const reason of reasons) {
      expect(describeDeterministicMiss({ reason }).length).toBeGreaterThan(0);
    }
  });
});
