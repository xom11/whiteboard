import { runMatrixCheck } from '../../../../scripts/check-construct-matrix';

// CI guard (Phase 6b, #45): import logic kiểm tra của `npm run check:matrix`
// trực tiếp (không spawn — bền hơn trong jest env). Đỏ nếu DSL kind thiếu entry
// trong manifest hoặc key (intent/tool/rule) lệch tên so với registry thật.
describe('construct capability matrix', () => {
  test('mọi construct đủ layer bắt buộc (check:matrix xanh)', () => {
    expect(runMatrixCheck().errors).toEqual([]);
  });
});
